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
        os.makedirs(self.download_dir, exist_ok=True)
    
    def download_media(self, url: str) -> dict:
        """
        Navigates to the Instagram URL and intercepts network requests to find the media CDN link.
        Downloads the media and returns metadata and local file path.
        """
        video_url = None
        image_url = None
        
        def handle_response(response):
            nonlocal video_url, image_url
            response_url = response.url
            # Ignore tiny assets
            if not video_url:
                content_type = response.headers.get('content-type', '')
                if 'video' in content_type or '.mp4' in response_url:
                    video_url = response_url
            if not image_url:
                content_length = int(response.headers.get('content-length', 0))
                # Heuristic: the main post image is typically reasonably large
                if content_length > 50000 and ('jpg' in response_url or 'webp' in response_url):
                    image_url = response_url

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800}
            )
            page = context.new_page()
            
            page.on("response", handle_response)
            
            try:
                # We don't wait for networkidle because Instagram polls constantly
                page.goto(url, wait_until='domcontentloaded', timeout=15000)
                
                # Wait up to 10 seconds for the media url to be intercepted
                for _ in range(20):
                    if video_url:
                        break
                    page.wait_for_timeout(500)
            except Exception as e:
                # If it times out but we found media, that's fine
                if not video_url and not image_url:
                    browser.close()
                    raise InstagramIngestionException(f"Failed to load Instagram page: {str(e)}")

            page_title = ""
            try:
                page_title = page.title()
            except:
                pass
                
            browser.close()

        media_url_to_download = video_url or image_url
        if not media_url_to_download:
            raise InstagramIngestionException("No media URL could be intercepted. The account might be private or the post deleted.")
            
        is_video = bool(video_url)
        file_extension = ".mp4" if is_video else ".jpg"
        file_name = f"source_media{file_extension}"
        local_path = os.path.join(self.download_dir, file_name)
        
        # Download the actual file from the intercepted CDN link
        try:
            r = requests.get(media_url_to_download, stream=True, timeout=20)
            r.raise_for_status()
            with open(local_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        except Exception as e:
            raise InstagramIngestionException(f"Failed to download media file from CDN: {str(e)}")
            
        file_size = os.path.getsize(local_path)
            
        return {
            'local_path': local_path,
            'file_size': file_size,
            'is_video': is_video,
            'metadata': {
                'page_title': page_title,
                'source_url': url
            }
        }
