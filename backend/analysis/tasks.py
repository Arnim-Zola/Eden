import logging
from celery import shared_task
from django.db import transaction
from core_app.models import AnalysisJob, AnalysisJobStatus, AnalysisReport, ClaimRecord

from .services import GeminiAnalysisService

logger = logging.getLogger(__name__)

@shared_task
def analyze_job_content(job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
        job.status = AnalysisJobStatus.ANALYZING
        job.processing_phase = 'Analyzing extracted content with Gemini'
        job.save()

        # Aggregate OCR and Transcript texts
        ocr_text = ""
        transcript_text = ""

        ocr_asset = job.media_assets.filter(asset_type='OCR_RESULTS').first()
        if ocr_asset and ocr_asset.metadata:
            ocr_text = ocr_asset.metadata.get('unified_transcript', '')

        transcript_asset = job.media_assets.filter(asset_type='TRANSCRIPT_RESULTS').first()
        if transcript_asset and transcript_asset.metadata:
            transcript_text = transcript_asset.metadata.get('unified_transcript', '')

        if not ocr_text and not transcript_text:
            job.status = AnalysisJobStatus.FAILED
            job.error_message = "No OCR or Transcript content found to analyze."
            job.save()
            return

        job.status = AnalysisJobStatus.GENERATING_REPORT
        job.processing_phase = 'Generating report structure'
        job.save()

        service = GeminiAnalysisService()
        report_data = service.analyze_content(ocr_text=ocr_text, transcript_text=transcript_text)

        with transaction.atomic():
            # Create Report
            report = AnalysisReport.objects.create(report_data=report_data)
            job.report = report
            
            # Create Claims
            claims_data = report_data.get('claims', [])
            for claim_data in claims_data:
                # Basic validation / normalization
                label = claim_data.get('classification_label', 'UNVERIFIED')
                source = claim_data.get('detection_source', 'TRANSCRIPT')
                
                # fallback for invalid labels
                valid_labels = [c[0] for c in ClaimRecord._meta.get_field('classification_label').choices]
                if label not in valid_labels:
                    label = 'UNVERIFIED'
                    
                valid_sources = [c[0] for c in ClaimRecord._meta.get_field('detection_source').choices]
                if source not in valid_sources:
                    source = 'TRANSCRIPT'
                
                ClaimRecord.objects.create(
                    job=job,
                    claim_text=claim_data.get('claim_text', 'Unknown Claim'),
                    detection_source=source,
                    classification_label=label,
                    confidence_score=claim_data.get('confidence_score', 0.0),
                    contextual_reasoning=claim_data.get('contextual_reasoning', 'No reasoning provided.')
                )

            job.status = AnalysisJobStatus.COMPLETED
            job.processing_phase = 'Analysis complete'
            job.save()

        return report.id

    except Exception as e:
        logger.error(f"Analysis failed for job {job_id}: {e}")
        try:
            job = AnalysisJob.objects.get(id=job_id)
            job.status = AnalysisJobStatus.FAILED
            job.error_message = str(e)
            job.save()
        except:
            pass
        raise
