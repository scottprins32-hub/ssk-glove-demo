"""Check exact authored geometry, openings, seam ownership and unrelated-view preservation."""
import hashlib,json,re,unittest
from pathlib import Path
import numpy as np
import cv2
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];APP=ROOT/'glove_builder/customiser';AUDIT=ROOT/'outputs/traced-back-palm-r03';SS=4
class ExactTraces(unittest.TestCase):
 def setUp(self):
  self.raw=(AUDIT/'trace-original.json').read_bytes();self.trace=json.loads(self.raw);self.report=json.loads((AUDIT/'BUILD.json').read_text())
 def current(self,view):
  key='glove'if view=='back'else view;d=json.loads((APP/f'assets/{key}-data.json').read_text());t=d['nativeBackTrace'if view=='back'else'nativePalmTrace'];raw=(ROOT/t.get('traceSource','outputs/traced-back-palm-r03/trace-original.json')).read_bytes();report=json.loads((ROOT/t.get('traceReport','outputs/traced-back-palm-r03/BUILD.json')).read_text());return t,raw,json.loads(raw),report
 def test_source_pin(self):
  for view in ['back','palm']:
   t,raw,trace,report=self.current(view);self.assertEqual(hashlib.sha256(raw).hexdigest(),report['sha256']);self.assertEqual(t['traceSha256'],report['sha256'])
 def test_exact_panels_laces_and_cutouts(self):
  for view,key in [('back','glove'),('palm','palm')]:
   d=json.loads((APP/f'assets/{key}-data.json').read_text());t=d['nativeBackTrace'if view=='back'else'nativePalmTrace'];ns={z['id']:z['n']for z in t['zones']};w,h=d['w'],d['h'];own=Image.new('L',(w*SS,h*SS));cut=Image.new('L',own.size)
   def role(s):
    r=s['cat']
    if r=='finger':
     m=re.search(r'Back\s*([1-9])',s['name'],re.I);r='back'+m.group(1)if m else'palm'
    return {'back7':'back78','ring_emb':'embroidery'}.get(r,r)if view=='back'else r
   parts=[s for s in self.current(view)[2]['shapes']if s['view']==view]
   for s in sorted(parts,key=lambda s:ns.get(role(s),999)):
    r=role(s);pts=[(round(x*SS),round(y*SS))for x,y in s['pts']]
    if r in ns:ImageDraw.Draw(own).polygon(pts,fill=ns[r])
    elif r in ['opening','remove']:ImageDraw.Draw(cut).polygon(pts,fill=255)
   own.paste(0,mask=cut);ca=np.array(cut.resize((w,h),Image.Resampling.LANCZOS))
   for z in t['zones']:
    im=np.array(Image.open(APP/d['assets'][t['assets'][z['id']]]).convert('RGBA'));a=im[:,:,3]
    self.assertTrue(np.all(a[ca==255]==0),(view,z['id'],'cutout'))
    if z['id']=='stitching':continue
    expected=np.minimum(np.array(Image.eval(own,lambda v:255 if v==z['n']else 0).resize((w,h),Image.Resampling.LANCZOS)),255-ca)
    self.assertTrue(np.array_equal(a,expected),(view,z['id'],'exact alpha'))
   self.assertEqual(sum(s['cat']=='laces'for s in parts),19 if view=='back'else 40)
 def test_open_seams_are_spaced_and_pickable(self):
  for view,key in [('back','glove'),('palm','palm')]:
   v=self.current(view)[3]['views'][view];self.assertEqual(len(v['paths']),25 if view=='back'else 10);self.assertGreater(v['gap'],0)
   self.assertTrue(all(p['dashes']>0 for p in v['paths']))
   d=json.loads((APP/f'assets/{key}-data.json').read_text());t=d['nativeBackTrace'if view=='back'else'nativePalmTrace'];a=np.array(Image.open(APP/d['assets'][t['assets']['stitching']]))[:,:,3];ids=np.array(Image.open(APP/d['assets'][t['assets']['_idmap']]))[:,:,0];n=next(z['n']for z in t['zones']if z['id']=='stitching');self.assertTrue(np.all(ids[a>=128]==n));self.assertGreater((a>=128).sum(),1000)
 def test_raster_stitches_retain_actual_gaps(self):
  for view in ['back','palm']:
   key='glove'if view=='back'else view;d=json.loads((APP/f'assets/{key}-data.json').read_text());t=self.current(view)[0];image=np.array(Image.open(APP/d['assets'][t['assets']['stitching']]))[:,:,3]
   n,labels,stats,centres=cv2.connectedComponentsWithStats((image>=128).astype('uint8'),8)
   nominal=sum(p['dashes']for p in self.current(view)[3]['views'][view]['paths'])
   # Endcaps must not turn separate dashes into long continuous seam components.
   self.assertGreater(n-1,nominal*.95)
   self.assertLess(int(stats[1:,4].max()),40)
 def test_reclassified_welting_uses_one_neutral_lace_colour(self):
  t,raw,trace,report=self.current('back');self.assertTrue(all(next(s for s in trace['shapes'] if s['view']=='back' and s['name']==name)['cat']=='laces' for name in ['Veter','Welting 4']))
  shape=next(s for s in trace['shapes']if s['view']=='back'and s['name']=='Veter');x,y=np.mean(shape['pts'],axis=0).round().astype(int)
  d=json.loads((APP/'assets/glove-data.json').read_text());lace=np.array(Image.open(APP/d['assets'][t['assets']['laces']]).convert('RGBA'));welt=np.array(Image.open(APP/d['assets'][t['assets']['welting']]).convert('RGBA'));ids=np.array(Image.open(APP/d['assets'][t['assets']['_idmap']]).convert('RGB'))[:,:,0]
  self.assertEqual(int(lace[y,x,3]),255);self.assertGreater(int(lace[y,x,0]),220);self.assertEqual(int(welt[y,x,3]),0);self.assertEqual(int(ids[y,x]),next(z['n']for z in t['zones']if z['id']=='laces'))
 def test_named_field_categories_win(self):
  d=json.loads((APP/'assets/glove-data.json').read_text());t=d['nativeBackTrace'];self.assertTrue(any(z['id']=='back2'and z['field']=='back2'for z in t['zones']));self.assertTrue(any(s['cat']=='back2'and s['name']=='Back 1 1'for s in self.trace['shapes']))
if __name__=='__main__':unittest.main()
