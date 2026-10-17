"""Release freshness without invalidating unchanged image caches."""
import hashlib
import json
import pathlib
import re
import tempfile
import unittest

from version_site import version_site


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


class VersionSiteTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        (self.root / 'assets').mkdir()
        self.image = self.root / 'assets/glove.webp'
        self.image.write_bytes(b'original image bytes')
        self.metadata = self.root / 'assets/glove-data.json'
        self.metadata.write_text(json.dumps({'assets': {'glove': 'assets/glove.webp'}}))
        self.write_sources()

    def write_sources(self, engine='export const version = 1;'):
        (self.root / 'glove-engine.js').write_text(engine)
        (self.root / 'app.js').write_text("import {version} from './glove-engine.js'; console.log(version);")
        (self.root / 'app.css').write_text("body{background:url('assets/glove.webp')}")
        (self.root / 'index.html').write_text('<head><link href="app.css"><link rel="preload" href="assets/glove-data.json"></head><script type="module" src="app.js"></script>')

    def test_transitive_modules_and_metadata_preload_match_runtime_versions(self):
        versions = version_site(self.root)
        app = (self.root / 'app.js').read_text()
        html = (self.root / 'index.html').read_text()
        self.assertIn('./glove-engine.js?v=' + digest(self.root / 'glove-engine.js'), app)
        self.assertIn('src="app.js?v=' + digest(self.root / 'app.js'), html)
        self.assertIn('assets/glove-data.json?v=' + versions['assets/glove-data.json'], html)
        self.assertIn('window.__SSK_ASSET_VERSIONS__=', html)
        self.assertIn('href="app.css?v=' + digest(self.root / 'app.css'), html)
        self.assertIn('assets/glove.webp?v=' + versions['assets/glove.webp'], (self.root / 'app.css').read_text())

    def test_code_release_retains_unchanged_image_versions(self):
        before = version_site(self.root)
        app_before = digest(self.root / 'app.js')
        self.write_sources('export const version = 2;')
        after = version_site(self.root)
        self.assertEqual(before, after)
        self.assertNotEqual(app_before, digest(self.root / 'app.js'))
        self.assertEqual(self.image.read_bytes(), b'original image bytes')

    def test_changed_asset_gets_new_url_without_rewriting_metadata(self):
        metadata_before = self.metadata.read_bytes()
        before = version_site(self.root)
        self.write_sources()
        self.image.write_bytes(b'updated image bytes')
        after = version_site(self.root)
        self.assertNotEqual(before['assets/glove.webp'], after['assets/glove.webp'])
        self.assertEqual(before['assets/glove-data.json'], after['assets/glove-data.json'])
        self.assertEqual(self.metadata.read_bytes(), metadata_before)

    def test_public_render_revision_tracks_code_and_image_changes(self):
        def revision():
            version_site(self.root)
            return re.search(r'__SSK_RENDER_REVISION__="([^"]+)"',(self.root/'index.html').read_text())[1]
        first=revision()
        self.write_sources('export const version = 2;')
        second=revision()
        self.assertNotEqual(first,second)
        self.write_sources('export const version = 2;')
        self.image.write_bytes(b'new full quality source')
        self.assertNotEqual(second,revision())

    def test_missing_or_external_assets_rejected(self):
        for name in ('assets/missing.webp', '../outside.webp'):
            with self.subTest(name=name):
                self.metadata.write_text(json.dumps({'assets': {'glove': name}}))
                with self.assertRaises(ValueError):
                    version_site(self.root)

    def test_dynamic_import_is_versioned(self):
        (self.root / 'lazy.js').write_text('export const answer=42;')
        (self.root / 'app.js').write_text("import('./lazy.js').then(console.log);")
        version_site(self.root)
        self.assertIn("import('./lazy.js?v=" + digest(self.root / 'lazy.js'), (self.root / 'app.js').read_text())

    def test_missing_module_rejected(self):
        (self.root / 'app.js').write_text("import './missing.js';")
        with self.assertRaises(ValueError):
            version_site(self.root)


if __name__ == '__main__':
    unittest.main()
