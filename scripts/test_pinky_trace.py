"""Verify authored pinky geometry and both handed ownership maps."""
import json,hashlib,unittest
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];A=R/'glove_builder/customiser';D=json.loads((A/'assets/pinky-data.json').read_text());T=D['nativePinkyTrace'];P=json.loads((R/T['traceSource']).read_text());S=[s for s in P['shapes']if s['view']=='pinky'];W,H=D['w'],D['h'];N={z['id']:z['n']for z in T['zones']}
def role(s):return 'embroidery'if s['cat']=='ring_emb'else s['cat']
class Pinky(unittest.TestCase):
 def test_pin(self):self.assertEqual(hashlib.sha256((R/T['traceSource']).read_bytes()).hexdigest(),T['traceSha256']);self.assertEqual(len(S),46)
 def test_exact_masks_and_holes(self):
  own=Image.new('L',(W*4,H*4));cut=Image.new('L',own.size)
  for s in sorted(S,key=lambda s:N.get(role(s),999)):
   r=role(s);pts=[(round(x*4),round(y*4))for x,y in s['pts']]
   if r in N:ImageDraw.Draw(own).polygon(pts,fill=N[r])
   elif r in ['remove','opening']:ImageDraw.Draw(cut).polygon(pts,fill=255)
  own.paste(0,mask=cut);ca=np.array(cut.resize((W,H),Image.Resampling.LANCZOS))
  for z in T['zones']:
   if z['id']=='stitching':continue
   alpha=np.array(Image.open(A/D['assets'][T['assets'][z['id']]]))[:,:,3];expect=np.minimum(np.array(Image.eval(own,lambda v:255 if v==z['n']else 0).resize((W,H),Image.Resampling.LANCZOS)),255-ca);self.assertTrue(np.array_equal(alpha,expect),z['id'])
 def test_lht_letter_picking(self):
  alias=T.get('embroideryLHT')
  art=np.array(Image.open(A/D['assets'][alias or T['assets']['embroidery']]))[:,:,3];ids=np.array(Image.open(A/D['assets'][T['idmapLHT']]))[:,:,0]
  if alias:self.assertTrue(np.all(ids[art>=128]==N['embroidery']))
  else:
   for x0,y0,x1,y1 in T['embParts']:self.assertTrue(np.all(ids[y0:y1,x0:x1][art[y0:y1,x0:x1][:,::-1]>=128]==N['embroidery']))
if __name__=='__main__':unittest.main()
