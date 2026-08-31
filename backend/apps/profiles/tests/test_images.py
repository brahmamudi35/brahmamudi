from io import BytesIO

from django.test import SimpleTestCase
from PIL import Image

from apps.profiles.images import downscale, needs_downscale


def _img(w, h, mode="RGB", fmt="PNG"):
    buf = BytesIO()
    Image.new(mode, (w, h), "red" if mode != "RGBA" else (255, 0, 0, 128)).save(buf, format=fmt)
    buf.seek(0)
    return buf


class DownscaleTests(SimpleTestCase):
    def test_large_image_is_capped_and_jpeg(self):
        out = downscale(_img(4000, 3000), max_side=1600)
        with Image.open(out) as im:
            self.assertEqual(im.format, "JPEG")
            self.assertLessEqual(max(im.size), 1600)
            self.assertEqual(im.size, (1600, 1200))

    def test_small_png_is_still_reencoded_to_jpeg(self):
        out = downscale(_img(300, 400), max_side=1600)
        with Image.open(out) as im:
            self.assertEqual(im.format, "JPEG")
            self.assertEqual(im.size, (300, 400))
        self.assertTrue(out.name.endswith(".jpg"))

    def test_rgba_is_flattened(self):
        out = downscale(_img(200, 200, mode="RGBA"), max_side=1600)
        with Image.open(out) as im:
            self.assertEqual(im.mode, "RGB")

    def test_needs_downscale(self):
        self.assertTrue(needs_downscale(_img(2000, 500), max_side=1600))   # too wide
        self.assertTrue(needs_downscale(_img(100, 100, fmt="PNG"), max_side=1600))  # not jpeg
        self.assertFalse(needs_downscale(_img(800, 600, fmt="JPEG"), max_side=1600))
