"""
processing/tasks.py — Mode-aware Celery tasks.

TEXT pipeline:  ingest → extract_ocr_text (absorbs frame extraction internally) → analyze
AUDIO pipeline: ingest → extract_audio_transcription → analyze

Each task starts with a mode guard and self-short-circuits if called in the wrong context.
"""
from celery import shared_task
from pathlib import Path
from django.conf import settings
from core_app.models import AnalysisJob, AnalysisJobStatus, MediaAsset, MediaAssetType
from processing.services import (
    FrameExtractionService, FrameExtractionException,
    OcrExtractionService, OcrExtractionException,
    AudioExtractionService, AudioExtractionException,
)
from ingestion.cache import MediaCache
import os
import json


# ── Shared helper ─────────────────────────────────────────────────────────────

def _get_cache(job):
    """Return a MediaCache for URL jobs when caching is enabled, else None."""
    if job.ingestion_source == 'UPLOAD':
        return None
    if not getattr(settings, 'MEDIA_CACHE_ENABLED', True):
        return None
    return MediaCache(
        Path(settings.MEDIA_ROOT) / 'cache',
        ttl_days=getattr(settings, 'MEDIA_CACHE_TTL_DAYS', 0),
    )


# ── TEXT pipeline: OCR (absorbs frame extraction for video assets) ─────────────

@shared_task(bind=True, max_retries=3)
def extract_ocr_text(self, job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
    except AnalysisJob.DoesNotExist:
        return

    # ── Mode guard ────────────────────────────────────────────────────────────
    if job.analysis_type == 'AUDIO':
        job.processing_phase = "OCR skipped — not required in AUDIO mode."
        job.save(update_fields=['processing_phase'])
        return {"status": "skipped", "reason": "audio_mode"}
    # ─────────────────────────────────────────────────────────────────────────

    try:
        # Accept VIDEO, IMAGE, or existing FRAME_DIRECTORY assets
        asset = job.media_assets.filter(
            asset_type__in=[
                MediaAssetType.VIDEO,
                MediaAssetType.IMAGE,
                MediaAssetType.FRAME_DIRECTORY,
            ]
        ).first()

        if not asset:
            raise OcrExtractionException("No suitable media asset found for OCR.")

        job.processing_phase = "Running OCR text extraction…"
        job.save(update_fields=['processing_phase'])

        cache = _get_cache(job)

        # ── OCR cache read ────────────────────────────────────────────────────
        if cache and job.instagram_url:
            cached_ocr = cache.get_artifact(job.instagram_url, 'ocr')
            if cached_ocr:
                result = json.loads(cached_ocr.read_text())
                MediaAsset.objects.create(
                    job=job, asset_type='OCR_RESULTS', file_path='',
                    processing_status='OCR_COMPLETED', metadata=result,
                )
                job.processing_phase = "OCR extraction completed (cache hit)."
                job.save(update_fields=['processing_phase'])
                print(f"!!! OCR CACHE HIT for job {job_id} !!!")
                return {
                    "status": "success",
                    "cache_hit": True,
                    "ocr_text_length": len(result.get('unified_transcript', '')),
                }
        # ─────────────────────────────────────────────────────────────────────

        service = OcrExtractionService(job_id)

        # ── Route by asset type ───────────────────────────────────────────────
        if asset.asset_type == MediaAssetType.VIDEO:
            # Internally extract frames then OCR — no separate task in the chain
            job.processing_phase = "Extracting frames for OCR analysis…"
            job.save(update_fields=['processing_phase'])

            # Frames cache read
            frame_manifest_data = None
            if cache and job.instagram_url:
                cached_frames = cache.get_artifact(job.instagram_url, 'frames')
                if cached_frames and (cached_frames / 'manifest.json').exists():
                    frame_manifest_data = json.loads(
                        (cached_frames / 'manifest.json').read_text()
                    )
                    print(f"!!! FRAMES CACHE HIT for job {job_id} !!!")

            if frame_manifest_data is None:
                frame_service = FrameExtractionService(job_id)
                frame_result = frame_service.extract_frames(asset.file_path)
                frame_manifest_data = frame_result['manifest_data']

                # Store frame manifest as asset
                MediaAsset.objects.create(
                    job=job,
                    asset_type=MediaAssetType.FRAME_DIRECTORY,
                    file_path=frame_result['manifest_path'],
                    processing_status='FRAMES_EXTRACTED',
                    metadata=frame_manifest_data,
                )

                # Frames cache write
                if cache and job.instagram_url:
                    try:
                        frames_dir = Path(frame_result['manifest_path']).parent
                        cache.store_artifact(job.instagram_url, 'frames', frames_dir)
                        print(f"!!! FRAMES CACHE STORE for job {job_id} !!!")
                    except Exception as ce:
                        print(f"!!! FRAMES CACHE STORE FAILED (non-fatal): {ce} !!!")

            job.processing_phase = (
                f"Running OCR on {frame_manifest_data.get('total_extracted', '?')} frames…"
            )
            job.save(update_fields=['processing_phase'])
            result = service.extract_from_manifest(frame_manifest_data)

        elif asset.asset_type == MediaAssetType.FRAME_DIRECTORY:
            # Pre-extracted frames (e.g. from a cached run)
            result = service.extract_from_manifest(asset.metadata)

        else:
            # IMAGE — direct OCR
            blocks = service.extract_from_image(asset.file_path)
            text = " ".join([b['text'] for b in blocks])
            result = {
                "job_id": job_id,
                "unified_transcript": text,
                "frames_ocr": [{"index": 0, "timestamp_seconds": 0, "blocks": blocks}],
            }
        # ─────────────────────────────────────────────────────────────────────

        MediaAsset.objects.create(
            job=job, asset_type='OCR_RESULTS', file_path='',
            processing_status='OCR_COMPLETED', metadata=result,
        )

        # ── OCR cache write ───────────────────────────────────────────────────
        if cache and job.instagram_url:
            try:
                import tempfile
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tf:
                    json.dump(result, tf)
                    tf_path = tf.name
                cache.store_artifact(job.instagram_url, 'ocr', Path(tf_path))
                os.unlink(tf_path)
                print(f"!!! OCR CACHE STORE for job {job_id} !!!")
            except Exception as ce:
                print(f"!!! OCR CACHE STORE FAILED (non-fatal): {ce} !!!")
        # ─────────────────────────────────────────────────────────────────────

        job.processing_phase = "OCR extraction completed successfully."
        job.save(update_fields=['processing_phase'])
        return {"status": "success", "ocr_text_length": len(result['unified_transcript'])}

    except (OcrExtractionException, FrameExtractionException) as e:
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


# ── AUDIO pipeline: transcription ────────────────────────────────────────────

@shared_task(bind=True, max_retries=3)
def extract_audio_transcription(self, job_id: int):
    try:
        job = AnalysisJob.objects.get(id=job_id)
    except AnalysisJob.DoesNotExist:
        return

    # ── Mode guard ────────────────────────────────────────────────────────────
    if job.analysis_type == 'TEXT':
        job.processing_phase = "Audio transcription skipped — not required in TEXT mode."
        job.save(update_fields=['processing_phase'])
        return {"status": "skipped", "reason": "text_mode"}
    # ─────────────────────────────────────────────────────────────────────────

    try:
        # Accept VIDEO or AUDIO assets (bestaudio downloads produce AUDIO-type assets)
        media_asset = job.media_assets.filter(
            asset_type__in=[MediaAssetType.VIDEO, MediaAssetType.AUDIO]
        ).first()

        if not media_asset:
            # Image detected in AUDIO mode — should have been caught at ingestion,
            # but handle gracefully as a safety net.
            image_asset = job.media_assets.filter(asset_type=MediaAssetType.IMAGE).first()
            if image_asset:
                job.status = AnalysisJobStatus.FAILED
                job.error_message = (
                    "MODE_MISMATCH: AUDIO mode was selected but this post contains only images. "
                    "Switch to TEXT mode."
                )
                job.processing_phase = "Audio transcription failed: image post in AUDIO mode."
                job.save(update_fields=['status', 'error_message', 'processing_phase'])
                return {"status": "mode_mismatch"}
            raise AudioExtractionException("No media asset found for this job.")

        job.processing_phase = "Extracting audio track…"
        job.save(update_fields=['processing_phase'])

        # ── Mandatory: Extract thumbnail for video assets (Always run, even on cache hit) ──
        service = AudioExtractionService(job_id)
        if media_asset.asset_type == MediaAssetType.VIDEO:
            thumb_path = service.extract_thumbnail(media_asset.file_path)
            if thumb_path:
                MediaAsset.objects.get_or_create(
                    job=job, asset_type=MediaAssetType.THUMBNAIL, 
                    defaults={'file_path': thumb_path, 'processing_status': 'COMPLETED'}
                )
        # ─────────────────────────────────────────────────────────────────────────────────

        # ── Transcript cache read ─────────────────────────────────────────────
        cache = _get_cache(job)
        if cache and job.instagram_url:
            cached_t = cache.get_artifact(job.instagram_url, 'transcript')
            if cached_t:
                transcript_data = json.loads(cached_t.read_text())
                MediaAsset.objects.create(
                    job=job, asset_type='TRANSCRIPT_RESULTS', file_path='',
                    processing_status='TRANSCRIPTION_COMPLETED', metadata=transcript_data,
                )
                job.processing_phase = "Audio transcription completed (cache hit)."
                job.save(update_fields=['processing_phase'])
                print(f"!!! TRANSCRIPT CACHE HIT for job {job_id} !!!")
                return {
                    "status": "success", "cache_hit": True,
                    "transcript_length": len(transcript_data.get('unified_transcript', '')),
                }
        # ─────────────────────────────────────────────────────────────────────

        # Works for both VIDEO (extracts audio track) and AUDIO-only files (converts to WAV)
        audio_path = service.extract_audio(media_asset.file_path)

        if audio_path is None:
            transcript_data = {
                "job_id": job_id,
                "unified_transcript": "",
                "segments": [],
                "audio_detected": False,
                "speech_detected": False,
            }
            job.processing_phase = "No audio stream found. Skipping transcription."
            job.save(update_fields=['processing_phase'])
        else:
            job.processing_phase = "Transcribing audio with Whisper…"
            job.save(update_fields=['processing_phase'])

            print(f"!!! Starting Whisper transcription for job {job_id} !!!")
            transcript_data = service.transcribe_audio(audio_path)

            transcript = transcript_data.get('unified_transcript', '')
            print(f"!!! Whisper done. Length: {len(transcript)} chars !!!")
            print(f"!!! Transcript preview: {transcript[:100]}… !!!")

            transcript_data['audio_detected'] = True
            transcript_data['speech_detected'] = len(transcript) > 0

            # ── Transcript cache write ────────────────────────────────────────
            if cache and job.instagram_url:
                try:
                    import tempfile
                    with tempfile.NamedTemporaryFile(
                        mode='w', suffix='.json', delete=False
                    ) as tf:
                        json.dump(transcript_data, tf)
                        tf_path = tf.name
                    cache.store_artifact(job.instagram_url, 'transcript', Path(tf_path))
                    os.unlink(tf_path)
                    print(f"!!! TRANSCRIPT CACHE STORE for job {job_id} !!!")
                except Exception as ce:
                    print(f"!!! TRANSCRIPT CACHE STORE FAILED (non-fatal): {ce} !!!")
            # ─────────────────────────────────────────────────────────────────

            # Clean up the temporary WAV file
            if os.path.exists(audio_path):
                os.remove(audio_path)

        MediaAsset.objects.create(
            job=job,
            asset_type='TRANSCRIPT_RESULTS',
            file_path='',
            processing_status='TRANSCRIPTION_COMPLETED',
            metadata=transcript_data,
        )

        job.processing_phase = "Audio transcription completed successfully."
        job.save(update_fields=['processing_phase'])

        return {
            "status": "success",
            "audio_detected": transcript_data['audio_detected'],
            "speech_detected": transcript_data['speech_detected'],
            "transcript_length": len(transcript_data['unified_transcript']),
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


# ── Removed: extract_video_frames is no longer a standalone pipeline task. ────
# Frame extraction is now absorbed internally by extract_ocr_text when it
# encounters a VIDEO asset. This eliminates the separate step from the TEXT
# pipeline and removes the source of "0 FPS / 0 frames" failures on image posts.
