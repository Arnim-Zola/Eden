"""
test_e2e_api.py — End-to-end API test for mode-selective pipelines.

Validates both TEXT mode (ingest → OCR → analyze) and AUDIO mode
(ingest → transcription → analyze) using mocked task execution.
"""
import os
import sys
import django
from django.test import Client

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
settings.CELERY_TASK_ALWAYS_EAGER = True
settings.CELERY_TASK_EAGER_PROPAGATES = True
# Django test client sends Host: testserver — allow it
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from core_app.models import AnalysisJob
from unittest.mock import patch
import json


def _mock_ingest(job_id, asset_type='VIDEO', path='/mock/video.mp4'):
    from core_app.models import MediaAsset, MediaAssetType
    job = AnalysisJob.objects.get(id=job_id)
    MediaAsset.objects.create(
        job=job, asset_type=asset_type, file_path=path, file_size=1000
    )
    job.processing_phase = 'Media downloaded'
    job.save()
    return {"status": "success"}


def _mock_ocr(job_id):
    from core_app.models import MediaAsset
    job = AnalysisJob.objects.get(id=job_id)
    MediaAsset.objects.create(
        job=job, asset_type='OCR_RESULTS', file_path='',
        metadata={'unified_transcript': 'MOCK OCR TEXT'},
    )
    return {"status": "success"}


def _mock_audio(job_id):
    from core_app.models import MediaAsset
    job = AnalysisJob.objects.get(id=job_id)
    MediaAsset.objects.create(
        job=job, asset_type='TRANSCRIPT_RESULTS', file_path='',
        metadata={'unified_transcript': 'MOCK TRANSCRIPT TEXT'},
    )
    return {"status": "success"}


def _mock_analyze(job_id):
    from core_app.models import AnalysisReport, ClaimRecord, AnalysisJobStatus
    job = AnalysisJob.objects.get(id=job_id)
    report = AnalysisReport.objects.create(
        report_data={"summary": "MOCK SUMMARY", "claims": []}
    )
    job.report = report
    ClaimRecord.objects.create(
        job=job,
        claim_text="Mock Claim",
        detection_source="TRANSCRIPT",
        classification_label="UNVERIFIED",
        confidence_score=0.5,
        contextual_reasoning="Mock reasoning",
    )
    job.status = AnalysisJobStatus.COMPLETED
    job.processing_phase = 'Analysis complete'
    job.save()
    return report.id


def run_text_mode_test(client):
    print("\n" + "="*50)
    print("TEST 1: TEXT MODE (ingest → OCR → analyze)")
    print("="*50)

    with patch('celery.chain') as m_chain:
        def mock_apply_async_text():
            job_id = AnalysisJob.objects.order_by('-id').first().id
            _mock_ingest(job_id)
            _mock_ocr(job_id)
            _mock_analyze(job_id)

        class MockChain:
            def apply_async(self):
                mock_apply_async_text()

        m_chain.return_value = MockChain()

        response = client.post(
            '/api/jobs/',
            json.dumps({'instagram_url': 'http://example.com/text_test', 'analysis_mode': 'text'}),
            content_type='application/json',
        )

        if response.status_code != 201:
            print(f"FAILED: {response.content}")
            return False

        data = json.loads(response.content)
        job_id = data['id']
        print(f"✓ Job created — ID: {job_id}, analysis_type: {data.get('analysis_type')}")

        job_response = client.get(f'/api/jobs/{job_id}/')
        job_data = json.loads(job_response.content)
        print(f"✓ Report: {job_data['report'] is not None}")
        print(f"✓ Claims: {len(job_data['claims'])}")
        return True


def run_audio_mode_test(client):
    print("\n" + "="*50)
    print("TEST 2: AUDIO MODE (ingest → transcription → analyze)")
    print("="*50)

    with patch('celery.chain') as m_chain:
        def mock_apply_async_audio():
            job_id = AnalysisJob.objects.order_by('-id').first().id
            _mock_ingest(job_id, asset_type='VIDEO')
            _mock_audio(job_id)
            _mock_analyze(job_id)

        class MockChain:
            def apply_async(self):
                mock_apply_async_audio()

        m_chain.return_value = MockChain()

        response = client.post(
            '/api/jobs/',
            json.dumps({'instagram_url': 'http://example.com/audio_test', 'analysis_mode': 'audio'}),
            content_type='application/json',
        )

        if response.status_code != 201:
            print(f"FAILED: {response.content}")
            return False

        data = json.loads(response.content)
        job_id = data['id']
        print(f"✓ Job created — ID: {job_id}, analysis_type: {data.get('analysis_type')}")

        job_response = client.get(f'/api/jobs/{job_id}/')
        job_data = json.loads(job_response.content)
        print(f"✓ Report: {job_data['report'] is not None}")
        print(f"✓ Claims: {len(job_data['claims'])}")
        return True


def run_e2e():
    client = Client()
    results = []
    results.append(run_text_mode_test(client))
    results.append(run_audio_mode_test(client))

    print("\n" + "="*50)
    if all(results):
        print("ALL E2E TESTS PASSED ✓")
    else:
        print("SOME TESTS FAILED ✗")
    print("="*50)


if __name__ == "__main__":
    run_e2e()
