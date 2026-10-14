"""Deterministic ownership checks; run with a Python runtime containing Pillow."""
import json
from pathlib import Path
import unittest
from PIL import Image, ImageChops

ASSETS=Path(__file__).resolve().parents[1]/'glove_builder/customiser/assets'
class Back8Split(unittest.TestCase):
    def test_mask_partitions_preserve_every_source_pixel(self):
        for original,ring,side in [('clean-edges-r01/back78.png','back78','back8'),
            ('back78_hi.webp','back78_hi','back8_hi'),
            ('clean-edges-r01/back-heal-back78.png','clean_edge_heal_back78','clean_edge_heal_back8')]:
            src=Image.open(ASSETS/original).convert('RGBA')
            a=Image.open(ASSETS/f'back8-split-r01/{ring}.png').convert('RGBA')
            b=Image.open(ASSETS/f'back8-split-r01/{side}.png').convert('RGBA')
            self.assertIsNone(ImageChops.multiply(a.getchannel('A'),b.getchannel('A')).getbbox())
            self.assertEqual(ImageChops.lighter(a,b).tobytes(),src.tobytes())
            self.assertIsNotNone(b.getchannel('A').getbbox())
    def test_only_previous_ring_owners_move_to_back8(self):
        src=Image.open(ASSETS/'idmap.png').convert('RGBA')
        dst=Image.open(ASSETS/'back8-split-r01/idmap.png').convert('RGBA')
        changed=0
        for a,b in zip(src.getdata(),dst.getdata()):
            if a!=b:
                changed+=1
                self.assertEqual(a[0],3)
                self.assertEqual(b,(20,*a[1:]))
        self.assertGreater(changed,1000)
    def test_shared_illumination_and_unique_owner(self):
        d=json.loads((ASSETS/'glove-data.json').read_text())
        ns=[z['n'] for z in d['zones']];self.assertEqual(len(ns),len(set(ns)))
        self.assertEqual(d['materialSources']['back8'],d['materialSources']['back78'])
        self.assertEqual(d['materialSources']['clean_edge_heal_back8'],d['materialSources']['clean_edge_heal_back78'])
        self.assertIn(['clean_edge_heal_back8','back8'],d['weltEdgeHealing'])
if __name__=='__main__':unittest.main()
