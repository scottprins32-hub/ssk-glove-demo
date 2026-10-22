"""Fit the pad heel to binding and index/middle welting; closed double thread."""
from pathlib import Path
import json,numpy as np
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];A=R/'glove_builder/customiser';out=A/'assets/pad-thread-r01';out.mkdir(exist_ok=True);SS=4
original=Image.open(A/'assets/pad.webp').convert('RGBA');alpha=np.array(original)[:,:,3].copy()
def curve(control,closed=False):
 c=np.array(control,float);points=[]
 for i in range(len(c)if closed else len(c)-1):
  a,b,d,e=c[(i-1)%len(c)]if closed else c[max(0,i-1)],c[i],c[(i+1)%len(c)],c[(i+2)%len(c)]if closed else c[min(len(c)-1,i+2)]
  for t in np.linspace(0,1,32,endpoint=False):points.append(.5*(2*b+(-a+d)*t+(2*a-5*b+4*d-e)*t*t+(-a+3*b-3*d+e)*t*t*t))
 return np.array(points+[c[0]if closed else c[-1]])
heel=curve([[436,670],[436,710],[435,750],[434,780],[437,795],[475,802],[525,802],[550,795],[553,780],[553,740],[553,700],[553,670]])
mask=Image.new('L',(original.width*SS,original.height*SS));ImageDraw.Draw(mask).polygon([tuple(p*SS)for p in heel],fill=255);new=np.array(mask.resize(original.size,Image.Resampling.LANCZOS));alpha[670:]=new[670:];rgba=np.full((original.height,original.width,4),246,np.uint8);rgba[:,:,3]=alpha;Image.fromarray(rgba).save(out/'pad.webp',lossless=True);Image.new('RGBA',original.size).save(out/'empty.webp',lossless=True)
control=[[495,451],[477,456],[462,473],[451,496],[445,526],[441,566],[440,612],[440,659],[440,707],[439,749],[439,770],[443,778],[482,781],[527,781],[547,778],[550,762],[550,718],[550,670],[550,620],[548,573],[545,530],[538,496],[528,473],[514,457]]
path=curve(control,True);tangent=np.gradient(path,axis=0);normal=np.column_stack([-tangent[:,1],tangent[:,0]])/np.maximum(.001,np.linalg.norm(tangent,axis=1)[:,None]);canvas=Image.new('RGBA',(original.width*SS,original.height*SS));draw=ImageDraw.Draw(canvas);rows=[]
for offset in [0,-3.4]:
 pts=path+normal*offset;lens=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pts,axis=0),axis=1))];count=0
 for start in np.arange(1,lens[-1]-2.5,5.4):
  ds=np.linspace(start,start+2.5,6);xy=np.column_stack([np.interp(ds,lens,pts[:,k])for k in [0,1]])*SS;draw.line([tuple(p)for p in xy],fill=(225,225,225,255),width=5,joint='curve')
  for x,y in [xy[0],xy[-1]]:draw.ellipse((x-2.5,y-2.5,x+2.5,y+2.5),fill=(225,225,225,255))
  count+=1
 rows.append({'offset':offset,'dashes':count,'closed':True})
thread=np.array(canvas.resize(original.size,Image.Resampling.LANCZOS));thread[:,:,3]=np.minimum(thread[:,:,3],alpha);Image.fromarray(thread).save(out/'stitching.png')
p=A/'assets/glove-data.json';m=json.loads(p.read_text());m['assets'].update(pad='assets/pad-thread-r01/pad.webp',pad_hi='assets/pad-thread-r01/empty.webp',pad_stitching='assets/pad-thread-r01/stitching.png');m['bbox']['pad']=list(Image.fromarray(alpha).getbbox());m['bbox']['pad_hi']=m['bbox']['pad'];m['bbox']['pad_stitching']=list(Image.fromarray(thread[:,:,3]).getbbox());m.setdefault('fingerThread',{})['pad']='pad_stitching';m['padBindingUnder']=[430,786,557,1100];p.write_text(json.dumps(m,indent=2)+'\n');audit=R/'outputs/pad-thread-r01';audit.mkdir(exist_ok=True);(audit/'BUILD.json').write_text(json.dumps({'rows':rows,'heelControl':heel[::32].tolist(),'unchangedAboveY':670,'dash':2.5,'gap':2.9},indent=2))
