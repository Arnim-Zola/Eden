from celery import shared_task
from core_app.models import AnalysisJob, AnalysisJobStatus, MediaAsset, MediaAssetType
from ingestion.services import InstagramIngestionService, InstagramIngestionException

@shared_task(bind=True, max_retries=3)
def ingest_instagram_media(self, job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
    except AnalysisJob.DoesNotExist:
        return
        
    job.status = AnalysisJobStatus.DOWNLOADING
    job.processing_phase = "Downloading media from Instagram..."
    job.save(update_fields=['status', 'processing_phase'])
    
    try:
        service = InstagramIngestionService(job_id)
        result = service.download_media(job.instagram_url)
        
        # Create MediaAsset record
        asset_type = MediaAssetType.VIDEO if result['is_video'] else MediaAssetType.IMAGE
        MediaAsset.objects.create(
            job=job,
            asset_type=asset_type,
            file_path=result['local_path'],
            file_size=result['file_size'],
            metadata=result['metadata'],
            processing_status='DOWNLOADED'
        )
        
        job.status = AnalysisJobStatus.PROCESSING
        job.processing_phase = "Media downloaded. Preparing for processing..."
        job.save(update_fields=['status', 'processing_phase'])
        
        return {"status": "success", "asset_type": asset_type, "path": result['local_path']}
        
    except InstagramIngestionException as e:
        if self.request.retries < self.max_retries:
            job.processing_phase = f"Ingestion attempt {self.request.retries + 1} failed. Retrying..."
            job.save(update_fields=['processing_phase'])
            raise self.retry(exc=e, countdown=5)
            
        job.status = AnalysisJobStatus.FAILED
        job.error_message = "Instagram media could not be retrieved: " + str(e)
        job.processing_phase = "Ingestion failed permanently."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])
        
        # Terminate the Celery chain to prevent downstream tasks from running
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
