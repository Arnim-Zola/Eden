from django.apps import AppConfig


class CoreAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core_app'

    def ready(self):
        import os
        import logging
        import sys
        from django.conf import settings
        
        logger = logging.getLogger(__name__)
        cookies_path = os.path.join(settings.BASE_DIR, 'config', 'cookies.txt')
        
        # Check if we are running the actual server or celery, not just a management command like makemigrations
        is_server = os.environ.get('RUN_MAIN') == 'true'
        is_celery = 'celery' in sys.argv[0] or (len(sys.argv) > 1 and sys.argv[1] == 'worker')
        
        if is_server or is_celery:
            if os.path.exists(cookies_path) and os.path.getsize(cookies_path) > 100:
                logger.info("[OK] Authenticated ingestion ENABLED: cookies.txt found.")
                print("\n[OK] Authenticated ingestion ENABLED: cookies.txt found.\n")
            else:
                logger.warning("[WARN] Authenticated ingestion DISABLED: backend/config/cookies.txt is missing or empty.")
                print("\n[WARN] Authenticated ingestion DISABLED: backend/config/cookies.txt is missing or empty. Anonymous fallback active.\n")
