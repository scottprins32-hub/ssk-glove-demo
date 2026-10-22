"""Separate hood leather and two open, spaced stitch rows. Originals stay untouched."""
from pathlib import Path
import json,numpy as np
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];A=R/'glove_builder/customiser';out=A/'assets/hood-thread-r02';out.mkdir(exist_ok=True)
original=Image.open(A/'assets/hood.webp').convert('RGBA');rgba=np.array(original);alpha=rgba[:,:,3].copy();rgba[:,:,:3]=246;Image.fromarray(rgba).save(out/'hood.webp',lossless=True);Image.new('RGBA',original.size).save(out/'empty.webp',lossless=True)
control=np.array([[444,735],[439,698],[436,650],[434,595],[434,541],[436,501],[442,478],[455,459],[474,446],[494,441],[514,443],[532,452],[545,469],[552,492],[556,521],[557,557],[556,596],[554,635]],float)
path=[]
for i in range(len(control)-1):
 a,b,c,d=control[max(0,i-1)],control[i],control[i+1],control[min(len(control)-1,i+2)]
 for t in np.linspace(0,1,32,endpoint=False):path.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
path=np.array(path+[control[-1]]);tangent=np.gradient(path,axis=0);normal=np.column_stack([-tangent[:,1],tangent[:,0]])/np.maximum(.001,np.linalg.norm(tangent,axis=1)[:,None]);SS=4;canvas=Image.new('RGBA',(original.width*SS,original.height*SS));draw=ImageDraw.Draw(canvas);rows=[]
for offset in [0,3.4]:
 pts=path+normal*offset;lens=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pts,axis=0),axis=1))];count=0
 for start in np.arange(1,lens[-1]-2.5,5.4):
  ds=np.linspace(start,start+2.5,6);xy=np.column_stack([np.interp(ds,lens,pts[:,k])for k in [0,1]])*SS;draw.line([tuple(x)for x in xy],fill=(225,225,225,255),width=5,joint='curve')
  for x,y in [xy[0],xy[-1]]:draw.ellipse((x-2.5,y-2.5,x+2.5,y+2.5),fill=(225,225,225,255))
  count+=1
 rows.append({'offset':offset,'dashes':count,'start':pts[0].tolist(),'end':pts[-1].tolist()})
thread=np.array(canvas.resize(original.size,Image.Resampling.LANCZOS));thread[:,:,3]=np.minimum(thread[:,:,3],alpha);Image.fromarray(thread).save(out/'stitching.png')
p=A/'assets/glove-data.json';meta=json.loads(p.read_text());meta['assets'].update(hood='assets/hood-thread-r02/hood.webp',hood_hi='assets/hood-thread-r02/empty.webp',hood_stitching='assets/hood-thread-r02/stitching.png');meta['bbox']['hood_stitching']=list(Image.fromarray(thread[:,:,3]).getbbox());p.write_text(json.dumps(meta,indent=2)+'\n');audit=R/'outputs/hood-thread-r02';audit.mkdir(exist_ok=True);(audit/'BUILD.json').write_text(json.dumps({'rows':rows,'width':1.25,'dash':2.5,'gap':2.9,'alphaPreserved':bool(np.array_equal(alpha,rgba[:,:,3]))},indent=2))
