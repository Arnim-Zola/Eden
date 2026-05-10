"""
Management command: cache_status

Usage:
    python manage.py cache_status           # show all cache entries
    python manage.py cache_status --clear   # delete all entries
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path
from ingestion.cache import MediaCache


def _human(b):
    for unit in ('B', 'KB', 'MB', 'GB'):
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} TB"


class Command(BaseCommand):
    help = "Inspect or clear the Eden media cache."

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all cached entries (frees disk space).',
        )

    def handle(self, *args, **options):
        cache_root = Path(settings.MEDIA_ROOT) / 'cache'
        cache = MediaCache(cache_root)

        if options['clear']:
            entries = cache.all_entries()
            total = sum(e['size_bytes'] for e in entries)
            cache.clear()
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Cleared {len(entries)} cache entries ({_human(total)} freed)."
                )
            )
            return

        entries = cache.all_entries()
        if not entries:
            self.stdout.write(self.style.WARNING(
                f"Media cache is empty.  ({cache_root})"
            ))
            return

        total_size = sum(e['size_bytes'] for e in entries)

        self.stdout.write(
            f"\nMedia cache: {cache_root}   "
            f"({len(entries)} {'entry' if len(entries) == 1 else 'entries'}, "
            f"{_human(total_size)} total)\n"
        )

        col_w = 14
        self.stdout.write(
            f"  {'Key':<{col_w}}  {'Cached':<14}  {'Hits':>4}  {'Size':>8}  Artifacts"
        )
        self.stdout.write("  " + "─" * 70)

        from datetime import datetime, timezone

        for e in entries:
            key = e['key'][:col_w]
            size = _human(e['size_bytes'])
            hits = str(e['hit_count'])

            # Pretty-print age
            if e['cached_at']:
                try:
                    dt = datetime.fromisoformat(e['cached_at'])
                    delta = datetime.now(timezone.utc) - dt
                    hours = int(delta.total_seconds() // 3600)
                    if hours < 1:
                        age = "< 1h ago"
                    elif hours < 24:
                        age = f"{hours}h ago"
                    else:
                        age = f"{hours // 24}d ago"
                except Exception:
                    age = e['cached_at'][:10]
            else:
                age = "unknown"

            artifacts = "  ".join(filter(None, [
                "MP4✓"  if e['has_mp4']        else "MP4✗",
                "aud✓"  if e['has_audio']       else None,
                "txt✓"  if e['has_transcript']  else None,
                "frm✓"  if e['has_frames']      else None,
                "ocr✓"  if e['has_ocr']         else None,
            ]))

            self.stdout.write(
                f"  {key:<{col_w}}  {age:<14}  {hits:>4}  {size:>8}  {artifacts}"
            )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Run with --clear to free {_human(total_size)}."
            )
        )
