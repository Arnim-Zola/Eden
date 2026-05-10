"""
ingestion/cache.py — Eden Media Cache Layer

Filesystem-based cache keyed on Instagram shortcode or URL hash.
Zero external dependencies — pure pathlib + json + shutil.

Directory layout:
    media/cache/{key}/
        source_media.mp4
        audio.wav
        transcript.json
        ocr.json
        frames/
            frame_001.jpg …
        cache_meta.json   { url, cached_at, hit_count }
"""

import os
import re
import json
import shutil
import hashlib
import logging
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

ARTIFACT_FILENAMES = {
    'audio':      'audio.wav',
    'transcript': 'transcript.json',
    'ocr':        'ocr.json',
    'frames':     'frames',          # directory
}


def _cache_key(url: str) -> str:
    """
    Derive a stable cache key from a media URL.
    Instagram shortcode  →  e.g. "C6Z7o2Lix9W"
    Anything else        →  first 16 chars of SHA-256
    """
    m = re.search(r'/(?:p|reel|tv)/([A-Za-z0-9_-]+)', url)
    if m:
        return m.group(1)
    return hashlib.sha256(url.strip().lower().encode()).hexdigest()[:16]


class MediaCache:
    def __init__(self, cache_root: Path, ttl_days: int = 0):
        """
        cache_root  — Path to the cache directory (settings.MEDIA_ROOT / 'cache')
        ttl_days    — 0 means never expire (ideal for dev)
        """
        self.root = Path(cache_root)
        self.ttl_days = ttl_days
        self.root.mkdir(parents=True, exist_ok=True)

    # ─── Internal helpers ─────────────────────────────────────────────────────

    def _entry_dir(self, url: str) -> Path:
        return self.root / _cache_key(url)

    def _meta_path(self, url: str) -> Path:
        return self._entry_dir(url) / 'cache_meta.json'

    def _read_meta(self, url: str) -> dict | None:
        p = self._meta_path(url)
        if not p.exists():
            return None
        try:
            return json.loads(p.read_text())
        except Exception:
            return None

    def _write_meta(self, url: str, meta: dict):
        self._meta_path(url).write_text(json.dumps(meta, indent=2))

    # ─── Public API ───────────────────────────────────────────────────────────

    def is_valid(self, url: str) -> bool:
        """True if a cache entry exists and hasn't exceeded TTL."""
        meta = self._read_meta(url)
        if not meta:
            return False
        if self.ttl_days == 0:
            return True
        cached_at = datetime.fromisoformat(meta['cached_at'])
        age_days = (datetime.now(timezone.utc) - cached_at).days
        return age_days < self.ttl_days

    def get_media_path(self, url: str) -> Path | None:
        """Return path to cached source media (any extension), or None."""
        if not self.is_valid(url):
            return None
        # Look for any file starting with source_media
        entry_dir = self._entry_dir(url)
        matches = list(entry_dir.glob('source_media.*'))
        return matches[0] if matches else None

    def get_artifact(self, url: str, artifact: str) -> Path | None:
        """Return path to a cached artifact (audio/transcript/ocr/frames), or None."""
        if not self.is_valid(url):
            return None
        filename = ARTIFACT_FILENAMES.get(artifact)
        if not filename:
            return None
        p = self._entry_dir(url) / filename
        return p if p.exists() else None

    def store_media(self, url: str, src_path: Path) -> Path:
        """
        Copy (or hardlink) a media file into the cache.
        Preserves the source extension.
        Returns the cache path.
        """
        entry = self._entry_dir(url)
        entry.mkdir(parents=True, exist_ok=True)

        ext = src_path.suffix.lower()
        dst = entry / f'source_media{ext}'

        if not dst.exists():
            try:
                os.link(src_path, dst)          # instant if same drive
            except OSError:
                shutil.copy2(src_path, dst)     # fallback cross-drive copy

        # Create / update meta
        meta = self._read_meta(url) or {
            'url': url,
            'cached_at': datetime.now(timezone.utc).isoformat(),
            'hit_count': 0,
        }
        self._write_meta(url, meta)
        logger.info(f"[MediaCache] Stored media for key={_cache_key(url)}")
        return dst

    def store_artifact(self, url: str, artifact: str, src: Path) -> Path:
        """
        Copy an artifact file or directory into the cache entry.
        artifact: 'audio' | 'transcript' | 'ocr' | 'frames'
        src: path to the file or frames directory
        """
        filename = ARTIFACT_FILENAMES.get(artifact)
        if not filename:
            raise ValueError(f"Unknown artifact type: {artifact!r}")

        entry = self._entry_dir(url)
        entry.mkdir(parents=True, exist_ok=True)
        dst = entry / filename

        if artifact == 'frames':
            if not dst.exists():
                shutil.copytree(src, dst)
        else:
            if not dst.exists():
                shutil.copy2(src, dst)

        logger.info(f"[MediaCache] Stored {artifact} for key={_cache_key(url)}")
        return dst

    def record_hit(self, url: str):
        """Increment hit counter in meta."""
        meta = self._read_meta(url)
        if meta:
            meta['hit_count'] = meta.get('hit_count', 0) + 1
            meta['last_hit'] = datetime.now(timezone.utc).isoformat()
            self._write_meta(url, meta)

    # ─── Dev utilities ────────────────────────────────────────────────────────

    def all_entries(self) -> list[dict]:
        """Return summary of all cache entries (for cache_status command)."""
        entries = []
        for d in sorted(self.root.iterdir()):
            if not d.is_dir():
                continue
            meta_p = d / 'cache_meta.json'
            meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
            size = sum(f.stat().st_size for f in d.rglob('*') if f.is_file())
            entries.append({
                'key':        d.name,
                'url':        meta.get('url', ''),
                'cached_at':  meta.get('cached_at', ''),
                'hit_count':  meta.get('hit_count', 0),
                'size_bytes': size,
                'has_media':     any(d.glob('source_media.*')),
                'has_audio':     (d / 'audio.wav').exists(),
                'has_transcript':(d / 'transcript.json').exists(),
                'has_frames':    (d / 'frames').exists(),
                'has_ocr':       (d / 'ocr.json').exists(),
            })
        return entries

    def clear(self):
        """Delete the entire cache. Use with care."""
        shutil.rmtree(self.root, ignore_errors=True)
        self.root.mkdir(parents=True, exist_ok=True)
