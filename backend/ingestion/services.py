"""
ingestion/services.py — Mode-aware media acquisition.

Architecture principle:
  Instagram URL → download actual media locally → local AI processing
  Metadata is optional enrichment only, never a hard dependency.

TEXT mode:   yt-dlp (best) for video/reel  OR  yt-dlp thumbnail for image post
AUDIO mode:  yt-dlp (bestaudio/best)
"""
import os
from pathlib import Path
from django.conf import settings
from ingestion.cache import MediaCache

VIDEO_EXTENSIONS     = {'.mp4', '.mkv', '.mov', '.avi', '.flv', '.ts', '.m4v'}
AUDIO_ONLY_EXTENSIONS = {'.mp3', '.m4a', '.aac', '.opus', '.ogg', '.flac', '.weba'}


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

    # ─────────────────────────────────────────────────────────────────────────

    def download_media(self, url: str, mode: str = 'text') -> dict:
        """
        Mode-aware yt-dlp media download.

        mode='text'  → best video/image (for OCR pipeline)
        mode='audio' → bestaudio (for Whisper pipeline)

        Image posts:
          yt-dlp thumbnail download via --ignore-no-formats-error --write-thumbnail
          No HTML scraping. No og:image. Media acquisition only.

        Returns dict: local_path, file_size, is_video, is_audio, is_image, metadata
        """
        import subprocess
        import json

        print(f"!!! MODE-AWARE INGESTION (mode={mode}) url={url} !!!")

        # ── Cache check ───────────────────────────────────────────────────────
        cache = None
        if getattr(settings, 'MEDIA_CACHE_ENABLED', True):
            cache = MediaCache(
                Path(settings.MEDIA_ROOT) / 'cache',
                ttl_days=getattr(settings, 'MEDIA_CACHE_TTL_DAYS', 0),
            )
            cached = cache.get_media_path(url)
            if cached:
                ext = cached.suffix.lower()
                dest = Path(self.download_dir) / f'source_media{ext}'
                try:
                    os.link(cached, dest)
                except OSError:
                    import shutil
                    shutil.copy2(cached, dest)
                cache.record_hit(url)
                print(f"!!! CACHE HIT: {cached} !!!")

                is_video = ext in VIDEO_EXTENSIONS
                is_audio = ext in AUDIO_ONLY_EXTENSIONS
                is_image = not is_video and not is_audio

                # --- MODE GUARD (Cache Hit) ---
                if mode == 'audio' and is_image:
                     raise InstagramIngestionException(
                        "MODE_MISMATCH: AUDIO mode was selected but this post is cached as an image. "
                        "Switch to TEXT mode to analyze image-based content."
                     )

                return self._result(str(dest), is_video, is_audio, is_image,
                                    {'page_title': 'Cached Media', 'source_url': url,
                                     'uploader': None, 'upload_date': None,
                                     'view_count': None, 'like_count': None})
        # ─────────────────────────────────────────────────────────────────────

        user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        cookies_path = os.path.join(settings.BASE_DIR, 'config', 'cookies.txt')

        if not (os.path.exists(cookies_path) and os.path.getsize(cookies_path) > 200):
            raise InstagramIngestionException(
                "COOKIES_REQUIRED: cookies.txt missing or empty. "
                "Export Instagram session cookies and save to backend/config/cookies.txt."
            )

        cookie_args = ['--cookies', cookies_path]
        base_args = [
            'yt-dlp', '--config-location', 'NUL',
            '--no-cookies-from-browser', '--user-agent', user_agent,
        ] + cookie_args

        output_template = os.path.join(self.download_dir, 'source_media.%(ext)s')

        # ── Step 1: metadata (optional enrichment only) ───────────────────────
        metadata = self._extract_metadata(base_args, url)
        # ─────────────────────────────────────────────────────────────────────

        # ── Step 2: download actual media ─────────────────────────────────────
        if mode == 'audio':
            local_path = self._download_audio(base_args, output_template, url)
        else:
            local_path = self._download_text_mode(base_args, output_template, url)
        # ─────────────────────────────────────────────────────────────────────

        # ── Classify the downloaded file ──────────────────────────────────────
        ext = Path(local_path).suffix.lower()
        is_video = ext in VIDEO_EXTENSIONS
        is_audio = ext in AUDIO_ONLY_EXTENSIONS
        is_image = not is_video and not is_audio

        file_size = os.path.getsize(local_path)
        print(f"!!! INGESTED: {local_path} ({file_size:,}B v={is_video} a={is_audio} i={is_image}) !!!")

        # ── Cache store (all media) ───────────────────────────────────────────
        if cache:
            try:
                cache.store_media(url, Path(local_path))
            except Exception as ce:
                print(f"!!! CACHE STORE FAILED (non-fatal): {ce} !!!")
        # ─────────────────────────────────────────────────────────────────────

        return self._result(local_path, is_video, is_audio, is_image, metadata)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _result(self, local_path, is_video, is_audio, is_image, metadata):
        return {
            'local_path': local_path,
            'file_size': os.path.getsize(local_path),
            'is_video': is_video,
            'is_audio': is_audio,
            'is_image': is_image,
            'metadata': metadata,
        }

    def _extract_metadata(self, base_args: list, url: str) -> dict:
        """
        Optional metadata extraction via yt-dlp --dump-json.
        Returns stub dict on any failure — metadata is never a hard dependency.
        """
        import subprocess, json
        stub = {
            'page_title': 'Instagram Post', 'source_url': url,
            'uploader': None, 'upload_date': None,
            'view_count': None, 'like_count': None,
        }
        try:
            res = subprocess.run(
                base_args + ['--no-playlist', '--dump-json', '--quiet', '--no-warnings', url],
                check=True, capture_output=True, text=True, timeout=30,
            )
            info = json.loads(res.stdout)
            title = info.get('title') or info.get('description', 'Instagram Post')[:50]
            return {
                'page_title': title, 'source_url': url,
                'uploader': info.get('uploader'),
                'upload_date': info.get('upload_date'),
                'view_count': info.get('view_count'),
                'like_count': info.get('like_count'),
            }
        except Exception as e:
            print(f"!!! METADATA EXTRACTION FAILED (non-fatal, using stub): {e} !!!")
            return stub

    def _download_audio(self, base_args: list, output_template: str, url: str) -> str:
        """
        AUDIO mode: download best combined stream (video+audio) if available,
        to ensure we have a media preview for reels/videos.
        """
        import subprocess
        # [DIAGNOSTIC] Verification of updated ingestion logic
        print(f"!!! INGESTION_DEBUG: downloading combined media for AUDIO mode !!!")
        
        # Proven format string that works for Instagram reels to get both video and audio
        cmd = base_args + [
            '--format', 'bestvideo+bestaudio/best',
            '-o', output_template,
            '--no-playlist', '--no-warnings', url,
        ]
        print(f"!!! AUDIO+VIDEO DOWNLOAD: {' '.join(cmd[-5:])} !!!")
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=300)
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else str(e)
            if 'no video formats found' in error_msg.lower():
                raise InstagramIngestionException(
                    "MODE_MISMATCH: AUDIO mode was selected but this post contains only images. "
                    "Switch to TEXT mode."
                )
            raise InstagramIngestionException(f"yt-dlp audio download failed: {error_msg}")
        return self._find_downloaded_file()

    def _download_text_mode(self, base_args: list, output_template: str, url: str) -> str:
        """
        TEXT mode: try yt-dlp (best) first for video/reel.
        On 'No video formats found', fall back to yt-dlp thumbnail download for image posts.
        No HTML scraping. Media acquisition only.
        """
        import subprocess

        # Attempt 1: normal yt-dlp download (works for reels/videos)
        cmd = base_args + [
            '-o', output_template,
            '--no-playlist', '--no-warnings', url,
        ]
        print(f"!!! TEXT DOWNLOAD (attempt 1 — no format restriction) !!!")
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=300)
            return self._find_downloaded_file()
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else str(e)
            error_lower = error_msg.lower()

            # Distinguish image posts from real failures
            if 'no video formats found' not in error_lower:
                self._raise_from_ytdlp_error(error_lower, error_msg)

            print("!!! IMAGE POST DETECTED (no video formats) — switching to instaloader !!!")

        # Attempt 2: instaloader — purpose-built Instagram downloader
        # Handles image posts, carousels, reels via Instagram's own API.
        # yt-dlp cannot extract image posts at all.
        return self._download_image_via_instaloader(url)

    def _download_image_via_instaloader(self, url: str) -> str:
        """
        Downloads an Instagram image post using instaloader (already in venv).
        Uses the cookies.txt session to authenticate.
        Downloads to self.download_dir and returns the local file path.
        """
        import re
        import shutil
        import instaloader

        # Extract shortcode from URL  e.g. /p/DYFFAXvn2ot/
        m = re.search(r'/p/([A-Za-z0-9_-]+)', url)
        if not m:
            raise InstagramIngestionException(
                f"IMAGE_POST_DOWNLOAD_FAILED: Could not extract shortcode from URL: {url}"
            )
        shortcode = m.group(1)
        print(f"!!! INSTALOADER: shortcode={shortcode} !!!")

        L = instaloader.Instaloader(
            dirname_pattern=self.download_dir,
            filename_pattern='{shortcode}',
            download_videos=True,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            quiet=True,
        )

        # Load session from cookies.txt (Netscape format)
        cookies_path = os.path.join(
            settings.BASE_DIR, 'config', 'cookies.txt'
        )
        try:
            import http.cookiejar
            cj = http.cookiejar.MozillaCookieJar(cookies_path)
            cj.load(ignore_discard=True, ignore_expires=True)
            # Inject cookies into instaloader's requests session
            for cookie in cj:
                L.context._session.cookies.set(
                    cookie.name, cookie.value,
                    domain=cookie.domain, path=cookie.path,
                )
            print("!!! INSTALOADER: cookies loaded !!!")
        except Exception as ce:
            print(f"!!! INSTALOADER: cookie load failed (non-fatal): {ce} !!!")

        try:
            post = instaloader.Post.from_shortcode(L.context, shortcode)
            L.download_post(post, target=self.download_dir)
            print("!!! INSTALOADER: download complete !!!")
        except instaloader.exceptions.InstaloaderException as e:
            raise InstagramIngestionException(
                f"IMAGE_POST_DOWNLOAD_FAILED: instaloader error: {str(e)}"
            )
        except Exception as e:
            raise InstagramIngestionException(
                f"IMAGE_POST_DOWNLOAD_FAILED: unexpected error: {str(e)}"
            )

        # Find downloaded image (instaloader saves as {shortcode}.jpg or similar)
        # Rename first found image to source_media.jpg for consistent pipeline naming
        image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.mp4'}
        all_files = os.listdir(self.download_dir)
        image_files = [
            f for f in all_files
            if Path(f).suffix.lower() in image_extensions
            and not f.startswith('source_media')
        ]

        if not image_files:
            raise InstagramIngestionException(
                "IMAGE_POST_DOWNLOAD_FAILED: instaloader ran but no image file was found."
            )

        # Pick the largest file (best quality)
        image_files.sort(
            key=lambda f: os.path.getsize(os.path.join(self.download_dir, f)),
            reverse=True
        )
        best = image_files[0]
        ext = Path(best).suffix.lower()
        dest = os.path.join(self.download_dir, f'source_media{ext}')
        shutil.move(os.path.join(self.download_dir, best), dest)
        print(f"!!! INSTALOADER: saved as {dest} !!!")
        return dest


    def _find_downloaded_file(self, extensions=None) -> str:
        """
        Locate the file yt-dlp wrote to self.download_dir.
        Preference order: video > audio > image (for TEXT mode sorting).
        """
        files = os.listdir(self.download_dir)
        if extensions:
            candidates = [f for f in files if Path(f).suffix.lower() in extensions]
        else:
            candidates = [f for f in files if f.startswith('source_media')]

        if not candidates:
            raise InstagramIngestionException(
                "yt-dlp completed but no media file was found in the download directory."
            )

        def _sort(name):
            ext = Path(name).suffix.lower()
            if ext in VIDEO_EXTENSIONS:
                return 0
            if ext in AUDIO_ONLY_EXTENSIONS:
                return 1
            return 2

        candidates.sort(key=_sort)
        return os.path.join(self.download_dir, candidates[0])

    @staticmethod
    def _raise_from_ytdlp_error(error_lower: str, error_msg: str):
        if 'login required' in error_lower or 'rate-limit' in error_lower:
            raise InstagramIngestionException(
                "RATE_LIMIT_OR_LOGIN: Instagram blocked access. Rate limit or login required."
            )
        if 'private' in error_lower:
            raise InstagramIngestionException(
                "PRIVATE_CONTENT: This post is private and cannot be accessed."
            )
        if 'deleted' in error_lower or 'not found' in error_lower or 'not available' in error_lower:
            raise InstagramIngestionException(
                "CONTENT_NOT_FOUND: Post may have been deleted or does not exist."
            )
        raise InstagramIngestionException(f"DOWNLOAD_FAILED: {error_msg}")
