import os
import json
import logging
from typing import List, Optional, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ─── Data Models ──────────────────────────────────────────────────────────────

class ClaimModel(BaseModel):
    claim_text: str = Field(description="The factual assertion detected in the content.")
    detection_source: str = Field(description="Source of the claim: OCR, TRANSCRIPT, or VISUAL")
    classification_label: str = Field(description="Classification: VERIFIED_LIKELY_TRUE, PLAUSIBLE, UNVERIFIED, OPINION_OR_SATIRE, MISLEADING_CONTEXT, LIKELY_FALSE, HIGH_RISK")
    confidence_score: float = Field(description="Confidence score between 0.0 and 1.0. Lower scores indicate uncertainty.")
    contextual_reasoning: str = Field(description="Summary of reasoning leading to this classification. Explain why this might be true, false, or uncertain without making absolute truth claims. Be cautious and explain uncertainty if evidence is insufficient.")
    transcript_reference: str = Field(default="", description="The specific snippet or timestamp from the audio transcript that supports this claim.")
    ocr_reference: str = Field(default="", description="The specific snippet or block from the on-screen OCR text that supports this claim.")
    search_query: str = Field(description="An optimized search query (keywords only) to search Google/DuckDuckGo to verify this claim. E.g. 'left side sleeping nightmare frequency' or 'donald trump google investment news'. Max 6 words.")

class ReportModel(BaseModel):
    claims: List[ClaimModel] = Field(description="List of factual claims extracted and analyzed from the content.")
    summary: str = Field(description="Overall summary of the analysis. IMPORTANT: If a claim is an absolute undeniable truth (e.g., the sun rises in the east), state it explicitly as an ABSOLUTE FACT. If not, state it is a subjective or unverified assertion.")
    overall_risk_score: float = Field(description="Overall risk score from 0.0 to 1.0")
    risk_explanation: str = Field(
        description=(
            "A 2-sentence rationale written for a general audience explaining why "
            "this media carries its overall level of misinformation risk. "
            "Sentence 1: state the dominant pattern observed across the claims "
            "(e.g. the proportion of unverified or false claims and their subject matter). "
            "Sentence 2: state the practical implication — what a careful reader or "
            "listener should watch out for when consuming this content. Do not mention a numeric score."
        )
    )

class AnalysisProviderResult:
    """Standardized wrapper for provider outputs."""
    def __init__(self, success: bool, data: dict, provider_name: str, error: Optional[str] = None, is_recoverable: bool = True):
        self.success = success
        self.data = data
        self.provider_name = provider_name
        self.error = error
        self.is_recoverable = is_recoverable

# ─── Base Provider Interface ──────────────────────────────────────────────────

class BaseAnalysisProvider:
    def name(self) -> str:
        raise NotImplementedError

    def analyze(self, ocr_text: str, transcript_text: str, analysis_type: str = 'FULL') -> AnalysisProviderResult:
        raise NotImplementedError

# ─── Gemini Provider ──────────────────────────────────────────────────────────

class GeminiProvider(BaseAnalysisProvider):
    def __init__(self):
        try:
            from google import genai
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key or api_key == "your-gemini-api-key-here":
                self.client = None
            else:
                self.client = genai.Client(api_key=api_key)
        except ImportError:
            self.client = None
        self.model_name = "gemini-2.5-flash"

    def name(self) -> str:
        return "Gemini"

    def analyze(self, ocr_text: str, transcript_text: str, analysis_type: str = 'FULL') -> AnalysisProviderResult:
        if not self.client:
            return AnalysisProviderResult(False, {}, self.name(), "API key missing or library not installed", is_recoverable=False)

        from google.genai import types
        
        mode_instruction = ""
        if analysis_type == 'TEXT':
            mode_instruction = "You are running in TEXT ONLY mode. Focus EXCLUSIVELY on evaluating the provided visual OCR text."
        elif analysis_type == 'AUDIO':
            mode_instruction = "You are running in AUDIO ONLY mode. Focus EXCLUSIVELY on evaluating the provided audio transcript."

        prompt = f"""
        You are an expert fact-checking AI. Extract factual claims and classify them.
        {mode_instruction}
        
        Requirements:
        1. Produce explainable reasoning in 'contextual_reasoning'.
        2. Strictly use 'UNVERIFIED' if evidence is noisy or insufficient.
        3. Identify EXACT references in 'transcript_reference' or 'ocr_reference'.
        4. Deduplicate similar assertions.
        5. Generate a concise search engine query in 'search_query' containing keywords to look up evidence. E.g. 'nightmare frequency left sleepers' or 'donald trump google investment'.
        6. In the summary, EXPLICITLY identify if any claim is an absolute undeniable factual truth (like 'water is wet' or 'the sun rises in the east'). Describe subjective or contextual claims as unverified.
        7. In 'risk_explanation', write a concise 2-sentence rationale for the overall misinformation risk:
           - Sentence 1: state the dominant pattern observed across the claims (e.g. the proportion of unverified or false claims and their subject matter).
           - Sentence 2: state the practical implication — what a careful reader or listener should watch out for when consuming this content.
           - Do NOT mention a numeric score. Write for a general, non-technical audience.

        OCR Text: {ocr_text}
        Transcript: {transcript_text}
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ReportModel,
                    temperature=0.2,
                )
            )
            return AnalysisProviderResult(True, json.loads(response.text), self.name())
        except Exception as e:
            err_str = str(e)
            
            # Automatically failover to a highly available legacy model if 2.5-flash is overloaded
            if "503" in err_str or "429" in err_str or "exhausted" in err_str.lower() or "overloaded" in err_str.lower():
                logger.warning(f"Gemini model {self.model_name} overloaded. Retrying with gemini-2.5-flash-lite...")
                try:
                    response = self.client.models.generate_content(
                        model="gemini-2.5-flash-lite",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=ReportModel,
                            temperature=0.2,
                        )
                    )
                    return AnalysisProviderResult(True, json.loads(response.text), f"{self.name()} (2.5-flash-lite fallback)")
                except Exception as retry_e:
                    err_str = f"Primary error: {str(e)} | Fallback error: {str(retry_e)}"

            with open("celery_gemini_error.txt", "w") as f:
                f.write(err_str)

            # Classify error: 429 and 5xx are usually recoverable via pipeline failover
            is_recoverable = "429" in err_str or "500" in err_str or "503" in err_str or "exhausted" in err_str.lower()
            return AnalysisProviderResult(False, {}, self.name(), err_str, is_recoverable=is_recoverable)

# ─── Hugging Face Provider ────────────────────────────────────────────────────

class HuggingFaceProvider(BaseAnalysisProvider):
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.api_key = os.environ.get("HUGGINGFACE_API_KEY")

    def name(self) -> str:
        return f"HuggingFace ({self.model_id.split('/')[-1]})"

    def analyze(self, ocr_text: str, transcript_text: str, analysis_type: str = 'FULL') -> AnalysisProviderResult:
        if not self.api_key:
            return AnalysisProviderResult(False, {}, self.name(), "HUGGINGFACE_API_KEY missing in .env", is_recoverable=False)

        import requests
        
        mode_instruction = ""
        if analysis_type == 'TEXT':
            mode_instruction = "TEXT ONLY mode. Focus EXCLUSIVELY on evaluating the provided visual OCR text."
        elif analysis_type == 'AUDIO':
            mode_instruction = "AUDIO ONLY mode. Focus EXCLUSIVELY on evaluating the provided audio transcript."

        sys_prompt = f"""You are an expert fact-checking AI. Extract factual claims from the text.
{mode_instruction}
IMPORTANT: If a claim is an absolute undeniable factual truth (like 'water is wet' or 'the sun rises in the east'), state it explicitly as an ABSOLUTE FACT in the summary.

You MUST reply with ONLY a valid raw JSON object matching this exact schema:
{{
  "claims": [
    {{
      "claim_text": "...",
      "detection_source": "OCR or TRANSCRIPT",
      "classification_label": "VERIFIED_LIKELY_TRUE or PLAUSIBLE or UNVERIFIED or LIKELY_FALSE",
      "confidence_score": 0.8,
      "contextual_reasoning": "...",
      "transcript_reference": "...",
      "ocr_reference": "...",
      "search_query": "..."
    }}
  ],
  "summary": "...",
  "overall_risk_score": 0.5,
  "risk_explanation": "..."
}}
Do NOT output any markdown blocks (like ```json), DO NOT output any conversational text. ONLY raw JSON.
"""
        
        user_prompt = f"OCR Text: {ocr_text}\nTranscript: {transcript_text}"
        
        # Format for instruction-tuned models
        combined_prompt = f"[INST] {sys_prompt}\n\n{user_prompt} [/INST]"

        try:
            url = f"https://api-inference.huggingface.co/models/{self.model_id}"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "inputs": combined_prompt,
                "parameters": {
                    "max_new_tokens": 1500,
                    "return_full_text": False,
                    "temperature": 0.1
                }
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=25)
            
            if response.status_code != 200:
                is_recoverable = response.status_code in [503, 429]
                return AnalysisProviderResult(False, {}, self.name(), f"HF HTTP {response.status_code}: {response.text}", is_recoverable)
            
            out_text = response.json()[0]['generated_text'].strip()
            
            # Strip markdown if the model hallucinated it anyway
            if out_text.startswith("```json"):
                out_text = out_text.replace("```json", "", 1)
            if out_text.endswith("```"):
                out_text = out_text[:-3]
            out_text = out_text.strip()
            
            data = json.loads(out_text)
            
            # Ensure required schema fields exist to prevent app crashes
            if "claims" not in data: data["claims"] = []
            if "summary" not in data: data["summary"] = "Analysis complete."
            if "overall_risk_score" not in data: data["overall_risk_score"] = 0.5
            if "risk_explanation" not in data: data["risk_explanation"] = "No explanation provided."
            
            return AnalysisProviderResult(True, data, self.name())
            
        except json.JSONDecodeError as e:
            return AnalysisProviderResult(False, {}, self.name(), f"HF JSON parse failed: {e}", is_recoverable=False)
        except Exception as e:
            return AnalysisProviderResult(False, {}, self.name(), f"HF Request failed: {e}", is_recoverable=True)

# ─── Degraded Fallback Provider ───────────────────────────────────────────────

class DegradedProvider(BaseAnalysisProvider):
    """
    Final safety net. Returns a professional 'Analysis Suspended' state 
    without contaminating the semantic fields with error logs.
    """
    def name(self) -> str:
        return "System Fallback"

    def analyze(self, ocr_text: str, transcript_text: str, analysis_type: str = 'FULL') -> AnalysisProviderResult:
        data = {
            "claims": [],
            "summary": "Automated analysis is temporarily unavailable. Detailed OCR and Transcript data remain available for manual verification.",
            "overall_risk_score": 0.0,
            "status_note": "DEGRADED_MODE_ACTIVE"
        }
        return AnalysisProviderResult(True, data, self.name())

# ─── Orchestrator ─────────────────────────────────────────────────────────────

class AnalysisOrchestrator:
    def __init__(self):
        # Initial chain: Gemini -> HF Llama -> HF Mistral -> Degraded Fallback
        self.providers: List[BaseAnalysisProvider] = [
            GeminiProvider(),
            HuggingFaceProvider("meta-llama/Meta-Llama-3-8B-Instruct"),
            HuggingFaceProvider("mistralai/Mistral-7B-Instruct-v0.3"),
            DegradedProvider()
        ]

    def analyze_content(self, ocr_text: str, transcript_text: str, analysis_type: str = 'FULL') -> dict:
        for provider in self.providers:
            logger.info(f"Attempting analysis with provider: {provider.name()}")
            result = provider.analyze(ocr_text, transcript_text, analysis_type)
            
            if result.success:
                logger.info(f"Analysis succeeded with provider: {provider.name()}")
                # Tag the result with the provider that actually worked
                result.data['_provider'] = provider.name()
                return result.data
            
            logger.warning(f"Provider {provider.name()} failed: {result.error}")
            
            with open(f"orchestrator_error_{job_id if 'job_id' in locals() else 'unknown'}.txt", "a") as f:
                f.write(f"Provider {provider.name()} failed: {result.error}\n")
                
            if not result.is_recoverable:
                logger.error(f"Critical error from {provider.name()}, moving to next or stopping.")
        
        # If we somehow fall through (shouldn't happen with DegradedProvider), return an emergency empty state
        return {
            "claims": [],
            "summary": "System analysis failure.",
            "overall_risk_score": 0.0
        }
