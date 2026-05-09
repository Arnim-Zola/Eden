import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob
from ingestion.tasks import ingest_instagram_media

# Using Instagram's official account reel as a sample public reel
url = "https://www.instagram.com/reel/C10xW60P7Qy/"

print("Creating AnalysisJob...")
job = AnalysisJob.objects.create(instagram_url=url)

print(f"Running ingestion for job {job.id}...")
result = ingest_instagram_media(job.id)

print("Result:", result)

job.refresh_from_db()
print(f"Job Status: {job.status}")
print(f"Job Phase: {job.processing_phase}")
print(f"Error Message: {job.error_message}")

for asset in job.media_assets.all():
    print(f"MediaAsset created: {asset.asset_type}, {asset.file_path}, {asset.file_size} bytes")
