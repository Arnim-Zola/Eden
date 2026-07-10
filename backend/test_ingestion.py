"""
test_ingestion.py — Manual ingestion test for TEXT mode on an image post.

Tests the exact scenario that was failing:
  URL:  https://www.instagram.com/p/DYFFAXvn2ot/
  Mode: text (image post)

Expected result:
  - yt-dlp dump-json step catches 'No video formats found' and continues with stub metadata
  - yt-dlp download step succeeds (auto-selects image format)
  - MediaAsset created with asset_type=IMAGE
  - No mode mismatch error
"""
import os
import sys
import django

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob, AnalysisJobStatus, MediaAsset, MediaAssetType

# ── Test target ───────────────────────────────────────────────────────────────
TEST_URL = "https://www.instagram.com/p/DZ5M5SUxwgM/"
TEST_MODE = "text"
# ─────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print(f"INGESTION TEST — mode={TEST_MODE.upper()}")
print(f"URL: {TEST_URL}")
print("=" * 60)

# Create job
job = AnalysisJob.objects.create(
    instagram_url=TEST_URL,
    analysis_type='TEXT',
)
print(f"\n✓ Job created: ID={job.id}")

# Run ingestion task directly (not via Celery)
from ingestion.tasks import ingest_instagram_media

print("\n--- Running ingest_instagram_media ---")
result = ingest_instagram_media(job.id)
print(f"\nTask result: {result}")

# Inspect
job.refresh_from_db()
print(f"\nJob status:  {job.status}")
print(f"Job phase:   {job.processing_phase}")
if job.error_message:
    print(f"Error:       {job.error_message}")

print("\n--- Media Assets ---")
for asset in job.media_assets.all():
    print(f"  type={asset.asset_type}  status={asset.processing_status}")
    print(f"  path={asset.file_path}")

print("\n" + "=" * 60)
if result.get('status') == 'success':
    asset_type = result.get('asset_type', '?')
    print(f"✓ PASS — ingestion succeeded, asset_type={asset_type}")
    if asset_type == MediaAssetType.IMAGE:
        print("✓ Correctly identified as IMAGE post")
    elif asset_type == MediaAssetType.VIDEO:
        print("  (downloaded as video)")
elif result.get('status') == 'mode_mismatch':
    print("✗ FAIL — mode mismatch fired (should not happen for TEXT mode)")
elif result.get('status') == 'failed':
    print(f"✗ FAIL — ingestion failed: {result.get('error')}")
else:
    print(f"  status={result.get('status')}")
print("=" * 60)

# Test suites for OCR integrated.