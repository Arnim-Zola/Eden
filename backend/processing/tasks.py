from celery import shared_task
from core_app.models import AnalysisJob, AnalysisJobStatus, MediaAsset, MediaAssetType
from processing.services import FrameExtractionService, FrameExtractionException

@shared_task(bind=True, max_retries=3)
def extract_video_frames(self, job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
    except AnalysisJob.DoesNotExist:
        return
        
    try:
        video_asset = job.media_assets.filter(asset_type=MediaAssetType.VIDEO).first()
        if not video_asset:
            image_asset = job.media_assets.filter(asset_type=MediaAssetType.IMAGE).first()
            if image_asset:
                job.processing_phase = "Image post detected. Skipping frame extraction."
                job.save(update_fields=['processing_phase'])
                return {"status": "success", "extracted_count": 0, "message": "Image post bypass"}
            raise FrameExtractionException("No media asset found for this job.")
            
        job.processing_phase = "Extracting frames and generating thumbnails..."
        job.save(update_fields=['processing_phase'])
        
        service = FrameExtractionService(job_id)
        result = service.extract_frames(video_asset.file_path)
        
        # Create MediaAsset record for the directory/manifest
        MediaAsset.objects.create(
            job=job,
            asset_type=MediaAssetType.FRAME_DIRECTORY,
            file_path=result['manifest_path'],
            processing_status='FRAMES_EXTRACTED',
            metadata=result['manifest_data']
        )
        
        job.processing_phase = f"Extracted {result['extracted_count']} frames successfully."
        job.save(update_fields=['processing_phase'])
        
        return {"status": "success", "extracted_count": result['extracted_count']}
        
    except FrameExtractionException as e:
        job.status = AnalysisJobStatus.FAILED
        job.error_message = str(e)
        job.processing_phase = "Frame extraction failed."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])
        return {"status": "failed", "error": str(e)}
        
    except Exception as e:
        job.status = AnalysisJobStatus.FAILED
        job.error_message = f"Unexpected error during frame extraction: {str(e)}"
        job.processing_phase = "Frame extraction failed due to unexpected error."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])
        return {"status": "failed", "error": str(e)}

from processing.services import OcrExtractionService, OcrExtractionException

@shared_task(bind=True, max_retries=3)
def extract_ocr_text(self, job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
    except AnalysisJob.DoesNotExist:
        return
        
    try:
        # Try to find a FRAME_DIRECTORY or IMAGE asset
        asset = job.media_assets.filter(asset_type__in=[MediaAssetType.FRAME_DIRECTORY, MediaAssetType.IMAGE]).first()
        if not asset:
            raise OcrExtractionException("No suitable media asset found for OCR extraction.")
            
        job.processing_phase = "Running OCR text extraction..."
        job.save(update_fields=['processing_phase'])
        
        service = OcrExtractionService(job_id)
        
        if asset.asset_type == MediaAssetType.FRAME_DIRECTORY:
            # Asset metadata contains the frame manifest
            result = service.extract_from_manifest(asset.metadata)
        else:
            # Single image asset
            blocks = service.extract_from_image(asset.file_path)
            text = " ".join([b['text'] for b in blocks])
            result = {
                "job_id": job_id,
                "unified_transcript": text,
                "frames_ocr": [{
                    "index": 0,
                    "timestamp_seconds": 0,
                    "blocks": blocks
                }]
            }
            
        # Create an OCR_RESULTS MediaAsset to store the output
        # The unified_transcript will be placed in the metadata field so downstream pipelines can easily access it
        MediaAsset.objects.create(
            job=job,
            asset_type='OCR_RESULTS', # Normally we'd use a dedicated enum, but 'OCR_RESULTS' works for MVP
            file_path='', # Not a physical file
            processing_status='OCR_COMPLETED',
            metadata=result
        )
        
        job.processing_phase = "OCR extraction completed successfully."
        job.save(update_fields=['processing_phase'])
        
        return {"status": "success", "ocr_text_length": len(result['unified_transcript'])}
        
    except OcrExtractionException as e:
        job.status = AnalysisJobStatus.FAILED
        job.error_message = str(e)
        job.processing_phase = "OCR extraction failed."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])
        return {"status": "failed", "error": str(e)}
        
    except Exception as e:
        job.status = AnalysisJobStatus.FAILED
        job.error_message = f"Unexpected error during OCR: {str(e)}"
        job.processing_phase = "OCR extraction failed due to unexpected error."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])
        return {"status": "failed", "error": str(e)}

from processing.services import AudioExtractionService, AudioExtractionException
import os

@shared_task(bind=True, max_retries=3)
def extract_audio_transcription(self, job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
    except AnalysisJob.DoesNotExist:
        return
        
    try:
        video_asset = job.media_assets.filter(asset_type=MediaAssetType.VIDEO).first()
        if not video_asset:
            image_asset = job.media_assets.filter(asset_type=MediaAssetType.IMAGE).first()
            if image_asset:
                job.processing_phase = "Image post detected. Skipping audio transcription."
                job.save(update_fields=['processing_phase'])
                # Create empty transcript for downstream processing
                MediaAsset.objects.create(
                    job=job,
                    asset_type='TRANSCRIPT_RESULTS',
                    file_path='',
                    processing_status='TRANSCRIPTION_COMPLETED',
                    metadata={
                        "job_id": job_id, 
                        "unified_transcript": "", 
                        "segments": [],
                        "audio_detected": False,
                        "speech_detected": False
                    }
                )
                return {"status": "success", "message": "Image post bypass"}
            raise AudioExtractionException("No media asset found for this job.")
            
        job.processing_phase = "Extracting audio track..."
        job.save(update_fields=['processing_phase'])
        
        service = AudioExtractionService(job_id)
        audio_path = service.extract_audio(video_asset.file_path)
        
        if audio_path is None:
            # Silent video bypass
            transcript_data = {
                "job_id": job_id,
                "unified_transcript": "",
                "segments": [],
                "audio_detected": False,
                "speech_detected": False
            }
            job.processing_phase = "No audio stream found. Skipping transcription."
            job.save(update_fields=['processing_phase'])
        else:
            job.processing_phase = "Transcribing audio with Whisper..."
            job.save(update_fields=['processing_phase'])
            
            print(f"!!! Starting Whisper transcription for job {job_id} !!!")
            transcript_data = service.transcribe_audio(audio_path)
            
            transcript = transcript_data.get('unified_transcript', '')
            print(f"!!! Whisper transcription completed! Length: {len(transcript)} characters !!!")
            print(f"!!! Transcript preview: {transcript[:100]}... !!!")
            
            transcript_data['audio_detected'] = True
            transcript_data['speech_detected'] = len(transcript) > 0
            
            # Clean up the temporary wav file
            if os.path.exists(audio_path):
                os.remove(audio_path)
        
        # Create a TRANSCRIPT_RESULTS MediaAsset to store the output
        MediaAsset.objects.create(
            job=job,
            asset_type='TRANSCRIPT_RESULTS', 
            file_path='', # Not a physical file
            processing_status='TRANSCRIPTION_COMPLETED',
            metadata=transcript_data
        )
        
        job.processing_phase = "Audio transcription completed successfully."
        job.save(update_fields=['processing_phase'])
        
        return {
            "status": "success", 
            "audio_detected": transcript_data['audio_detected'],
            "speech_detected": transcript_data['speech_detected'],
            "transcript_length": len(transcript_data['unified_transcript'])
        }
        
    except AudioExtractionException as e:
        job.status = AnalysisJobStatus.FAILED
        job.error_message = str(e)
        job.processing_phase = "Audio transcription failed."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])
        return {"status": "failed", "error": str(e)}
        
    except Exception as e:
        job.status = AnalysisJobStatus.FAILED
        job.error_message = f"Unexpected error during audio transcription: {str(e)}"
        job.processing_phase = "Audio transcription failed due to unexpected error."
        job.save(update_fields=['status', 'error_message', 'processing_phase'])
        return {"status": "failed", "error": str(e)}
