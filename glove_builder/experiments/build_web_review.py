"""Build native-source draft previews and seeded source-coordinate review data.
Never writes production assets or original photographs. All labels are proposals.
"""
from pathlib import Path
import argparse,sys,json,hashlib,shutil
import numpy as np,cv2
from PIL import Image,ImageDraw
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));import make_web as mw

def polygons(mask,role,prefix,min_area=150):
 cs,_=cv2.findContours(mask.astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 result=[]
 for c in sorted(cs,key=cv2.contourArea,reverse=True):
  if cv2.contourArea(c)<min_area:continue
  pts=cv2.approxPolyDP(c,max(1.5,cv2.arcLength(c,True)*.003),True).reshape(-1,2).tolist()
  if len(pts)>=3:result.append(dict(id=f'{prefix}-{len(result)+1}',role=role,name=f'{prefix} {len(result)+1}',points=pts))
 return result

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,required=True);args=ap.parse_args();out=args.out;out.mkdir(parents=True,exist_ok=True)
 labels={'standard-i':'Standard I','spiral-i':'Spiral I','smk':'SMK','smlee':'SMLEE','em-rocket':'Em Rocket','closed-diamond-net':'Closed Diamond Net','trapeze':'Trapeze','modified-trapeze':'Modified Trapeze'}
 items=[]
 # H-web is retained as a read-only reference, not re-generated.
 hsrc=ROOT.parent/'work/integrated-join-stitch-matrix/h-web-RHT.png'
 hdir=out/'assets/h-web';hdir.mkdir(parents=True,exist_ok=True);shutil.copy2(hsrc,hdir/'reference.png')
 hi=Image.open(hsrc);items.append(dict(id='h-web',label='H-Web · bestaande referentie',source=str(hsrc.relative_to(ROOT.parent)),width=hi.width,height=hi.height,photo='assets/h-web/reference.png',preview='assets/h-web/reference.png',sourceHash=hashlib.sha256(hsrc.read_bytes()).hexdigest(),shapes=[],readOnly=True,status='reference'))
 for slug,label in labels.items():
  spec=dict(mw.WEBS[slug])
  if slug=='smlee':
   import trace_smlee
   spec.pop('outline',None);spec.update(web_polys=[trace_smlee.LEATHER],lace_polys=trace_smlee.LACES)
  im,web,lace,finger,glove=mw.cut(spec)
  # The historical relit store crops were prepared for web-only extraction,
  # not a full glove: their background masks and boosted grain are unsuitable
  # for a source-native body preview. Keep the camera's actual full crop.
  native_store='store-2026-09' in spec['photo']
  frame={'trapeze':'DSC05716','modified-trapeze':'DSC05720','smlee':'DSC05723','em-rocket':'DSC05715'}.get(slug)
  original=None
  if native_store and frame:
   shoot=Path('/Users/scottprins/Library/CloudStorage/GoogleDrive-scottprins32@gmail.com/My Drive/SSK Europe/Pictures of gloves/SSK fotoshoot')
   choices=[x for x in shoot.iterdir() if x.stem==frame and x.suffix.lower() in ('.jpg','.jpeg')]
   if not choices:
    import subprocess
    raw=shoot/(frame+'.ARW');cache=ROOT.parent/'work/native-source-cache';cache.mkdir(parents=True,exist_ok=True);developed=cache/(frame+'-developed.tiff')
    if not developed.exists():subprocess.run(['sips','-s','format','tiff',str(raw),'--out',str(developed)],check=True,stdout=subprocess.DEVNULL)
    choices=[developed]
   original=choices[0];im=Image.open(original).convert('RGB').crop((1650,150,5100,3860)).resize(im.size,Image.Resampling.LANCZOS)
  a=np.asarray(im);hsv=cv2.cvtColor(a,cv2.COLOR_RGB2HSV);lum=a.astype(float)@np.array([.299,.587,.114])
  d=out/'assets'/slug;d.mkdir(parents=True,exist_ok=True);source=original or ROOT/spec['photo'];im.save(d/'source.jpg',quality=95)
  # Colour candidate from source hue, gated against swallowing a same-colour shell.
  all_lace=lace.copy();lohi=None if native_store else spec.get('lace_hue')
  if lohi:
   hue=hsv[...,0].astype(float)*2;lo,hi=lohi;hm=((hue>=lo)&(hue<=hi)) if lo<=hi else ((hue>=lo)|(hue<=hi))
   proposal=glove&hm&(hsv[...,1]>65)
   if proposal.sum()/max(glove.sum(),1)<.28:all_lace|=proposal
  if 'traced' in spec and not native_store:all_lace|=mw.traced_masks(spec)['lace_anywhere']&glove
  # Retain original shadows/cavity; never inpaint or deform geometry.
  fixed=(hsv[...,2]<45)&glove&~web&~all_lace
  if native_store:fixed=~(web|all_lace)
  palm=np.zeros(glove.shape,bool);palmshape=[]
  if slug=='standard-i':
   pts=[[850,610],[1060,640],[1050,870],[940,1040],[790,1140],[776,960],[808,795]]
   pm=Image.new('1',im.size);ImageDraw.Draw(pm).polygon([tuple(x)for x in pts],fill=1);palm=np.asarray(pm)&glove&~all_lace&~fixed
   palmshape=[dict(id='palm-proposal',role='palm',name='Palmleer onder web · controleren',points=pts,materialKey='palm')]
  web=web&~all_lace&~palm&~fixed
  zones={'body':glove&~web&~all_lace&~palm&~fixed,'web':web,'laces':all_lace&~fixed,'palm':palm}
  layers={};render=np.zeros(a.shape[:2]+(4,),dtype='uint8')
  palette={'body':[242,240,234],'web':[42,48,74],'laces':[232,184,76],'palm':[242,240,234]}
  for name,m in zones.items():
   med=np.median(lum[m]) if m.any() else 1;grey=np.uint8(np.clip(lum/max(med,1)*190,0,255));rgba=np.dstack([grey,grey,grey,m.astype('uint8')*255]);Image.fromarray(rgba).save(d/(name+'.png'));layers[name]=f'assets/{slug}/{name}.png'
   render[m,:3]=np.clip(grey[m,None]*np.array(palette[name])[None,:]/255,0,255).astype('uint8');render[m,3]=255
  rgba=np.dstack([a,fixed.astype('uint8')*255]);Image.fromarray(rgba).save(d/'fixed.png');layers['fixed']=f'assets/{slug}/fixed.png';render[fixed]=rgba[fixed];Image.fromarray(render).save(d/'preview.png')
  # Exact pixel masks remain available; simplified outlines are editable proposals.
  for name,m in zones.items():Image.fromarray(m.astype('uint8')*255).save(d/(name+'-mask.png'))
  hull=cv2.convexHull(np.column_stack(np.nonzero(web|lace)[::-1]).astype('int32')) if (web|lace).any() else None
  inside=np.zeros(glove.shape,'uint8')
  if hull is not None:cv2.fillConvexPoly(inside,hull,1)
  windows=inside.astype(bool)&~glove
  shapes=polygons(web,'web','Webleer',400)+polygons(lace,'laces','Webveter',100)+polygons(windows,'opening','Opening',250)+palmshape
  for s in shapes:
   s['materialKey']='palm' if s['role']=='palm' else s['role']
  items.append(dict(id=slug,label=label,source=str(shoot/(frame+'.ARW')) if native_store and source.suffix=='.tiff' else (str(source) if native_store else spec['photo']),sourceHash=hashlib.sha256((d/'source.jpg').read_bytes()).hexdigest(),width=im.width,height=im.height,photo=f'assets/{slug}/source.jpg',preview=f'assets/{slug}/preview.png',layers=layers,shapes=shapes,status='draft',notes=('Originele camera-opname; body en achtergrond behouden. Webkleur is een voorstel.' if native_store else 'Voorlopige indeling; bronvorm behouden. Kleurgrenzen nog controleren.')))
  print(slug,im.size,'shapes',len(shapes),flush=True)
 manifest=dict(version=1,items=items,materialLinks={'palm':'palm'},notes='Draft source-native review only. H-web unchanged; no production integration.')
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 template=ROOT/'review_tracer_template.html'
 if template.exists():(out/'index.html').write_text(template.read_text().replace('/*__MANIFEST__*/{}',json.dumps(manifest,ensure_ascii=False)))
 print(out/'manifest.json')
if __name__=='__main__':main()
