from django.db import models

class AnalysisJobStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    DOWNLOADING = 'DOWNLOADING', 'Downloading'
    PROCESSING = 'PROCESSING', 'Processing'
    ANALYZING = 'ANALYZING', 'Analyzing'
    GENERATING_REPORT = 'GENERATING_REPORT', 'Generating Report'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'

class AnalysisType(models.TextChoices):
    TEXT = 'TEXT', 'Text Analysis'
    AUDIO = 'AUDIO', 'Audio Analysis'
    FRAME = 'FRAME', 'Frame Analysis'
    FULL = 'FULL', 'Full Analysis'

class IngestionSource(models.TextChoices):
    URL    = 'URL',    'Instagram / URL'
    UPLOAD = 'UPLOAD', 'Local Upload'

class MediaAssetType(models.TextChoices):
    VIDEO = 'VIDEO', 'Video'
    AUDIO = 'AUDIO', 'Audio'
    FRAME_DIRECTORY = 'FRAME_DIRECTORY', 'Frame Directory'
    IMAGE = 'IMAGE', 'Image'

class ClaimSource(models.TextChoices):
    OCR = 'OCR', 'OCR'
    TRANSCRIPT = 'TRANSCRIPT', 'Transcript'
    VISUAL = 'VISUAL', 'Visual'

class ClaimClassification(models.TextChoices):
    VERIFIED_LIKELY_TRUE = 'VERIFIED_LIKELY_TRUE', 'Verified / Likely True'
    PLAUSIBLE = 'PLAUSIBLE', 'Plausible'
    UNVERIFIED = 'UNVERIFIED', 'Unverified'
    OPINION_OR_SATIRE = 'OPINION_OR_SATIRE', 'Opinion or Satire'
    MISLEADING_CONTEXT = 'MISLEADING_CONTEXT', 'Misleading Context'
    LIKELY_FALSE = 'LIKELY_FALSE', 'Likely False'
    HIGH_RISK = 'HIGH_RISK', 'High Risk'

class AnalysisReport(models.Model):
    """
    Stores the complete structured analysis output.
    """
    report_data = models.JSONField(
        default=dict, 
        help_text="The complete structured JSON report output."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report {self.id}"

class AnalysisJob(models.Model):
    """
    The root entity of the Eden system. Tracks the entire lifecycle of an analysis request.
    """
    # nullable — upload jobs have no URL
    instagram_url = models.URLField(max_length=1024, blank=True, null=True,
                                    help_text="The URL of the Instagram content to analyze.")
    original_filename = models.CharField(max_length=255, blank=True,
                                         help_text="Original filename for upload jobs.")
    ingestion_source = models.CharField(max_length=10, choices=IngestionSource.choices,
                                        default=IngestionSource.URL)
    analysis_type = models.CharField(max_length=20, choices=AnalysisType.choices, default=AnalysisType.FULL)
    status = models.CharField(max_length=20, choices=AnalysisJobStatus.choices, default=AnalysisJobStatus.PENDING)
    processing_phase = models.TextField(blank=True, help_text="Human-readable status updates.")
    
    # Using a nullable ForeignKey or OneToOneField for the report as defined in architecture document
    report = models.OneToOneField(
        AnalysisReport, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='job',
        help_text="Associated report generated when job reaches GENERATING_REPORT phase."
    )
    
    error_message = models.TextField(blank=True, help_text="Error details if the job fails.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Job {self.id} - {self.get_status_display()}"


class MediaAsset(models.Model):
    """
    Stores metadata about media artifacts produced during the ingestion and processing phases.
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='media_assets')
    asset_type = models.CharField(max_length=20, choices=MediaAssetType.choices)
    file_path = models.CharField(max_length=1024, help_text="File path on the local filesystem or storage backend.")
    file_size = models.BigIntegerField(null=True, blank=True, help_text="File size in bytes.")
    processing_status = models.CharField(max_length=50, blank=True, help_text="Status indicating processing state, e.g. NO_AUDIO_FOUND")
    metadata = models.JSONField(default=dict, blank=True, help_text="Relevant metadata extracted during processing (e.g. video duration, frame count).")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Asset {self.id} ({self.asset_type}) for Job {self.job.id}"


class ClaimRecord(models.Model):
    """
    Stores individual claims detected in the content with their classifications and confidence scores.
    """
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='claims')
    claim_text = models.TextField(help_text="The factual assertion detected.")
    detection_source = models.CharField(max_length=20, choices=ClaimSource.choices)
    classification_label = models.CharField(max_length=30, choices=ClaimClassification.choices)
    confidence_score = models.FloatField(help_text="Confidence score of the classification (0.0 to 1.0).")
    contextual_reasoning = models.TextField(help_text="Summary of the contextual reasoning leading to this classification.")
    
    # Evidence chain references
    transcript_reference = models.TextField(blank=True, help_text="Snippet or timestamp from the audio transcript.")
    ocr_reference = models.TextField(blank=True, help_text="Snippet or block from the on-screen OCR text.")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['classification_label']),
            models.Index(fields=['detection_source']),
        ]

    def __str__(self):
        return f"Claim {self.id} ({self.classification_label}) - Job {self.job.id}"
