"""Compile exact Scott polygons and open seam paths; sources and other views stay intact."""
import argparse,base64,hashlib,io,json,math,re
from pathlib import Path
import cv2
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];APP=ROOT/'glove_builder/customiser';AUDIT=ROOT/'outputs/traced-back-palm-r03';SS=4
p=argparse.ArgumentParser();p.add_argument('--tracer');args=p.parse_args()
if args.tracer:
 d=json.loads(re.search(r'const DATA = (.*);',Path(args.tracer).read_text()).group(1));(AUDIT/'view-sources.json').write_text(json.dumps({v:d['views'][v]for v in ['back','palm']}))
sources=json.loads((AUDIT/'view-sources.json').read_text());raw=(AUDIT/'trace-original.json').read_bytes();trace=json.loads(raw);report={'sha256':hashlib.sha256(raw).hexdigest(),'scope':'native H back and palm only','views':{}}
def role(s,view):
 r=s['cat']
 if r=='finger':
  m=re.search(r'Back\s*([1-9])',s['name'],re.I);r='back'+m.group(1)if m else'palm'
 return {'back7':'back78','ring_emb':'embroidery'}.get(r,r)if view=='back'else r
def poly(im,pts,fill):ImageDraw.Draw(im).polygon([(round(x*SS),round(y*SS))for x,y in pts],fill=fill)
for view in ['back','palm']:
 src=sources[view];W,H=src['w'],src['h'];parts=[s for s in trace['shapes']if s['view']==view];metaFile=APP/f"assets/{'glove'if view=='back'else view}-data.json";meta=json.loads(metaFile.read_text())
 fields=(['palm','back2','back78','back8','back6','back5','back4','back3','web','belt','lining','binding','welting','pinky_loops','laces','embroidery','stitching'] if view=='back'else['palm','web','back1','back9','back3','back4','back6','back7','belt','binding','welting','thumb_loops','laces','stitching']);ns={f:i+1 for i,f in enumerate(fields)}
 out=APP/f'assets/{view}-scott-trace-r03';out.mkdir(exist_ok=True);cut=Image.new('L',(W*SS,H*SS));own=Image.new('L',cut.size)
 for s in sorted(parts,key=lambda s:ns.get(role(s,view),999)):
  r=role(s,view)
  if r in ns:poly(own,s['pts'],ns[r])
  elif r in ['opening','remove']:poly(cut,s['pts'],255)
  elif r!='stitch_path':raise ValueError('Unsupported role '+r)
 cutAlpha=np.array(cut.resize((W,H),Image.Resampling.LANCZOS));own.paste(0,mask=cut);ids=np.array(own.resize((W,H),Image.Resampling.NEAREST))
 img=np.array(Image.open(io.BytesIO(base64.b64decode(src['render'].split(',')[1]))).convert('RGB')).astype(float);old=np.array(Image.open(io.BytesIO(base64.b64decode(src['idmap'].split(',')[1]))).convert('RGB'))[:,:,0];ref=np.full((H,W),220.)
 for i,z in enumerate(src['legend'],1):
  c=np.array([int(z['hex'][j:j+2],16)for j in [1,3,5]]);ref[old==i]=max(30,float(c@[.2126,.7152,.0722]))
 light=np.clip((img@[.2126,.7152,.0722])/ref,.15,1.3).astype('float32')
 stamp=np.zeros((H,W),np.uint8)
 for m in meta.get('palmStamps',[]):
  x0,y0,x1,y1=m['box'];stamp[y0:y1,x0:x1]=((light[y0:y1,x0:x1]<.75)*255).astype('uint8')
 light=cv2.inpaint(light,cv2.dilate(stamp,np.ones((3,3),np.uint8)),9,cv2.INPAINT_NS)
 assets={};bbox={};responses={};zones=[];masks={};embParts=[]
 for r,n in ns.items():
  if r=='stitching':continue
  mask=Image.eval(own,lambda p:255 if p==n else 0).resize((W,H),Image.Resampling.LANCZOS);alpha=np.minimum(np.array(mask),255-cutAlpha)
  if not np.any(alpha):continue
  masks[r]=alpha
  if r in ['laces','embroidery']:
   tone=np.clip(light,.26,1.12) # preserve photographed lace/embroidered relief
  else:
   # Remove baked dark specks/seams and photographic colour-boundary shadows.
   # The exact polygon alpha is independent of this material-only smoothing.
   selected=(ids==n).astype('float32');smooth=cv2.GaussianBlur(light*selected,(0,0),7)/np.maximum(.001,cv2.GaussianBlur(selected,(0,0),7))
   broad=cv2.GaussianBlur(light*selected,(0,0),24)/np.maximum(.001,cv2.GaussianBlur(selected,(0,0),24))
   tone=np.clip(.965+(smooth-broad)*.16,.90,1.025) if r=='palm' else np.clip(.965+(smooth-.965)*.32,.82,1.06)
   if r=='lining':tone=np.clip(smooth,.55,1.05)
  rgba=np.empty((H,W,4),np.uint8);rgba[:,:,:3]=np.clip(tone[:,:,None]*255,0,255).astype('uint8');rgba[:,:,3]=alpha
  key=f'scott_{view}_{r}';Image.fromarray(rgba).save(out/(r+'.webp'),lossless=True,method=6);assets[key]=str((out/(r+'.webp')).relative_to(APP));bbox[r]=list(mask.getbbox());bbox[key]=bbox[r]
  group='embroidery'if r=='embroidery'else'lace'if r in['binding','welting','laces']else'leather';field={'back78':'back7','embroidery':'ring_emb'}.get(r,r);zones.append({'id':r,'field':field,'n':n,'group':group,'label':field});responses[r]={'grainStrength':0,'calibration':{'lo':235,'mid':246,'high':255}}
  if r=='embroidery':
   for s in parts:
    if role(s,view)==r:
     xs,ys=zip(*s['pts']);embParts.append([int(min(xs)),int(min(ys)),math.ceil(max(xs))+1,math.ceil(max(ys))+1])
 # Lay short rounded thread dashes along each exact open polyline by arc length.
 # No closing segment is ever synthesized. Each user-drawn line is one stitch row.
 thread=Image.new('RGBA',(W*SS,H*SS));g=ImageDraw.Draw(thread);dash=4 if view=='back'else 6;gap=dash*.42;width=dash*.34;pathReport=[]
 def point(pts,lens,d):
  i=int(np.searchsorted(lens,d,side='right'));i=max(1,min(len(pts)-1,i));a=np.array(pts[i-1]);b=np.array(pts[i]);t=(d-lens[i-1])/max(.000001,lens[i]-lens[i-1]);return a+(b-a)*t
 for s in [s for s in parts if s['cat']=='stitch_path']:
  pts=s['pts'];lens=np.r_[0,np.cumsum(np.linalg.norm(np.diff(np.array(pts),axis=0),axis=1))];length=float(lens[-1]);count=0
  for start in np.arange(gap/2,max(gap/2,length-(dash-width)),dash+gap):
   # Follow each corner within the dash instead of drawing a diagonal shortcut.
   distances=[start]+[float(x)for x in lens if start<x<start+dash-width]+[min(start+dash-width,length)]
   points=[tuple(point(pts,lens,d)*SS)for d in distances];w=max(2,round(width*SS));g.line(points,fill=(206,206,206,255),width=w,joint='curve')
   for x,y in [points[0],points[-1]]:g.ellipse((x-w/2,y-w/2,x+w/2,y+w/2),fill=(206,206,206,255))
   # Small soft light ridge defines thread relief without changing ownership.
   g.line([(x,y-w*.17)for x,y in points],fill=(255,255,255,255),width=max(1,w//3));count+=1
  pathReport.append({'name':s['name'],'points':len(pts),'length':length,'dashes':count})
 thread=np.array(thread.resize((W,H),Image.Resampling.LANCZOS));support=np.maximum.reduce([a for r,a in masks.items()if r not in ['laces','embroidery']]);thread[:,:,3]=np.minimum(thread[:,:,3],np.minimum(support,255-cutAlpha));visible=thread[:,:,3]>=128;ids[visible]=ns['stitching'];Image.fromarray(thread).save(out/'stitching.webp',lossless=True,method=6)
 key=f'scott_{view}_stitching';assets[key]=str((out/'stitching.webp').relative_to(APP));bbox['stitching']=list(Image.fromarray(thread[:,:,3]).getbbox()or[0,0,W,H]);bbox[key]=bbox['stitching'];zones.append({'id':'stitching','field':'stitching','n':ns['stitching'],'group':'stitching','label':'stitching'})
 for name,im in [('glove',Image.new('RGBA',(W,H))),('idmap',Image.fromarray(np.dstack([ids,ids,ids,np.full_like(ids,255)])))]:
  filename='empty.webp'if name=='glove'else'idmap.png';im.save(out/filename,**({'lossless':True}if name=='glove'else{}));assets[f'scott_{view}_{name}']=str((out/filename).relative_to(APP))
 defn={'revision':'SCOTT-BACK-PALM-R03','assets':{**{z['id']:f"scott_{view}_"+z['id']for z in zones},'glove':f'scott_{view}_glove','_idmap':f'scott_{view}_idmap'},'bbox':bbox,'zones':zones,'fieldsShown':[z['field']for z in zones],'materialResponse':responses,'traceSha256':report['sha256'],'embParts':embParts}
 # Remove only superseded aliases from runtime registration; Git/source originals remain.
 meta['assets']={k:v for k,v in meta['assets'].items()if not k.startswith('scott_'+view+'_')};meta['assets'].update(assets);meta['nativeBackTrace'if view=='back'else'nativePalmTrace']=defn;metaFile.write_text(json.dumps(meta,indent=2)+'\n')
 report['views'][view]={'shapes':len(parts),'laceContours':sum(s['cat']=='laces'for s in parts),'cutouts':sum(s['cat']in['opening','remove']for s in parts),'paths':pathReport,'visibleThreadPixels':int(visible.sum()),'dashLength':dash,'gap':gap,'width':width,'roles':[z['id']for z in zones]}
(AUDIT/'BUILD.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
