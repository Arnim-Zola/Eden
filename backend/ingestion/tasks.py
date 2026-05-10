from celery import shared_task
from core_app.models import AnalysisJob, AnalysisJobStatus, MediaAsset, MediaAssetType
from ingestion.services import InstagramIngestionService, InstagramIngestionException


@shared_task(bind=True, max_retries=3)
def ingest_instagram_media(self, job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
    except AnalysisJob.DoesNotExist:
        return

    # ── Upload passthrough guard ──────────────────────────────────────────────
    # Upload jobs already have their file on disk; skip yt-dlp entirely.
    if job.ingestion_source == 'UPLOAD':
        job.status = AnalysisJobStatus.PROCESSING
        job.processing_phase = "Local file received. Preparing for processing..."
        job.save(update_fields=['status', 'processing_phase'])
        return {"status": "upload_passthrough"}
    # ─────────────────────────────────────────────────────────────────────────

    # Map DB analysis_type to the service's mode string
    mode = 'audio' if job.analysis_type == 'AUDIO' else 'text'

    job.status = AnalysisJobStatus.DOWNLOADING
    job.processing_phase = (
        f"Downloading media from Instagram ({mode.upper()} mode)…"
    )
    job.save(update_fields=['status', 'processing_phase'])

    try:
        service = InstagramIngestionService(job_id)
        result = service.download_media(job.instagram_url, mode=mode)

        # ── Mode-mismatch guard ───────────────────────────────────────────────
        # AUDIO mode selected but only an image was downloaded → fail fast and
        # terminate the Celery chain so no downstream tasks run.
        if job.analysis_type == 'AUDIO' and result.get('is_image'):
            job.status = AnalysisJobStatus.FAILED
            job.error_message = (
                "MODE_MISMATCH: AUDIO mode was selected but this post contains only images. "
                "Switch to TEXT mode to analyze image-based content."
            )
            job.processing_phase = "Ingestion failed: image post cannot be analyzed in AUDIO mode."
            job.save(update_fields=['status', 'error_message', 'processing_phase'])
            # Terminate the Celery chain — no downstream tasks should run
            self.request.callbacks = None
            self.request.errbacks = None
            self.request.chain = None
            return {"status": "mode_mismatch"}
        # ─────────────────────────────────────────────────────────────────────

        # Determine MediaAsset type from the download result
        if result.get('is_audio'):
            asset_type = MediaAssetType.AUDIO
        elif result.get('is_video'):
            asset_type = MediaAssetType.VIDEO
        else:
            asset_type = MediaAssetType.IMAGE

        MediaAsset.objects.create(
            job=job,
            asset_type=asset_type,
            file_path=result['local_path'],
            file_size=result['file_size'],
            metadata=result['metadata'],
            processing_status='DOWNLOADED',
        )

        job.status = AnalysisJobStatus.PROCESSING
        job.processing_phase = "Media downloaded. Preparing for processing…"
        job.save(update_fields=['status', 'processing_phase'])

        return {
            "status": "success",
            "asset_type": asset_type,
            "path": result['local_path'],
        }

    except InstagramIngestionException as e:
        if self.request.retries < self.max_retries:
            job.processing_phase = (
                f"Ingestion attempt {self.request.retries + 1} failed. Retrying…"
            )
            job.save(update_fields=['processing_phase'])
            raise self.retry(exc=e, countdown=5)

        job.status = AnalysisJobStatus.FAILED
        job.error_message = "Instagram media could not be retrieved: " + str(e)
        job.processing_phase = "Ingestion failed permanently."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])

        # Terminate the Celery chain
        self.request.callbacks = None
        self.request.errbacks = None
        self.request.chain = None
        return {"status": "failed", "error": str(e)}

    except Exception as e:
        job.status = AnalysisJobStatus.FAILED
        job.error_message = f"Unexpected error during ingestion: {str(e)}"
        job.processing_phase = "Ingestion failed due to unexpected error."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])

        # Terminate the Celery chain
        self.request.callbacks = None
        self.request.errbacks = None
        self.request.chain = None
        return {"status": "failed", "error": str(e)}
