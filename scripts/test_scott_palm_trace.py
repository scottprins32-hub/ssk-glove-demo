"""Ownership regression checks against the preserved user-authored polygons."""
import hashlib,json,unittest
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];APP=ROOT/'glove_builder/customiser';OUT=APP/'assets/palm-scott-trace-r01';AUDIT=ROOT/'outputs/palm-scott-trace-r01'
class TracedPalm(unittest.TestCase):
 def setUp(self):
  self.raw=(AUDIT/'trace-original.json').read_bytes();self.trace=json.loads(self.raw);self.d=json.loads((APP/'assets/palm-data.json').read_text());self.defn=self.d['nativePalmTrace'];self.w,self.h=self.d['w'],self.d['h']
 def test_exact_source_pin(self):
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),self.defn['traceSha256']);self.assertEqual(len(self.trace['shapes']),1514)
 def test_all_aliases_present(self):
  for key in self.defn['assets'].values():self.assertTrue((APP/self.d['assets'][key]).is_file(),key)
 def test_cutouts_clear_all_surface_layers(self):
  cut=Image.new('L',(self.w*4,self.h*4));g=ImageDraw.Draw(cut)
  for s in self.trace['shapes']:
   if s['view']=='palm'and s['cat']in['opening','remove']:g.polygon([(round(x*4),round(y*4))for x,y in s['pts']],fill=255)
  a=np.array(cut.resize((self.w,self.h),Image.Resampling.LANCZOS));core=a==255
  self.assertGreater(int(core.sum()),80000)
  for key in self.defn['assets'].values():
   if key=='scott_palm_idmap':continue
   im=np.array(Image.open(APP/self.d['assets'][key]).convert('RGBA'))
   self.assertEqual(int(np.count_nonzero(im[:,:,3][core])),0,key)
 def test_lace_vertex_snapshot_is_intact(self):
  parts=[s for s in self.trace['shapes']if s['view']=='palm'and s['cat']=='laces'];self.assertEqual(len(parts),40)
  self.assertTrue(all(len(s['pts'])>=3 for s in parts))
 def test_thread_has_stitching_pick_ownership(self):
  image=np.array(Image.open(OUT/'stitching.webp').convert('RGBA'));ids=np.array(Image.open(OUT/'idmap.png'))[:,:,0];n=next(z['n']for z in self.defn['zones']if z['id']=='stitching');visible=image[:,:,3]>=128
  self.assertGreater(int(visible.sum()),1000);self.assertTrue(np.all(ids[visible]==n))
 def test_alias_scope(self):
  src=(APP/'glove-engine.js').read_text();self.assertIn("!this.web && !this.webMarked && def",src)
  self.assertNotIn('nativePalmTrace',json.loads((APP/'assets/thumb-data.json').read_text()))
if __name__=='__main__':unittest.main()
