import os
import sys
import django

# Setup Django environment
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core_app.models import AnalysisJob, MediaAsset, MediaAssetType, AnalysisReport, ClaimRecord
from analysis.tasks import analyze_job_content

def run_test_case(name, ocr_text, transcript_text):
    print(f"\n{'='*50}\nRunning Test Case: {name}\n{'='*50}")
    
    # 1. Create Job
    job = AnalysisJob.objects.create(instagram_url=f"http://example.com/{name.replace(' ', '_')}")
    
    # 2. Create OCR Asset
    MediaAsset.objects.create(
        job=job,
        asset_type='OCR_RESULTS',
        file_path='/dummy/path/ocr',
        metadata={'unified_transcript': ocr_text}
    )
    
    # 3. Create Transcript Asset
    MediaAsset.objects.create(
        job=job,
        asset_type='TRANSCRIPT_RESULTS',
        file_path='/dummy/path/transcript',
        metadata={'unified_transcript': transcript_text}
    )
    
    # 4. Run Analysis
    try:
        report_id = analyze_job_content(job.id)
        
        job.refresh_from_db()
        print(f"Job Status: {job.status}")
        
        if job.report:
            print(f"\nReport JSON:")
            import json
            print(json.dumps(job.report.report_data, indent=2))
        
        print("\nExtracted Claims from DB:")
        claims = job.claims.all()
        for claim in claims:
            print(f"- {claim.claim_text}")
            print(f"  Classification: {claim.classification_label}")
            print(f"  Confidence: {claim.confidence_score}")
            print(f"  Reasoning: {claim.contextual_reasoning}")
            print()
            
    except Exception as e:
        print(f"Error during analysis: {e}")

if __name__ == "__main__":
    # Test Case 1: Fake Gaming Rumor
    gaming_ocr = "GTA VI DELAYED TO 2028!!! ROCKSTAR CONFIRMS CANCELLED PREORDERS."
    gaming_transcript = "What's up guys, massive news today. According to a leak from my uncle who works at Nintendo, Rockstar is pushing GTA 6 back to 2028 because they lost the source code. Preorders are being refunded automatically."
    
    # Test Case 2: Misleading Medical Advice
    medical_ocr = "CURE CANCER WITH LEMON WATER! Doctors hate this secret."
    medical_transcript = "Stop taking your chemotherapy right now! I discovered that drinking hot lemon water with baking soda completely changes your body's pH to alkaline, making it physically impossible for cancer cells to exist. The medical industry is hiding this to sell pills."

    run_test_case("Fake Gaming Rumor", gaming_ocr, gaming_transcript)
    run_test_case("Misleading Medical Advice", medical_ocr, medical_transcript)
