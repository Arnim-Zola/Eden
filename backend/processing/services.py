import os
import json
from django.conf import settings
from typing import Optional

class FrameExtractionException(Exception):
    pass

class FrameExtractionService:
    def __init__(self, job_id: int):
        self.job_id = job_id
        self.media_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job_id))
        self.frames_dir = os.path.join(self.media_dir, 'frames')
        self.thumbnails_dir = os.path.join(self.media_dir, 'thumbnails')
        
        os.makedirs(self.frames_dir, exist_ok=True)
        os.makedirs(self.thumbnails_dir, exist_ok=True)
        
    def extract_frames(self, video_path: str) -> dict:
        """
        Extracts 1 frame per second from the video.
        Generates full size JPEGs and 320px thumbnails.
        Returns the path to the generated manifest JSON.
        """
        import cv2
        if not os.path.exists(video_path):
            raise FrameExtractionException(f"Video file not found at {video_path}")
            
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise FrameExtractionException("Failed to open video file with OpenCV.")
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if fps == 0 or total_frames == 0:
            cap.release()
            raise FrameExtractionException("Invalid video file: 0 FPS or 0 total frames.")
            
        duration_seconds = total_frames / fps
        
        manifest = {
            "job_id": self.job_id,
            "duration_seconds": duration_seconds,
            "total_extracted": 0,
            "frames": []
        }
        
        current_second = 0
        extracted_count = 0
        
        while True:
            # Calculate the frame index for the current second
            frame_index = int(current_second * fps)
            if frame_index >= total_frames:
                break
                
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ret, frame = cap.read()
            
            if not ret:
                break
                
            # Full frame
            frame_filename = f"frame_{current_second:04d}.jpg"
            frame_path = os.path.join(self.frames_dir, frame_filename)
            cv2.imwrite(frame_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            
            # Thumbnail (320px width, maintain aspect ratio)
            height, width = frame.shape[:2]
            thumb_width = 320
            thumb_height = int((thumb_width / width) * height)
            thumbnail = cv2.resize(frame, (thumb_width, thumb_height), interpolation=cv2.INTER_AREA)
            
            thumb_filename = f"thumb_{current_second:04d}.jpg"
            thumb_path = os.path.join(self.thumbnails_dir, thumb_filename)
            cv2.imwrite(thumb_path, thumbnail, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            
            manifest["frames"].append({
                "index": extracted_count,
                "timestamp_seconds": current_second,
                "frame_path": frame_path,
                "thumbnail_path": thumb_path
            })
            
            current_second += 1
            extracted_count += 1
            
        cap.release()
        
        manifest["total_extracted"] = extracted_count
        
        manifest_path = os.path.join(self.media_dir, "frame_manifest.json")
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
            
        return {
            "manifest_path": manifest_path,
            "manifest_data": manifest,
            "extracted_count": extracted_count
        }

class OcrExtractionException(Exception):
    pass

class OcrExtractionService:
    def __init__(self, job_id: int):
        self.job_id = job_id

    def extract_from_image(self, image_path: str) -> list:
        """
        Extracts text blocks from a single image using Gemini Vision API.
        This replaces EasyOCR to avoid OOM crashes on the 512MB free tier.
        Gemini Vision is a lightweight API call with no local model loading.
        """
        if not os.path.exists(image_path):
            raise OcrExtractionException(f"Image not found: {image_path}")

        try:
            import base64
            from google import genai
            from google.genai import types

            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                raise OcrExtractionException("GEMINI_API_KEY not set — cannot run OCR")

            client = genai.Client(api_key=api_key)

            with open(image_path, "rb") as f:
                image_bytes = f.read()

            # Detect mime type
            image_lower = image_path.lower()
            if image_lower.endswith(".png"):
                mime_type = "image/png"
            elif image_lower.endswith(".webp"):
                mime_type = "image/webp"
            else:
                mime_type = "image/jpeg"

            prompt = (
                "Extract ALL visible text from this image exactly as it appears. "
                "Return each distinct text block on a new line. "
                "Include headlines, captions, labels, overlays, watermarks, and subtitles. "
                "Do NOT describe the image. Only output the raw text you see. "
                "If there is no visible text, reply with exactly: NO_TEXT_FOUND"
            )

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Content(parts=[
                        types.Part(text=prompt),
                        types.Part(inline_data=types.Blob(mime_type=mime_type, data=image_bytes)),
                    ])
                ],
            )

            raw_text = response.text.strip() if response.text else ""

            if not raw_text or raw_text == "NO_TEXT_FOUND":
                return []

            # Convert each non-empty line into a block
            blocks = []
            for line in raw_text.splitlines():
                line = line.strip()
                if len(line) > 2:
                    blocks.append({
                        "text": line,
                        "confidence": 0.95,
                        "bbox": []
                    })
            return blocks

        except OcrExtractionException:
            raise
        except Exception as e:
            raise OcrExtractionException(f"Gemini Vision OCR failed: {str(e)}")
        
    def extract_from_manifest(self, manifest_data: dict) -> dict:
        """
        Processes all frames in a FRAME_DIRECTORY manifest.
        Returns structured OCR data and a unified transcript.
        """
        frames_ocr = []
        transcript_lines = []
        
        last_frame_text = set()
        
        for frame_info in manifest_data.get('frames', []):
            frame_path = frame_info['frame_path']
            blocks = self.extract_from_image(frame_path)
            
            frame_text_set = set(b['text'] for b in blocks)
            
            # Basic deduplication: only add text that wasn't in the previous frame
            new_text = frame_text_set - last_frame_text
            
            if new_text:
                time_sec = frame_info['timestamp_seconds']
                timestamp_str = f"[{time_sec // 60:02d}:{time_sec % 60:02d}]"
                joined_text = " ".join(new_text)
                transcript_lines.append(f"{timestamp_str} {joined_text}")
                
            last_frame_text = frame_text_set
            
            frames_ocr.append({
                "index": frame_info['index'],
                "timestamp_seconds": frame_info['timestamp_seconds'],
                "blocks": blocks
            })
            
        unified_transcript = "\n".join(transcript_lines)
        
        return {
            "job_id": self.job_id,
            "unified_transcript": unified_transcript,
            "frames_ocr": frames_ocr
        }

import subprocess

class AudioExtractionException(Exception):
    pass

class AudioExtractionService:
    def __init__(self, job_id: int):
        self.job_id = job_id
        self.media_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job_id))
        self.model = None
        
    def extract_audio(self, video_path: str):
        """
        Extracts audio using FFmpeg into a 16kHz mono WAV file optimized for Whisper.
        Returns the path to the extracted WAV file, or None if no audio stream exists.
        """
        if not os.path.exists(video_path):
            raise AudioExtractionException(f"Video file not found: {video_path}")
            
        audio_path = os.path.join(self.media_dir, "extracted_audio.wav")
        
        # 1. Use ffprobe to detect if an audio stream actually exists
        probe_command = ['ffprobe', '-i', video_path, '-show_streams', '-select_streams', 'a', '-loglevel', 'error']
        try:
            probe_result = subprocess.run(probe_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if not probe_result.stdout.strip():
                # No audio stream found, silent video!
                return None
        except Exception as e:
            logger.warning(f"ffprobe failed to verify audio stream, assuming it exists: {e}")
        
        # 2. Extract to WAV using ffmpeg
        command = [
            'ffmpeg', '-y', '-i', video_path,
            '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
            audio_path
        ]
        try:
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode != 0:
                raise AudioExtractionException(f"ffmpeg returned non-zero code: {result.stderr}")
            if os.path.exists(audio_path):
                return audio_path
        except Exception as e:
            raise AudioExtractionException(f"ffmpeg execution failed: {str(e)}")
            
        return None

    def extract_thumbnail(self, video_path: str) -> Optional[str]:
        """
        Extracts a single thumbnail frame from the video at 00:00:01.
        Returns the thumbnail image path, or None if extraction fails.
        """
        thumb_path = os.path.join(self.media_dir, "video_thumbnail.jpg")
        command = [
            'ffmpeg', '-y', '-ss', '00:00:01', '-i', video_path,
            '-vframes', '1', '-q:v', '2',
            '-f', 'image2', thumb_path
        ]
        try:
            subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if os.path.exists(thumb_path):
                return thumb_path
        except Exception:
            pass
        return None

    def transcribe_audio(self, audio_path: str) -> dict:
        """
        Transcribes the audio using Whisper and returns the segments and unified transcript.
        """
        try:
            if self.model is None:
                import whisper
                # Default to "tiny" in production to avoid Out of Memory (OOM) on 512MB RAM free tier.
                model_name = os.environ.get("WHISPER_MODEL_NAME", "tiny")
                logger.info(f"Loading Whisper model '{model_name}' on-demand...")
                self.model = whisper.load_model(model_name)
                
            # Transcribe the audio
            # fp16=False is needed if running on CPU to avoid warnings
            result = self.model.transcribe(audio_path, fp16=False)
            
            transcript_data = {
                "job_id": self.job_id,
                "unified_transcript": result.get('text', '').strip(),
                "segments": []
            }
            
            last_text = ""
            for segment in result.get('segments', []):
                text = segment['text'].strip()
                # Basic hallucination deduplication: skip if identical to last segment
                if text and text != last_text:
                    transcript_data["segments"].append({
                        "start": segment['start'],
                        "end": segment['end'],
                        "text": text,
                        "confidence": segment.get('avg_logprob', 0.0)
                    })
                    last_text = text
                
            # Rebuild unified transcript from deduplicated segments
            transcript_data["unified_transcript"] = " ".join(s["text"] for s in transcript_data["segments"])
                
            return transcript_data
            
        except Exception as e:
            raise AudioExtractionException(f"Whisper transcription failed: {str(e)}")
