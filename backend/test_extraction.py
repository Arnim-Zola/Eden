import os
import django
import urllib.request

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob, MediaAsset, MediaAssetType
from processing.tasks import extract_video_frames
from django.conf import settings

print("Creating AnalysisJob...")
job = AnalysisJob.objects.create(instagram_url="http://example.com/dummy_video")

# Create media directory for this job
media_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job.id))
os.makedirs(media_dir, exist_ok=True)
video_path = os.path.join(media_dir, "source_media.mp4")

import cv2
import numpy as np
print("Creating dummy video file with OpenCV...")
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(video_path, fourcc, 30.0, (640, 480))
for i in range(90): # 3 seconds at 30 fps
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(frame, f'Frame {i}', (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
    out.write(frame)
out.release()

print("Creating MediaAsset for video...")
MediaAsset.objects.create(
    job=job,
    asset_type=MediaAssetType.VIDEO,
    file_path=video_path,
    file_size=os.path.getsize(video_path),
    processing_status='DOWNLOADED'
)

print(f"Running frame extraction for job {job.id}...")
result = extract_video_frames(job.id)

print("Result:", result)

job.refresh_from_db()
print(f"Job Status: {job.status}")
print(f"Job Phase: {job.processing_phase}")
print(f"Error Message: {job.error_message}")

print("\n--- Media Assets ---")
for asset in job.media_assets.all():
    print(f"Asset Type: {asset.asset_type}")
    print(f"File Path: {asset.file_path}")
    if asset.asset_type == MediaAssetType.FRAME_DIRECTORY:
        print(f"Metadata (Manifest): {asset.metadata}")
