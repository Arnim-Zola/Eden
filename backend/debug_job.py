from core_app.models import AnalysisJob
job = AnalysisJob.objects.last()
print(f"Job ID: {job.id}")
if job.report:
    print(f"Report Data Keys: {list(job.report.report_data.keys())}")
    print(f"OCR Text Length: {len(job.report.report_data.get('ocr_text', ''))}")
    print(f"OCR Results Presence: {'ocr_results' in job.report.report_data}")
    if 'ocr_results' in job.report.report_data:
        res = job.report.report_data['ocr_results']
        print(f"OCR Results Structure: {list(res.keys())}")
        print(f"Frames OCR Count: {len(res.get('frames_ocr', []))}")
else:
    print("No report found for this job.")
