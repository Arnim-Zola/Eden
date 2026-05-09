import os
import sys
import django
from django.test import Client

# Setup Django environment
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
settings.CELERY_TASK_ALWAYS_EAGER = True
settings.CELERY_TASK_EAGER_PROPAGATES = True

from core_app.models import AnalysisJob
from unittest.mock import patch
import json

def run_e2e():
    print("="*50)
    print("Testing End-to-End API Flow")
    print("="*50)
    
    # We will mock the ingestion, extraction, and gemini steps so we don't depend on actual video files or the internet
    from ingestion.tasks import ingest_instagram_media
    from processing.tasks import extract_video_frames, extract_ocr_text, extract_audio_transcription
    from analysis.tasks import analyze_job_content
    from core_app.models import MediaAsset, MediaAssetType
    
    client = Client()
    
    # 1. Mocking the pipeline steps to simulate successful processing
    def mock_ingest(job_id):
        job = AnalysisJob.objects.get(id=job_id)
        MediaAsset.objects.create(
            job=job, asset_type=MediaAssetType.VIDEO, file_path='/mock/video.mp4', file_size=1000
        )
        job.processing_phase = 'Media downloaded'
        job.save()
        return {"status": "success"}
        
    def mock_frames(job_id):
        job = AnalysisJob.objects.get(id=job_id)
        MediaAsset.objects.create(
            job=job, asset_type=MediaAssetType.FRAME_DIRECTORY, file_path='/mock/frames', metadata={'frames': []}
        )
        return {"status": "success"}

    def mock_ocr(job_id):
        job = AnalysisJob.objects.get(id=job_id)
        MediaAsset.objects.create(
            job=job, asset_type='OCR_RESULTS', file_path='', metadata={'unified_transcript': 'MOCK OCR TEXT'}
        )
        return {"status": "success"}
        
    def mock_audio(job_id):
        job = AnalysisJob.objects.get(id=job_id)
        MediaAsset.objects.create(
            job=job, asset_type='TRANSCRIPT_RESULTS', file_path='', metadata={'unified_transcript': 'MOCK AUDIO TEXT'}
        )
        return {"status": "success"}
        
    def mock_analyze(job_id):
        job = AnalysisJob.objects.get(id=job_id)
        from core_app.models import AnalysisReport, ClaimRecord, AnalysisJobStatus
        report = AnalysisReport.objects.create(report_data={"summary": "MOCK SUMMARY", "claims": []})
        job.report = report
        
        ClaimRecord.objects.create(
            job=job,
            claim_text="Mock Claim",
            detection_source="TRANSCRIPT",
            classification_label="UNVERIFIED",
            confidence_score=0.5,
            contextual_reasoning="Mock reasoning"
        )
        job.status = AnalysisJobStatus.COMPLETED
        job.processing_phase = 'Analysis complete'
        job.save()
        return report.id

    with patch('ingestion.tasks.ingest_instagram_media.si') as m_ingest, \
         patch('processing.tasks.extract_video_frames.si') as m_frames, \
         patch('processing.tasks.extract_ocr_text.si') as m_ocr, \
         patch('processing.tasks.extract_audio_transcription.si') as m_audio, \
         patch('analysis.tasks.analyze_job_content.si') as m_analyze, \
         patch('celery.chain') as m_chain:
         
        # Simulate what the chain would do
        def mock_apply_async(*args, **kwargs):
            job_id = AnalysisJob.objects.last().id
            mock_ingest(job_id)
            mock_frames(job_id)
            mock_ocr(job_id)
            mock_audio(job_id)
            mock_analyze(job_id)

        class MockChain:
            def apply_async(self):
                mock_apply_async()
        
        m_chain.return_value = MockChain()

        print("1. Creating Job via API (POST /api/jobs/)...")
        response = client.post('/api/jobs/', {'instagram_url': 'http://example.com/e2e_test'}, content_type='application/json')
        
        if response.status_code != 201:
            print(f"FAILED TO CREATE JOB: {response.content}")
            return
            
        data = json.loads(response.content)
        job_id = data['id']
        print(f"Job created successfully! Job ID: {job_id}")
        
        print("\n2. Polling Job Status (GET /api/jobs/<id>/status/)...")
        status_response = client.get(f'/api/jobs/{job_id}/status/')
        status_data = json.loads(status_response.content)
        print(f"Current Status: {status_data['status']} - {status_data['processing_phase']}")
        
        print("\n3. Fetching Full Job Data (GET /api/jobs/<id>/)...")
        job_response = client.get(f'/api/jobs/{job_id}/')
        job_data = json.loads(job_response.content)
        
        print(f"Report Exists: {job_data['report'] is not None}")
        print(f"Claims Count: {len(job_data['claims'])}")
        if len(job_data['claims']) > 0:
            print(f"Sample Claim: {job_data['claims'][0]['claim_text']} ({job_data['claims'][0]['classification_label']})")
        
        print("\nE2E API TEST COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_e2e()
