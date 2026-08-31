import csv
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

DUMP = Path(__file__).resolve().parents[4] / "brahmamu_vbss.sql.gz"


class LegacyPhotoReportTests(TestCase):
    """The --report mode must work without the image files or a --source dir."""

    def test_report_lists_needed_photo_files(self):
        if not DUMP.exists():
            self.skipTest("legacy dump not present")
        out = Path(self._get_tmp())
        buf = StringIO()
        call_command("import_legacy_photos", report=str(out), stdout=buf)

        self.assertIn("photo files needed", buf.getvalue())
        rows = list(csv.DictReader(out.read_text(encoding="utf-8").splitlines()))
        self.assertGreater(len(rows), 500)
        self.assertEqual(
            set(rows[0]),
            {"filename", "slot", "legacy_rid", "regno", "name", "email", "in_db"},
        )
        self.assertTrue(all(r["slot"] in ("photo1", "photo2") for r in rows))
        # filenames are unique across the report
        self.assertEqual(len({r["filename"] for r in rows}), len(rows))

    def test_source_required_when_not_reporting(self):
        with self.assertRaises(Exception):
            call_command("import_legacy_photos", stdout=StringIO())

    def _get_tmp(self) -> str:
        import tempfile

        fd, name = tempfile.mkstemp(suffix=".csv")
        import os

        os.close(fd)
        self.addCleanup(lambda: os.path.exists(name) and os.unlink(name))
        return name
