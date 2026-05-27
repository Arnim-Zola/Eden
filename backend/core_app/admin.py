from django.contrib import admin
from .models import AnalysisReport, AnalysisJob, MediaAsset, ClaimRecord

@admin.register(AnalysisReport)
class AnalysisReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'updated_at')
    search_fields = ('id',)

@admin.register(AnalysisJob)
class AnalysisJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'ingestion_source', 'analysis_type', 'status', 'created_at')
    list_filter = ('status', 'ingestion_source', 'analysis_type')
    search_fields = ('id', 'instagram_url', 'original_filename', 'error_message')

@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'asset_type', 'file_path', 'file_size', 'processing_status')
    list_filter = ('asset_type', 'processing_status')
    search_fields = ('id', 'file_path')

@admin.register(ClaimRecord)
class ClaimRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'claim_text', 'detection_source', 'classification_label', 'confidence_score')
    list_filter = ('detection_source', 'classification_label')
    search_fields = ('claim_text', 'contextual_reasoning')

