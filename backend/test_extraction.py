"""
test_extraction.py — Manual integration test for the TEXT pipeline.

Now uses extract_ocr_text (which internally handles frame extraction for VIDEO assets)
instead of the removed extract_video_frames standalone task.
"""
import os
import django
import urllib.request

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob, MediaAsset, MediaAssetType
from processing.tasks import extract_ocr_text  # replaces removed extract_video_frames
from django.conf import settings

print("Creating AnalysisJob (TEXT mode)...")
job = AnalysisJob.objects.create(
    instagram_url="http://example.com/dummy_video",
    analysis_type='TEXT',
)

# Create media directory and a dummy video for this job
media_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job.id))
os.makedirs(media_dir, exist_ok=True)
video_path = os.path.join(media_dir, "source_media.mp4")

import cv2
import numpy as np
print("Creating dummy video file with OpenCV...")
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(video_path, fourcc, 30.0, (640, 480))
for i in range(90):  # 3 seconds at 30 fps
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(frame, f'Frame {i}', (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
    out.write(frame)
out.release()

print("Creating MediaAsset (VIDEO type)...")
MediaAsset.objects.create(
    job=job,
    asset_type=MediaAssetType.VIDEO,
    file_path=video_path,
    file_size=os.path.getsize(video_path),
    processing_status='DOWNLOADED',
)

print(f"Running extract_ocr_text for job {job.id}...")
print("(OCR task will internally extract frames before running OCR)")
result = extract_ocr_text(job.id)

print("Result:", result)

job.refresh_from_db()
print(f"\nJob Status:  {job.status}")
print(f"Job Phase:   {job.processing_phase}")
print(f"Error:       {job.error_message}")

print("\n--- Media Assets ---")
for asset in job.media_assets.all():
    print(f"  Type: {asset.asset_type}  |  Status: {asset.processing_status}")
    print(f"  Path: {asset.file_path}")
    if asset.asset_type == MediaAssetType.FRAME_DIRECTORY:
        frames = asset.metadata.get('total_extracted', '?')
        print(f"  Frames extracted: {frames}")
    if asset.asset_type == 'OCR_RESULTS':
        text = asset.metadata.get('unified_transcript', '')
        print(f"  OCR text ({len(text)} chars): {text[:80]}...")
