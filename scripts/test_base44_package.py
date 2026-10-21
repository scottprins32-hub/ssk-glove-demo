"""Packaging failure guards, independent of the full glove assets."""
import importlib.util
import json
import hashlib
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
            if entry['path'] == 'performance-modules.json': continue
            self.assertEqual((self.output / entry['path']).read_bytes(),
                             (self.source / entry['path']).read_bytes())
        self.assertFalse((self.output / 'assets/original-photo.jpg').exists())
        self.assertTrue((self.source / 'assets/original-photo.jpg').exists())
        self.assertEqual(json.loads(self.manifest.read_text()), result)

    def test_benchmark_map_follows_versioned_imports_without_prefetch(self):
        (self.source / 'app.js').write_text("import './glove-engine.js?v=abc';\nimport('./commerce-ui.js?v=def');")
        (self.source / 'index.html').write_text('<script src="app.js?v=123"></script>')
        self.package()
        aliases=json.loads((self.output / 'performance-modules.json').read_text())
        self.assertEqual(aliases['glove-engine.js?v=abc'], 'glove-engine.js')
        self.assertEqual(aliases['commerce-ui.js?v=def'], 'commerce-ui.js')
        self.assertEqual(aliases['app.js?v=123'], 'app.js')

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

    def test_compact_probe_has_nine_cold_keys_and_early_charset(self):
        (self.source/'performance.js').write_text('function observer(config) {}\nfunction output() {}')
        (self.source/'index.html').write_text('<html><head><meta charset="utf-8"></head><body><script src="app.js?v=abc"></script></body></html>')
        (self.source/'ds/tokens').mkdir(parents=True)
        (self.source/'ds/tokens/fonts.css').write_text('body{}')
        self.package()
        page=(self.output/'performance-cold.html').read_text()
        self.assertLess(page.index('<meta charset="utf-8">'),1024)
        self.assertIn('document.write',page)
        self.assertIn('probe',page)
        self.assertFalse((self.output/'performance-cold-1.html').exists())
        self.assertEqual(len(list(self.output.glob('performance-fonts-*.css'))),9)

    def test_extracted_limit_preserves_previous_package(self):
        with patch.object(build, 'MAX_EXTRACTED_BYTES', 1):
            with self.assertRaisesRegex(ValueError, 'Extracted site'):
                self.package()
        self.assertTrue((self.output / 'previous').is_file())

    def test_hosted_artwork_keeps_original_bytes_and_rewrites_only_package(self):
        local='assets/layer.webp'; path=self.source/local
        original=path.read_bytes(); row={'path':local,'sha256':hashlib.sha256(original).hexdigest(),'url':build.ARTWORK_PREFIX+'verified.webp'}
        registry=self.root/'hosted.json';registry.write_text(json.dumps([row]))
        with patch.object(build,'HOSTED_ARTWORK',registry):
            build.stage_hosted_artwork(self.source)
            self.assertEqual(path.read_bytes(),original)
            result=self.package()
            self.assertEqual(json.loads((self.output/'assets/glove-data.json').read_text())['assets']['glove'],row['url'])
            self.assertFalse((self.output/local).exists())
            self.assertEqual(result['hostedArtwork'],[row])

    def test_hosted_metadata_is_versioned_after_rewriting(self):
        import sys
        sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
        from version_site import version_site
        local='assets/layer.webp';row={'path':local,'sha256':hashlib.sha256((self.source/local).read_bytes()).hexdigest(),'url':build.ARTWORK_PREFIX+'verified.webp'}
        registry=self.root/'hosted.json';registry.write_text(json.dumps([row]))
        with patch.object(build,'HOSTED_ARTWORK',registry):build.stage_hosted_artwork(self.source)
        versions=version_site(self.source)
        metadata=self.source/'assets/glove-data.json'
        self.assertEqual(versions['assets/glove-data.json'],hashlib.sha256(metadata.read_bytes()).hexdigest()[:16])
        self.assertNotIn(row['url'],versions)

    def test_changed_hosted_source_is_rejected_before_rewriting(self):
        registry=self.root/'hosted.json';registry.write_text(json.dumps([{'path':'assets/layer.webp','sha256':'0'*64,'url':build.ARTWORK_PREFIX+'verified.webp'}]))
        original=(self.source/'assets/glove-data.json').read_bytes()
        with patch.object(build,'HOSTED_ARTWORK',registry):
            with self.assertRaisesRegex(ValueError,'differs from source'):build.stage_hosted_artwork(self.source)
        self.assertEqual((self.source/'assets/glove-data.json').read_bytes(),original)

    def test_hosted_artwork_rejects_another_host_or_app(self):
        for url in ['https://example.com/logo.webp',build.ARTWORK_PREFIX+'../private.webp',build.ARTWORK_PREFIX+'image.webp?token=bad']:
            registry=self.root/'hosted.json';registry.write_text(json.dumps([{'url':url}]))
            with patch.object(build,'HOSTED_ARTWORK',registry):
                with self.assertRaisesRegex(ValueError,'Untrusted'):build.hosted_artwork()

    def test_external_reference_is_rejected(self):
        (self.root / 'private.txt').write_text('private')
        (self.source / 'assets/glove-data.json').write_text(json.dumps({
            'assets': {'glove': '../private.txt'}}))
        with self.assertRaises(ValueError):
            self.package()
        self.assertTrue((self.output / 'previous').is_file())


if __name__ == '__main__':
    unittest.main()
