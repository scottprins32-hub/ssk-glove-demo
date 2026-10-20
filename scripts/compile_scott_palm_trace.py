"""Compile Scott's exact H-web palm polygons; never edit input contours or legacy assets."""
import argparse,base64,hashlib,io,json,re
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import cv2
ap=argparse.ArgumentParser();ap.add_argument('--tracer',required=True);ap.add_argument('--trace',required=True);args=ap.parse_args()
base=Path(__file__).resolve().parents[1];app=base/'glove_builder/customiser';out=app/'assets/palm-scott-trace-r01';out.mkdir(exist_ok=True)
source=json.loads(re.search(r'const DATA = (.*);',Path(args.tracer).read_text()).group(1))['views']['palm'];raw=Path(args.trace).read_bytes();trace=json.loads(raw);parts=[s for s in trace['shapes']if s['view']=='palm'];W,H=source['w'],source['h'];SS=4
fields=['palm','web','back1','back9','back3','back4','back6','back7','belt','binding','welting','thumb_loops','laces','stitching'];ns={f:i+1 for i,f in enumerate(fields)}
def role(s):
 if s['cat']!='finger':return s['cat']
 m=re.search(r'Back\s*([1-9])',s['name'],re.I)
 # Unnumbered inside-thumb finger leather is the palm continuation per Scott's instruction.
 return 'back'+m.group(1)if m else 'palm'
def poly(im,pts,fill):ImageDraw.Draw(im).polygon([(round(x*SS),round(y*SS))for x,y in pts],fill=fill)
cut=Image.new('L',(W*SS,H*SS));own=Image.new('L',cut.size)
# Same physical stacking as the configurator: panels, then trim, then lacing/thread.
for s in sorted(parts,key=lambda s:ns.get(role(s),999)):
 r=role(s)
 if r in ns:poly(own,s['pts'],ns[r])
 elif r in ['opening','remove']:poly(cut,s['pts'],255)
 else:raise ValueError('Unsupported role '+r)
cutAlpha=np.array(cut.resize((W,H),Image.Resampling.LANCZOS));
own.paste(0,mask=cut);ownNative=own.resize((W,H),Image.Resampling.NEAREST);ids=np.array(ownNative)
img=np.array(Image.open(io.BytesIO(base64.b64decode(source['render'].split(',')[1]))).convert('RGB')).astype(float)
old=np.array(Image.open(io.BytesIO(base64.b64decode(source['idmap'].split(',')[1]))).convert('RGB'))[:,:,0]
luma=img@[.2126,.7152,.0722];ref=np.full((H,W),220.)
for i,z in enumerate(source['legend'],1):
 c=np.array([int(z['hex'][j:j+2],16)for j in [1,3,5]]);ref[old==i]=max(30,float(c@[.2126,.7152,.0722]))
light=np.clip(luma/ref,.15,1.3).astype('float32')
# Remove the baked stamp from the material plate; the existing renderer draws its official artwork once.
stamp=np.zeros((H,W),np.uint8)
meta=json.loads((app/'assets/palm-data.json').read_text())
for m in meta.get('palmStamps',[]):
 x0,y0,x1,y1=m['box'];stamp[y0:y1,x0:x1]=((light[y0:y1,x0:x1]<.7)*255).astype('uint8')
light=cv2.inpaint(light,cv2.dilate(stamp,np.ones((3,3),np.uint8)),9,cv2.INPAINT_NS)
responses={};bbox={};assets={};zones=[];report={'sha256':hashlib.sha256(raw).hexdigest(),'inputShapes':len(trace['shapes']),'palmShapes':len(parts),'cutoutShapes':sum(s['cat']in['opening','remove']for s in parts),'laceContourCount':sum(s['cat']=='laces'for s in parts),'view':'palm','web':'native H only','files':{}}
for r,n in ns.items():
 mask=Image.eval(own,lambda p:255 if p==n else 0).resize((W,H),Image.Resampling.LANCZOS);alpha=np.minimum(np.array(mask),255-cutAlpha)
 if not np.any(alpha):continue
 tone=light.copy();selected=(ids==n).astype('float32');blur=cv2.GaussianBlur(light*selected,(0,0),14)/np.maximum(.001,cv2.GaussianBlur(selected,(0,0),14))
 if r=='palm':tone=np.clip(.965+(light-blur)*.18,.87,1.03)
 elif r=='web':tone=np.clip(.965+(light-blur)*.08,.93,1.015)
 else:tone=np.clip(light,.22,1.12)
 rgba=np.empty((H,W,4),np.uint8);rgba[:,:,:3]=np.clip(tone[:,:,None]*255,0,255).astype('uint8');rgba[:,:,3]=alpha
 key='scott_palm_'+r;name=r+'.webp';Image.fromarray(rgba).save(out/name,lossless=True,method=6);assets[key]='assets/palm-scott-trace-r01/'+name;bbox[r]=list(mask.getbbox());bbox[key]=bbox[r]
 group='stitching'if r=='stitching'else'lace'if r in['binding','welting','laces']else'leather';zones.append({'id':r,'field':r,'n':n,'group':group,'label':r})
 responses[r]={'grainStrength':0,'calibration':{'lo':235,'mid':246,'high':255}}
 report['files'][r]={'bytes':(out/name).stat().st_size,'alphaPixels':int(np.count_nonzero(alpha))}
# Generated thread is compiled separately, onto exactly this web support.
assets['scott_palm_stitching']='assets/palm-scott-trace-r01/stitching.webp';bbox['stitching']=[0,0,W,H];bbox['scott_palm_stitching']=bbox['stitching']
if not any(z['id']=='stitching'for z in zones):zones.append({'id':'stitching','field':'stitching','n':ns['stitching'],'group':'stitching','label':'stitching'})
Image.new('RGBA',(W,H)).save(out/'empty.webp',lossless=True);assets['scott_palm_glove']='assets/palm-scott-trace-r01/empty.webp'
a=np.zeros((H,W,4),np.uint8);a[:,:,:3]=ids[:,:,None];a[:,:,3]=255;Image.fromarray(a).save(out/'idmap.png');assets['scott_palm_idmap']='assets/palm-scott-trace-r01/idmap.png'
# Keep both untouched JSON and source-specific provenance outside the shipped asset tree.
audit=base/'outputs/palm-scott-trace-r01';audit.mkdir(exist_ok=True);(audit/'trace-original.json').write_bytes(raw);(audit/'BUILD.json').write_text(json.dumps(report,indent=2))
meta['assets'].update(assets);meta['nativePalmTrace']={'revision':'SCOTT-PALM-TRACE-R02','assets':{**{z['id']:'scott_palm_'+z['id']for z in zones},'glove':'scott_palm_glove','_idmap':'scott_palm_idmap'},'bbox':bbox,'zones':zones,'fieldsShown':[z['field']for z in zones],'materialResponse':responses,'traceSha256':report['sha256']};(app/'assets/palm-data.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(report,indent=2))
