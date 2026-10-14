"""Packaging failure guards, independent of the full glove assets."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('package_base44', pathlib.Path(__file__).with_name('build-base44.py'))
build = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(build)


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.source = self.root / 'source'
        self.output = self.root / 'output'
        self.manifest = self.root / 'manifest.json'
        self.source.mkdir()
        for filename in build.ENTRY_FILES:
            (self.source / filename).write_bytes(b'entry')
        for folder in build.FOLDERS:
            (self.source / folder).mkdir(parents=True, exist_ok=True)
            (self.source / folder / 'sample.svg').write_bytes(b'sample')
        (self.source / 'assets/layer.webp').write_bytes(b'\x00\xfflayer')
        for view in ('glove', 'palm', 'thumb', 'pinky'):
            (self.source / f'assets/{view}-data.json').write_text(json.dumps({
                'assets': {'glove': 'assets/layer.webp', 'inlined': 'data:image/png;base64,AAAA'},
                'bullets': [{'thumb': 'assets/thumbs/sample.svg'}]}))
        self.output.mkdir()
        (self.output / 'previous').write_text('keep until build passes')

    def package(self):
        return build.package(self.source, self.output, self.manifest)

    def test_exact_bytes_and_excluded_unused_files(self):
        (self.source / 'assets/original-photo.jpg').write_bytes(b'do not publish')
        result = self.package()
        for entry in result['files']:
            self.assertEqual((self.output / entry['path']).read_bytes(),
                             (self.source / entry['path']).read_bytes())
        self.assertFalse((self.output / 'assets/original-photo.jpg').exists())
        self.assertTrue((self.source / 'assets/original-photo.jpg').exists())
        self.assertEqual(json.loads(self.manifest.read_text()), result)

    def test_missing_dependency_preserves_previous_package(self):
        (self.source / 'assets/layer.webp').unlink()
        with self.assertRaises(ValueError):
            self.package()
        self.assertTrue((self.output / 'previous').is_file())

    def test_size_limit_preserves_previous_package(self):
        with patch.object(build, 'MAX_ARCHIVE_BYTES', 1):
            with self.assertRaises(ValueError):
                self.package()
        self.assertTrue((self.output / 'previous').is_file())
        self.assertFalse(self.manifest.exists())

    def test_external_reference_is_rejected(self):
        (self.root / 'private.txt').write_text('private')
        (self.source / 'assets/glove-data.json').write_text(json.dumps({
            'assets': {'glove': '../private.txt'}}))
        with self.assertRaises(ValueError):
            self.package()
        self.assertTrue((self.output / 'previous').is_file())


if __name__ == '__main__':
    unittest.main()
