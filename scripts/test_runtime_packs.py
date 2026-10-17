import json
import pathlib
import tempfile
import unittest
from runtime_packs import write_packs

class RuntimePackTests(unittest.TestCase):
    def test_original_bytes_and_deduplication(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=pathlib.Path(temporary);(root/'assets').mkdir()
            bodies={'a.png':bytes(range(256)), 'b.webp':b'RIFF\0exact image', 'f.svg':b'<svg/>'}
            for name,data in bodies.items():(root/'assets'/name).write_bytes(data)
            entries=write_packs(root,{'back':['assets/a.png','assets/b.webp'], 'palm':['assets/a.png','assets/f.svg']})
            self.assertEqual(len(entries),3)
            for name,entry in entries.items():
                pack=(root/entry['pack']).read_bytes()
                self.assertEqual(pack[entry['offset']:entry['offset']+entry['length']],(root/name).read_bytes())
            self.assertEqual((root/'assets/runtime/palm.pack').read_bytes(),bodies['f.svg'])
            self.assertEqual(json.loads((root/'assets/runtime/manifest.json').read_text()),entries)

    def test_external_and_missing_assets_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=pathlib.Path(temporary)
            for name in ['../private.png','assets/missing.webp']:
                with self.assertRaises(ValueError):write_packs(root,{'back':[name]})
