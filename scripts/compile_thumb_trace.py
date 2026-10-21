"""Build native thumb from Scott's exact polygons; never mutate the input trace."""
import base64,hashlib,io,json,re,argparse
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[1];APP=ROOT/'glove_builder/customiser';SS=4
p=argparse.ArgumentParser();p.add_argument('--trace',required=True);p.add_argument('--sources',required=True);p.add_argument('--report',required=True);a=p.parse_args()
raw=Path(a.trace).read_bytes();trace=json.loads(raw);src=json.loads(Path(a.sources).read_text())['thumb'];W,H=src['w'],src['h'];parts=[s for s in trace['shapes']if s['view']=='thumb'];metaPath=APP/'assets/thumb-data.json';meta=json.loads(metaPath.read_text());out=APP/'assets/thumb-scott-r12';out.mkdir(exist_ok=True)
fields=['palm','back1','back2','back3','web','belt','binding','welting','thumb_loops','laces','stitching'];ns={r:i+1 for i,r in enumerate(fields)}
def role(s):
 if s['cat']=='finger':
  m=re.search(r'Back\s*([1-9])',s['name'],re.I);return 'back'+m.group(1)if m else'palm'
 return s['cat']
own=Image.new('L',(W*SS,H*SS));cut=Image.new('L',own.size)
for s in sorted(parts,key=lambda s:ns.get(role(s),999)):
 r=role(s);pts=[(round(x*SS),round(y*SS))for x,y in s['pts']]
 if r in ns:ImageDraw.Draw(own).polygon(pts,fill=ns[r])
 elif r in ['opening','remove']:ImageDraw.Draw(cut).polygon(pts,fill=255)
 elif r!='stitch_path':raise ValueError(r)
own.paste(0,mask=cut);ids=np.array(own.resize((W,H),Image.Resampling.NEAREST));cutA=np.array(cut.resize((W,H),Image.Resampling.LANCZOS));rgb=np.array(Image.open(io.BytesIO(base64.b64decode(src['render'].split(',')[1]))).convert('RGB')).astype(float);lum=rgb@np.array([.2126,.7152,.0722]);old=np.array(Image.open(io.BytesIO(base64.b64decode(src['idmap'].split(',')[1]))).convert('RGB'))[:,:,0];ref=np.full((H,W),220.)
for i,z in enumerate(src['legend'],1):
 c=np.array([int(z['hex'][j:j+2],16)for j in [1,3,5]]);ref[old==i]=max(30,c@np.array([.2126,.7152,.0722]))
light=np.clip(lum/ref,.2,1.15);assets={};bbox={};zones=[];responses={};masks={}
for r,n in ns.items():
 if r=='stitching':continue
 mask=Image.eval(own,lambda v:255 if v==n else 0).resize((W,H),Image.Resampling.LANCZOS);alpha=np.minimum(np.array(mask),255-cutA)
 if not alpha.any():continue
 masks[r]=alpha
 if r in ['laces','thumb_loops']:
  z=next(z for z in src['legend']if z['field']=='laces');c=np.array([int(z['hex'][j:j+2],16)for j in [1,3,5]]);tone=np.clip(lum/max(30,c@np.array([.2126,.7152,.0722])),.45,1.06)
 else:
  # Smooth lighting only; polygon alpha stays exact and independent.
  selected=(ids==n).astype(float);num=np.array(Image.fromarray(np.uint8(np.clip(light*selected*220,0,255))).filter(ImageFilter.GaussianBlur(9))).astype(float);den=np.array(Image.fromarray(np.uint8(selected*255)).filter(ImageFilter.GaussianBlur(9))).astype(float)/255
  smooth=num/np.maximum(den,.001)/220;tone=np.clip(.965+(smooth-.965)*.10,.92,1.015)
 rgba=np.empty((H,W,4),np.uint8);rgba[:,:,:3]=np.clip(tone[:,:,None]*255,0,255).astype('uint8');rgba[:,:,3]=alpha;key='scott_thumb_'+r;Image.fromarray(rgba).save(out/(r+'.webp'),lossless=True,method=6);assets[key]=str((out/(r+'.webp')).relative_to(APP));bbox[r]=list(mask.getbbox());bbox[key]=bbox[r];zones.append({'id':r,'field':r,'n':n,'group':'lace'if r in ['laces','thumb_loops','binding','welting']else'leather','label':r});responses[r]={'grainStrength':0,'calibration':{'lo':235,'mid':246,'high':255}}
# Old web stitching is absent. Only explicitly drawn open stitch paths are used.
thread=Image.new('RGBA',(W*SS,H*SS));g=ImageDraw.Draw(thread);pathReport=[]
for s in parts:
 if s['cat']!='stitch_path':continue
 pts=np.array(s['pts'],float);lens=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pts,axis=0),axis=1))];length=lens[-1];count=0
 def point(d):
  i=min(len(pts)-1,max(1,int(np.searchsorted(lens,d,side='right'))));return pts[i-1]+(pts[i]-pts[i-1])*(d-lens[i-1])/max(1e-6,lens[i]-lens[i-1])
 for start in np.arange(1, max(1,length-2.5),5.4):
  points=[tuple(point(d)*SS)for d in [start]+[float(x)for x in lens if start<x<start+2.5]+[min(length,start+2.5)]];width=5;g.line(points,fill=(225,225,225,255),width=width,joint='curve')
  for x,y in [points[0],points[-1]]:g.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=(225,225,225,255))
  count+=1
 pathReport.append({'name':s['name'],'points':len(pts),'dashes':count})
thread=np.array(thread.resize((W,H),Image.Resampling.LANCZOS));support=np.maximum.reduce([v for k,v in masks.items()if k not in ['laces','thumb_loops']]);thread[:,:,3]=np.minimum(thread[:,:,3],support);ids[thread[:,:,3]>=128]=ns['stitching'];Image.fromarray(thread).save(out/'stitching.webp',lossless=True,method=6);assets['scott_thumb_stitching']=str((out/'stitching.webp').relative_to(APP));bbox['stitching']=list(Image.fromarray(thread[:,:,3]).getbbox()or(0,0,W,H));zones.append({'id':'stitching','field':'stitching','n':ns['stitching'],'group':'stitching','label':'stitching'})
Image.new('RGBA',(W,H)).save(out/'empty.webp',lossless=True);Image.fromarray(np.dstack([ids,ids,ids,np.full_like(ids,255)])).save(out/'idmap.png');assets.update(scott_thumb_glove=str((out/'empty.webp').relative_to(APP)),scott_thumb_idmap=str((out/'idmap.png').relative_to(APP)))
meta['assets'].update(assets);meta['nativeHContour']={'revision':'SCOTT-BACK-PALM-R03','assets':{**{z['id']:'scott_thumb_'+z['id']for z in zones},'glove':'scott_thumb_glove','_idmap':'scott_thumb_idmap'},'zones':zones,'bbox':bbox,'materialResponse':responses,'fieldsShown':fields,'traceSha256':hashlib.sha256(raw).hexdigest()};metaPath.write_text(json.dumps(meta,indent=2)+'\n');Path(a.report).write_text(json.dumps({'traceSha256':hashlib.sha256(raw).hexdigest(),'shapes':len(parts),'paths':pathReport,'roles':[z['id']for z in zones]},indent=2))
