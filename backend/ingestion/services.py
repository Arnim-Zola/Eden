import os
import requests
from django.conf import settings
from playwright.sync_api import sync_playwright

class InstagramIngestionException(Exception):
    pass

class InstagramIngestionService:
    def __init__(self, job_id: int):
        self.job_id = job_id
        self.download_dir = os.path.join(settings.BASE_DIR.parent, 'media', str(job_id))
        if os.path.exists(self.download_dir):
            import shutil
            try:
                shutil.rmtree(self.download_dir)
            except Exception:
                pass
        os.makedirs(self.download_dir, exist_ok=True)
    
    def download_media(self, url: str) -> dict:
        """
        Uses yt-dlp to extract metadata and download the media (handling DASH merging).
        """
        import subprocess
        import json
        
        print("!!! USING NEW YT-DLP INGESTION PIPELINE !!!")
        print(f"!!! Starting ingestion for URL: {url} !!!")
        
        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        output_template = os.path.join(self.download_dir, 'source_media.mp4')
        cookies_path = os.path.join(settings.BASE_DIR, 'config', 'cookies.txt')
        
        cookie_args = []
        if os.path.exists(cookies_path) and os.path.getsize(cookies_path) > 100:
            print("!!! USING COOKIES.TXT FOR AUTHENTICATED INGESTION !!!")
            cookie_args = ['--cookies', cookies_path]
        else:
            print("!!! WARNING: cookies.txt not found or empty. Attempting anonymous ingestion. Instagram may block this request. !!!")

        # 1. Extract metadata first
        dump_command = [
            'yt-dlp', 
            '--user-agent', user_agent,
        ] + cookie_args + [
            '--no-playlist',
            '--dump-json',
            '--quiet', '--no-warnings',
            url
        ]

        try:
            res = subprocess.run(dump_command, check=True, capture_output=True, text=True)
            info_dict = json.loads(res.stdout)
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else "Unknown yt-dlp error"
            print(f"!!! YT-DLP METADATA EXTRACTION FAILED !!!\n!!! STDERR: {error_msg} !!!")
            
            error_lower = error_msg.lower()
            if "login required" in error_lower or "rate-limit" in error_lower:
                raise InstagramIngestionException("RATE_LIMIT_OR_LOGIN: Instagram blocked access. Rate limit reached or login required.")
            elif "private" in error_lower:
                raise InstagramIngestionException("PRIVATE_CONTENT: This post is private and cannot be accessed.")
            elif "deleted" in error_lower or "not found" in error_lower or "not available" in error_lower:
                raise InstagramIngestionException("CONTENT_NOT_FOUND: The post may have been deleted or does not exist.")
            else:
                raise InstagramIngestionException(f"METADATA_EXTRACTION_FAILED: {error_msg}")
        except json.JSONDecodeError:
            raise InstagramIngestionException("METADATA_PARSE_FAILED: Failed to parse yt-dlp JSON output.")

        # 2. Download the media
        download_command = [
            'yt-dlp',
            '--user-agent', user_agent,
        ] + cookie_args + [
            '-o', output_template,
            '--no-playlist',
            '--no-warnings',
            url
        ]

        try:
            print(f"!!! EXECUTING YT-DLP COMMAND: {' '.join(download_command)}")
            res = subprocess.run(download_command, check=True, capture_output=True, text=True)
            print("!!! YT-DLP DOWNLOAD COMPLETED SUCCESSFULLY !!!")
            if res.stdout:
                print(f"!!! YT-DLP OUTPUT: {res.stdout[:500]}")
        except subprocess.CalledProcessError as e:
            # Fallback for images or if DASH format fails
            fallback_command = [
                'yt-dlp',
                '--user-agent', user_agent,
            ] + cookie_args + [
                '-o', output_template,
                '--no-playlist',
                '--no-warnings',
                url
            ]
            try:
                subprocess.run(fallback_command, check=True, capture_output=True)
            except Exception as e2:
                raise InstagramIngestionException(f"yt-dlp failed to download media: {str(e2)}")

        # 2. Identify the downloaded file
        downloaded_files = os.listdir(self.download_dir)
        source_files = [f for f in downloaded_files if f.startswith('source_media')]
        
        if not source_files:
            raise InstagramIngestionException("yt-dlp completed but no source_media file was found.")
            
        source_files.sort(key=lambda x: 0 if x.endswith('.mp4') else 1)
        file_name = source_files[0]
        local_path = os.path.join(self.download_dir, file_name)
        
        is_video = local_path.endswith('.mp4')
        file_size = os.path.getsize(local_path)
        print(f"!!! FINAL INGESTED FILE: {local_path} (Size: {file_size} bytes, Video: {is_video}) !!!")
        page_title = info_dict.get('title') or info_dict.get('description', 'Instagram Post')[:50]

        return {
            'local_path': local_path,
            'file_size': file_size,
            'is_video': is_video,
            'metadata': {
                'page_title': page_title,
                'source_url': url,
                'uploader': info_dict.get('uploader'),
                'upload_date': info_dict.get('upload_date'),
                'view_count': info_dict.get('view_count'),
                'like_count': info_dict.get('like_count')
            }
        }
