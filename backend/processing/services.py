import os
import cv2
import json
from django.conf import settings

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

import easyocr

class OcrExtractionException(Exception):
    pass

class OcrExtractionService:
    def __init__(self, job_id: int):
        self.job_id = job_id
        # Initialize EasyOCR reader. Use GPU if available, else fallback to CPU.
        self.reader = easyocr.Reader(['en'], gpu=False)
        
    def extract_from_image(self, image_path: str) -> list:
        """
        Extracts text blocks from a single image using CV2 preprocessing.
        """
        if not os.path.exists(image_path):
            raise OcrExtractionException(f"Image not found: {image_path}")
            
        img = cv2.imread(image_path)
        if img is None:
            raise OcrExtractionException(f"Failed to read image with cv2: {image_path}")
            
        # Preprocessing: Grayscale + Contrast Enhancement
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
            
        results = self.reader.readtext(enhanced)
        blocks = []
        for (bbox, text, prob) in results:
            if prob > 0.45: # Higher confidence threshold
                # Garbage filtering: require decent alphanumeric ratio
                alnum_count = sum(c.isalnum() for c in text)
                if len(text) > 0 and (alnum_count / len(text)) > 0.4:
                    blocks.append({
                        "text": text,
                        "confidence": float(prob),
                        "bbox": [[int(coord) for coord in point] for point in bbox]
                    })
        return blocks
        
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
import whisper

class AudioExtractionException(Exception):
    pass

class AudioExtractionService:
    def __init__(self, job_id: int):
        self.job_id = job_id
        self.media_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job_id))
        # Initialize whisper model. Using "base" for MVP speed.
        self.model = whisper.load_model("base")
        
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
            raise AudioExtractionException(f"Failed to probe video for audio streams: {str(e)}")
        
        # 2. Extract audio if stream exists
        command = [
            'ffmpeg', '-y', '-i', video_path, 
            '-vn', '-acodec', 'pcm_s16le', 
            '-ar', '16000', '-ac', '1', 
            audio_path
        ]
        
        try:
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode != 0:
                raise AudioExtractionException(f"FFmpeg extraction failed: {result.stderr}")
        except FileNotFoundError:
            raise AudioExtractionException("FFmpeg not found. Ensure FFmpeg is installed and in PATH.")
        except Exception as e:
            raise AudioExtractionException(f"Unexpected error during FFmpeg extraction: {str(e)}")
            
        if not os.path.exists(audio_path):
            raise AudioExtractionException("Audio extraction completed but file not found.")
            
        return audio_path

    def transcribe_audio(self, audio_path: str) -> dict:
        """
        Transcribes the audio using Whisper and returns the segments and unified transcript.
        """
        try:
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
