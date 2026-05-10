from django.core.management.base import BaseCommand
from core_app.models import AnalysisJob

class Command(BaseCommand):
    help = 'Debug latest job'

    def handle(self, *args, **options):
        job = AnalysisJob.objects.last()
        self.stdout.write(f"Job ID: {job.id}")
        if job.report:
            data = job.report.report_data
            self.stdout.write(f"Report Data Keys: {list(data.keys())}")
            self.stdout.write(f"OCR Text Length: {len(data.get('ocr_text', ''))}")
            self.stdout.write(f"OCR Results Presence: {'ocr_results' in data}")
            if 'ocr_results' in data:
                res = data['ocr_results']
                self.stdout.write(f"OCR Results Structure: {list(res.keys())}")
                self.stdout.write(f"Frames OCR Count: {len(res.get('frames_ocr', []))}")
        else:
            self.stdout.write("No report found.")
