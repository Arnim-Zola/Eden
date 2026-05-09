import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
import django
import urllib.request
import subprocess

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob, MediaAsset, MediaAssetType
from processing.tasks import extract_audio_transcription
from django.conf import settings

print("Creating AnalysisJob...")
job = AnalysisJob.objects.create(instagram_url="http://example.com/dummy_audio")

# Create media directory for this job
media_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job.id))
os.makedirs(media_dir, exist_ok=True)
wav_path = os.path.join(media_dir, "temp.wav")
video_path = os.path.join(media_dir, "source_media.mp4")

print("Generating synthetic audio using gTTS...")
from gtts import gTTS
tts = gTTS('The truth is out there, do not believe the fake news.', lang='en')
tts.save(wav_path)

print("Muxing audio into dummy mp4 using FFmpeg...")
subprocess.run(['ffmpeg', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=640x480:d=3', '-i', wav_path, '-c:v', 'libx264', '-c:a', 'aac', '-shortest', video_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

print("Creating MediaAsset for video...")
MediaAsset.objects.create(
    job=job,
    asset_type=MediaAssetType.VIDEO,
    file_path=video_path,
    file_size=os.path.getsize(video_path),
    processing_status='DOWNLOADED'
)

print(f"Running audio transcription for job {job.id}...")
result = extract_audio_transcription(job.id)

print("Result:", result)

job.refresh_from_db()
print(f"Job Status: {job.status}")
print(f"Job Phase: {job.processing_phase}")
print(f"Error Message: {job.error_message}")

print("\n--- TRANSCRIPT Asset Metadata ---")
transcript_asset = job.media_assets.filter(asset_type='TRANSCRIPT_RESULTS').first()
if transcript_asset:
    print(f"Unified Transcript: {transcript_asset.metadata.get('unified_transcript')}")
    print(f"Segments Data: {transcript_asset.metadata.get('segments')}")
else:
    print("No TRANSCRIPT_RESULTS asset found.")
