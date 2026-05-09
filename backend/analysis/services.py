import os
import json
import logging
from typing import List
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class ClaimModel(BaseModel):
    claim_text: str = Field(description="The factual assertion detected in the content.")
    detection_source: str = Field(description="Source of the claim: OCR, TRANSCRIPT, or VISUAL")
    classification_label: str = Field(description="Classification: VERIFIED_LIKELY_TRUE, PLAUSIBLE, UNVERIFIED, OPINION_OR_SATIRE, MISLEADING_CONTEXT, LIKELY_FALSE, HIGH_RISK")
    confidence_score: float = Field(description="Confidence score between 0.0 and 1.0. Lower scores indicate uncertainty.")
    contextual_reasoning: str = Field(description="Summary of reasoning leading to this classification. Explain why this might be true, false, or uncertain without making absolute truth claims. Be cautious and explain uncertainty if evidence is insufficient.")

class ReportModel(BaseModel):
    claims: List[ClaimModel] = Field(description="List of factual claims extracted and analyzed from the content.")
    summary: str = Field(description="Overall summary of the analysis and the reasoning for the claims.")
    overall_risk_score: float = Field(description="Overall risk score from 0.0 to 1.0")

class GeminiAnalysisService:
    def __init__(self):
        # We'll use the API key from environment, loaded by django settings
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key or api_key == "your-gemini-api-key-here":
            logger.warning("Valid GEMINI_API_KEY is not set. API calls will likely fail.")
        
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.5-flash"

    def analyze_content(self, ocr_text: str, transcript_text: str) -> dict:
        prompt = f"""
        You are an expert fact-checking AI designed to analyze media content for misinformation.
        Your goal is to extract factual claims from the provided text and classify them.
        
        Reasoning Requirements:
        1. Prioritize contextual reasoning over absolute truth claims.
        2. Support uncertainty and insufficient evidence outputs (e.g. use UNVERIFIED if unsure). Do not guess or hallucinate if you don't have enough information.
        3. Avoid overconfident hallucinations.
        4. You do not have live internet access, so evaluate based on general knowledge and internal consistency.
        5. Produce explainable reasoning in the 'contextual_reasoning' field.

        Here is the text extracted from the video frames via OCR:
        <ocr_text>
        {ocr_text}
        </ocr_text>

        Here is the audio transcript:
        <transcript_text>
        {transcript_text}
        </transcript_text>

        Please analyze the claims and provide a structured JSON report matching the specified schema.
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ReportModel,
                    temperature=0.2, # Low temperature for more consistent, analytical responses
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            # Fallback for demo stability
            logger.warning("Using fallback report due to Gemini API failure.")
            return {
                "claims": [
                    {
                        "claim_text": "System encountered an issue analyzing the content.",
                        "detection_source": "SYSTEM",
                        "classification_label": "UNVERIFIED",
                        "confidence_score": 0.0,
                        "contextual_reasoning": f"The analysis service was temporarily unavailable ({str(e)[:50]}...)."
                    }
                ],
                "summary": "We could not complete the automated fact-checking due to an external service error. The extracted texts are still available for manual review.",
                "overall_risk_score": 0.5
            }
