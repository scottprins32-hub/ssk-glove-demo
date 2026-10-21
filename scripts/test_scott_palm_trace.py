"""Preserve the prior R02 source/assets; current integration is tested in test_traced_back_palm."""
import hashlib,json,unittest
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];APP=ROOT/'glove_builder/customiser';OUT=APP/'assets/palm-scott-trace-r01';AUDIT=ROOT/'outputs/palm-scott-trace-r01'
class HistoricalR02(unittest.TestCase):
 def test_original_snapshot_remains_complete(self):
  raw=(AUDIT/'trace-original.json').read_bytes();trace=json.loads(raw);report=json.loads((AUDIT/'BUILD.json').read_text());self.assertEqual(hashlib.sha256(raw).hexdigest(),report['sha256']);self.assertEqual(len(trace['shapes']),1514);self.assertEqual(sum(s['view']=='palm'and s['cat']=='laces'for s in trace['shapes']),40)
 def test_original_thread_ownership_remains_intact(self):
  image=np.array(Image.open(OUT/'stitching.webp').convert('RGBA'));ids=np.array(Image.open(OUT/'idmap.png'))[:,:,0];visible=image[:,:,3]>=128;self.assertGreater(int(visible.sum()),1000);self.assertTrue(np.all(ids[visible]==14))
if __name__=='__main__':unittest.main()
