from rest_framework import serializers
from core_app.models import AnalysisJob, AnalysisReport, ClaimRecord, MediaAsset

class ClaimRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimRecord
        fields = ['id', 'claim_text', 'detection_source', 'classification_label', 'confidence_score', 'contextual_reasoning', 'created_at']

class MediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = ['id', 'asset_type', 'metadata', 'created_at']

class AnalysisReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisReport
        fields = ['id', 'report_data', 'created_at']

class AnalysisJobSerializer(serializers.ModelSerializer):
    report = AnalysisReportSerializer(read_only=True)
    claims = ClaimRecordSerializer(many=True, read_only=True)
    media_assets = MediaAssetSerializer(many=True, read_only=True)

    class Meta:
        model = AnalysisJob
        fields = ['id', 'instagram_url', 'analysis_type', 'status', 'processing_phase', 'error_message', 'created_at', 'updated_at', 'report', 'claims', 'media_assets']
        read_only_fields = ['status', 'processing_phase', 'error_message', 'report', 'claims', 'media_assets']

class CreateAnalysisJobSerializer(serializers.Serializer):
    instagram_url = serializers.URLField()
