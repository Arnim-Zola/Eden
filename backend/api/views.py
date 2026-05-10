from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from celery import chain
from django.conf import settings
from pathlib import Path
import os

from core_app.models import AnalysisJob, AnalysisReport, ClaimRecord, MediaAsset, MediaAssetType
from .serializers import AnalysisJobSerializer, CreateAnalysisJobSerializer, AnalysisReportSerializer, ClaimRecordSerializer
from ingestion.tasks import ingest_instagram_media
from processing.tasks import extract_ocr_text, extract_audio_transcription
from analysis.tasks import analyze_job_content


def _build_pipeline(job_id: int, analysis_mode: str) -> list:
    """
    Return the ordered list of Celery task signatures for the given mode.

    TEXT  → ingest → extract_ocr_text (absorbs frame extraction) → analyze
    AUDIO → ingest → extract_audio_transcription                  → analyze
    """
    base = [ingest_instagram_media.si(job_id)]

    if analysis_mode == 'audio':
        base.append(extract_audio_transcription.si(job_id))
    else:
        # TEXT mode (default)
        base.append(extract_ocr_text.si(job_id))

    base.append(analyze_job_content.si(job_id))
    return base


class AnalysisJobViewSet(viewsets.ModelViewSet):
    queryset = AnalysisJob.objects.all().order_by('-created_at')
    serializer_class = AnalysisJobSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateAnalysisJobSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        instagram_url  = serializer.validated_data['instagram_url']
        analysis_mode  = serializer.validated_data.get('analysis_mode', 'text')

        mode_mapping   = {'text': 'TEXT', 'audio': 'AUDIO'}
        analysis_type  = mode_mapping.get(analysis_mode, 'TEXT')

        try:
            job = AnalysisJob.objects.create(
                instagram_url=instagram_url,
                analysis_type=analysis_type,
            )
            chain(*_build_pipeline(job.id, analysis_mode)).apply_async()
            return Response(AnalysisJobSerializer(job).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        job = self.get_object()
        return Response({
            'id': job.id,
            'status': job.status,
            'processing_phase': job.processing_phase,
            'error_message': job.error_message,
        })


# ── Local Upload Endpoint ──────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}


class UploadView(APIView):
    """
    POST /api/upload/   multipart/form-data
    Fields:
      file          — video file (.mp4/.mov/.avi/.mkv/.webm)
      analysis_mode — text | audio   (default: text)

    Creates an AnalysisJob with ingestion_source=UPLOAD, saves the file to
    media/{job_id}/source_media{ext}, creates a MediaAsset record, and fires
    the mode-selective processing pipeline chain.
    """

    def post(self, request, *args, **kwargs):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        ext = Path(uploaded.name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {'error': f'Unsupported file type {ext!r}. Allowed: {sorted(ALLOWED_EXTENSIONS)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_bytes = getattr(settings, 'UPLOAD_MAX_FILE_SIZE_BYTES', 500 * 1024 * 1024)
        if uploaded.size > max_bytes:
            return Response(
                {'error': f'File too large ({uploaded.size // 1024 // 1024} MB). Max is {max_bytes // 1024 // 1024} MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        analysis_mode = request.data.get('analysis_mode', 'text')
        mode_mapping  = {'text': 'TEXT', 'audio': 'AUDIO'}
        analysis_type = mode_mapping.get(analysis_mode, 'TEXT')

        try:
            job = AnalysisJob.objects.create(
                instagram_url=None,
                original_filename=uploaded.name,
                ingestion_source='UPLOAD',
                analysis_type=analysis_type,
            )

            job_dir   = Path(settings.MEDIA_ROOT) / str(job.id)
            job_dir.mkdir(parents=True, exist_ok=True)
            file_name = f'source_media{ext}'
            file_path = job_dir / file_name

            with open(file_path, 'wb') as f:
                for chunk in uploaded.chunks():
                    f.write(chunk)

            MediaAsset.objects.create(
                job=job,
                asset_type=MediaAssetType.VIDEO,
                file_path=str(file_path),
                file_size=file_path.stat().st_size,
                metadata={'page_title': uploaded.name, 'source_url': 'local_upload'},
                processing_status='UPLOADED',
            )

            # ingest task is a passthrough for UPLOAD jobs; pipeline is still mode-selective
            chain(*_build_pipeline(job.id, analysis_mode)).apply_async()

            return Response(AnalysisJobSerializer(job).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
