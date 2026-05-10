import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob, AnalysisReport, ClaimRecord
from analysis.tasks import analyze_job_content

job = AnalysisJob.objects.last()
print(f"Manually re-analyzing Job {job.id}...")

# Clear existing report and claims to avoid duplicates if needed, 
# though analyze_job_content usually creates new ones.
if job.report:
    print(f"Deleting old report {job.report.id}")
    job.report.delete()
job.claims.all().delete()

# Run the task synchronously
report_id = analyze_job_content(job.id)
print(f"Successfully re-analyzed. New Report ID: {report_id}")

# Verification
job.refresh_from_db()
data = job.report.report_data
print(f"New Report Data Keys: {list(data.keys())}")
print(f"OCR Text Length: {len(data.get('ocr_text', ''))}")
print(f"OCR Results Presence: {'ocr_results' in data}")
