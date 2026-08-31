"""Normalise member photos: fix orientation, cap the dimensions, re-encode as
JPEG and drop metadata. Used by the upload API, the legacy importer and the
`downscale_photos` command.
"""

from __future__ import annotations

import io

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image, ImageOps

_MAX_SIDE = getattr(settings, "PROFILE_PHOTO_MAX_SIDE", 1600)
_QUALITY = getattr(settings, "PROFILE_PHOTO_QUALITY", 85)
_MAX_BYTES = getattr(settings, "PROFILE_PHOTO_MAX_BYTES", 900_000)


def _size_bytes(fileobj) -> int:
    try:
        pos = fileobj.tell()
        fileobj.seek(0, 2)
        n = fileobj.tell()
        fileobj.seek(pos)
        return n
    except Exception:  # noqa: BLE001
        return 0


def needs_downscale(fileobj, max_side: int = _MAX_SIDE,
                    max_bytes: int = _MAX_BYTES) -> bool:
    try:
        oversized_file = _size_bytes(fileobj) > max_bytes
        with Image.open(fileobj) as im:
            return oversized_file or max(im.size) > max_side or im.format != "JPEG"
    except Exception:  # noqa: BLE001
        return False
    finally:
        _rewind(fileobj)


def downscale(fileobj, *, max_side: int = _MAX_SIDE, quality: int = _QUALITY,
              name: str = "photo.jpg") -> ContentFile:
    """Return a JPEG ContentFile no larger than ``max_side`` on its longest edge.

    Raises whatever PIL raises for an unreadable image - callers that accept
    untrusted uploads should have validated it first.
    """
    with Image.open(fileobj) as im:
        im = ImageOps.exif_transpose(im)  # bake in rotation, drop EXIF
        if im.mode not in ("RGB", "L"):
            background = Image.new("RGB", im.size, (255, 255, 255))
            im = im.convert("RGBA")
            background.paste(im, mask=im.split()[-1])
            im = background
        elif im.mode == "L":
            im = im.convert("RGB")
        im.thumbnail((max_side, max_side), Image.LANCZOS)

        out = io.BytesIO()
        im.save(out, format="JPEG", quality=quality, optimize=True, progressive=True)

    _rewind(fileobj)
    stem = name.rsplit(".", 1)[0] or "photo"
    return ContentFile(out.getvalue(), name=f"{stem}.jpg")


def _rewind(fileobj) -> None:
    try:
        fileobj.seek(0)
    except Exception:  # noqa: BLE001
        pass
