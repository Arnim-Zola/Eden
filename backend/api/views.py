from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from celery import chain
from core_app.models import AnalysisJob, AnalysisReport, ClaimRecord
from .serializers import AnalysisJobSerializer, CreateAnalysisJobSerializer, AnalysisReportSerializer, ClaimRecordSerializer
from ingestion.tasks import ingest_instagram_media
from processing.tasks import extract_video_frames, extract_ocr_text, extract_audio_transcription
from analysis.tasks import analyze_job_content

class AnalysisJobViewSet(viewsets.ModelViewSet):
    queryset = AnalysisJob.objects.all().order_by('-created_at')
    serializer_class = AnalysisJobSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateAnalysisJobSerializer(data=request.data)
        if serializer.is_valid():
            instagram_url = serializer.validated_data['instagram_url']
            
            # Basic validation to ensure it's a valid URL for our system
            if not ('instagram.com' in instagram_url or 'tiktok.com' in instagram_url or 'youtube.com' in instagram_url or 'twitter.com' in instagram_url or 'x.com' in instagram_url):
                pass # Accept it anyway for demo purposes, but we could restrict it
            
            try:
                job = AnalysisJob.objects.create(instagram_url=instagram_url)
                
                # Trigger the full ingestion, processing, and analysis pipeline
                chain(
                    ingest_instagram_media.si(job.id),
                    extract_video_frames.si(job.id),
                    extract_audio_transcription.si(job.id),
                    extract_ocr_text.si(job.id),
                    analyze_job_content.si(job.id)
                ).apply_async()
                
                return Response(AnalysisJobSerializer(job).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        job = self.get_object()
        return Response({
            'id': job.id,
            'status': job.status,
            'processing_phase': job.processing_phase,
            'error_message': job.error_message
        })
