"""Counter-reflect each glyph along its authored baseline before the glove mirror."""
import json,math
from pathlib import Path
import numpy as np,cv2
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];A=R/'glove_builder/customiser';report={}
for view,key,prop in [('back','glove','nativeBackTrace'),('pinky','pinky','nativePinkyTrace')]:
 path=A/f'assets/{key}-data.json';meta=json.loads(path.read_text());d=meta[prop];parts=d['embParts'];src=np.array(Image.open(A/meta['assets'][d['assets']['embroidery']]).convert('RGBA'));h,w=src.shape[:2]
 centres=np.array([[(b[0]+b[2])/2,(b[1]+b[3])/2]for b in parts]);_,_,v=np.linalg.svd(centres-centres.mean(axis=0),full_matrices=False);t=v[0];reflection=np.eye(2)-2*np.outer(t,t);out=np.zeros_like(src)
 for index,(box,centre) in enumerate(zip(parts,centres)):
  x0,y0,x1,y1=box;piece=np.zeros_like(src);piece[y0:y1,x0:x1]=src[y0:y1,x0:x1];transform=-reflection if index==int(np.argmax(centres[:,1])) else reflection;matrix=np.column_stack([transform,centre-transform@centre]);warp=cv2.warpAffine(piece,matrix,(w,h),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT);take=warp[:,:,3]>out[:,:,3];out[take]=warp[take]
 folder=A/f'assets/lefty-ring-r21/{view}';folder.mkdir(parents=True,exist_ok=True);Image.fromarray(out).save(folder/'embroidery.webp',lossless=True)
 trace=json.loads((R/d['traceSource']).read_text());shapes=[s for s in trace['shapes']if s['view']==view];ns={z['id']:z['n']for z in d['zones']};own=Image.new('L',(w*4,h*4));cut=Image.new('L',own.size)
 def role(s):
  r=s['cat'];r='back'+__import__('re').search(r'Back\s*([1-9])',s['name'],__import__('re').I).group(1)if r=='finger'else r
  return {'ring_emb':'embroidery','back7':'back78'}.get(r,r)if view=='back'else {'ring_emb':'embroidery'}.get(r,r)
 for s in sorted(shapes,key=lambda s:ns.get(role(s),999)):
  r=role(s);pts=[(round(x*4),round(y*4))for x,y in s['pts']]
  if r in ns and r!='embroidery':ImageDraw.Draw(own).polygon(pts,fill=ns[r])
  elif r in ['remove','opening']:ImageDraw.Draw(cut).polygon(pts,fill=255)
 own.paste(0,mask=cut)
 # Original embroidered pixels also define glove support where the authored
 # panel stops at its lettering; restore those pixels to the ring panel.
 support=np.array(own);oldart=np.array(Image.fromarray(src[:,:,3]).resize((w*4,h*4),Image.Resampling.NEAREST));support[(support==0)&(oldart>0)]=ns['back78' if view=='back' else 'back7'];own=Image.fromarray(support)
 d['leftyRingHeals']={}
 for zone,n in ns.items():
  if zone in ['embroidery','stitching']:continue
  mask=Image.eval(own,lambda x:255 if x==n else 0).resize((w,h),Image.Resampling.LANCZOS)
  # Replace the complete ring surface; local patches leave baked source
  # shadows beyond the original glyph boundary. Alpha stays authored.
  alpha=np.array(mask) if zone==('back78' if view=='back' else 'back7') else np.minimum(np.array(mask),cv2.dilate(src[:,:,3],np.ones((15,15),np.uint8)))
  if zone==('back78' if view=='back' else 'back7'):
   original=np.array(Image.open(A/meta['assets'][d['assets'][zone]]).convert('RGBA'))[:,:,3];alpha=np.maximum(alpha,original)
  if not np.any(alpha):continue
  patch=np.full_like(src,246);patch[:,:,3]=alpha;filename=zone+'-heal.webp';Image.fromarray(patch).save(folder/filename,lossless=True);alias=f'lefty_ring_{view}_{zone}_heal';meta['assets'][alias]=str((folder/filename).relative_to(A));d['leftyRingHeals'][zone]=alias;d['bbox'][alias]=list(mask.getbbox())
 ids=np.array(own.resize((w,h),Image.Resampling.NEAREST));thread=np.array(Image.open(A/meta['assets'][d['assets']['stitching']]))[:,:,3];ids[thread>=128]=ns['stitching'];ids[out[:,:,3]>=128]=ns['embroidery'];Image.fromarray(np.dstack([ids,ids,ids,np.full_like(ids,255)])).save(folder/'idmap.png')
 for name,file in [('embroideryLHT','embroidery.webp'),('idmapLHT','idmap.png')]:
  alias=f'lefty_ring_{view}_{name}';meta['assets'][alias]=str((folder/file).relative_to(A));d[name]=alias
  if name=='embroideryLHT':d['bbox'][alias]=list(Image.fromarray(out[:,:,3]).getbbox())
 report[view]={'baseline':t.tolist(),'parts':len(parts),'pixels':int((out[:,:,3]>=128).sum())};path.write_text(json.dumps(meta,indent=2)+'\n')
p=R/'outputs/lefty-ring-r21';p.mkdir(exist_ok=True);(p/'BUILD.json').write_text(json.dumps(report,indent=2))
