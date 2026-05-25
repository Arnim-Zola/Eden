from django.contrib import admin
from .models import AnalysisReport, AnalysisJob

@admin.register(AnalysisReport)
class AnalysisReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'updated_at')
    search_fields = ('id',)

@admin.register(AnalysisJob)
class AnalysisJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'ingestion_source', 'analysis_type', 'status', 'created_at')
    list_filter = ('status', 'ingestion_source', 'analysis_type')
    search_fields = ('id', 'instagram_url', 'original_filename', 'error_message')
