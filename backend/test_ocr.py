import os
import django
import cv2
import numpy as np

import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob, MediaAsset, MediaAssetType
from processing.tasks import extract_ocr_text
from django.conf import settings

print("Creating AnalysisJob...")
job = AnalysisJob.objects.create(instagram_url="http://example.com/dummy_ocr")

# Create media directory for this job
media_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job.id))
os.makedirs(media_dir, exist_ok=True)
image_path = os.path.join(media_dir, "source_media.jpg")

print("Creating dummy image file with OpenCV containing text...")
frame = np.zeros((480, 640, 3), dtype=np.uint8)
# Add some text to the image to be detected by OCR
cv2.putText(frame, 'BREAKING NEWS', (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)
cv2.putText(frame, 'ALIENS FOUND ON MARS', (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (200, 200, 255), 2)
cv2.imwrite(image_path, frame)

print("Creating MediaAsset for image...")
MediaAsset.objects.create(
    job=job,
    asset_type=MediaAssetType.IMAGE,
    file_path=image_path,
    file_size=os.path.getsize(image_path),
    processing_status='DOWNLOADED'
)

print(f"Running OCR extraction for job {job.id}...")
result = extract_ocr_text(job.id)

print("Result:", result)

job.refresh_from_db()
print(f"Job Status: {job.status}")
print(f"Job Phase: {job.processing_phase}")
print(f"Error Message: {job.error_message}")

print("\n--- OCR Asset Metadata ---")
ocr_asset = job.media_assets.filter(asset_type='OCR_RESULTS').first()
if ocr_asset:
    print(f"Unified Transcript: {ocr_asset.metadata.get('unified_transcript')}")
    print(f"Frames OCR Data: {ocr_asset.metadata.get('frames_ocr')}")
else:
    print("No OCR_RESULTS asset found.")
