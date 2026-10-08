"""Diagnostic three-zone source-body study, not production asset generation."""
from pathlib import Path
import sys,json,base64
import numpy as np,cv2
from PIL import Image
from scipy import ndimage
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root));import make_web as mw
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True);args=parser.parse_args()
out=args.out;out.mkdir(parents=True,exist_ok=True)
im,web,lace,finger,glove=mw.cut(mw.WEBS['standard-i']);a=np.asarray(im);hsv=cv2.cvtColor(a,cv2.COLOR_RGB2HSV)
# Existing source photo geometry, no warp and no synthesized fill.
alllace=glove&(hsv[...,0]>=10)&(hsv[...,0]<=35)&(hsv[...,1]>65)
alllace=ndimage.binary_closing(alllace,np.ones((2,2),bool))&glove
leather=glove&~alllace
# Cavity and embroidered/badge marks stay photographic in this diagnostic.
preserve=(hsv[...,2]<52)&glove
Y,X=np.indices(glove.shape)
leather&=~preserve;alllace&=~preserve
zones={'body':leather&~web,'web':leather&web,'laces':alllace}
lum=a.astype(float)@np.array([.299,.587,.114]);layers={}
for name,m in zones.items():
 # Preserve photographed shading and grain without the source hue.
 med=np.median(lum[m]);v=np.clip(lum/max(med,1),.1,1.65)
 grey=np.uint8(np.clip(v*190,0,255));rgba=np.dstack([grey,grey,grey,m.astype('uint8')*255]);p=out/(name+'.png');Image.fromarray(rgba).save(p);layers[name]=base64.b64encode(p.read_bytes()).decode()
base=np.dstack([a,glove.astype('uint8')*255]);base[...,3][~preserve]=0;p=out/'fixed.png';Image.fromarray(base).save(p);layers['fixed']=base64.b64encode(p.read_bytes()).decode()
# Keep proof raw and explicit; these masks are not the final 15-zone builder.
old=root.parent/'work/integrated-join-stitch-matrix/standard-i-RHT.png';old64=base64.b64encode(old.read_bytes()).decode()
html='''<!doctype html><meta charset="utf-8"><title>Standard I — geometrieproef</title><style>body{font:16px system-ui;background:#eee;color:#222;margin:24px}main{display:flex;gap:24px;flex-wrap:wrap}section{flex:1;min-width:300px}canvas,img{width:100%;max-height:72vh;object-fit:contain}label{margin-right:20px}p{max-width:900px;line-height:1.5}h1{font-size:24px}</style><h1>Standard I: passende brongeometrie</h1><p>Links de huidige samengestelde handschoen. Rechts een technische proef met de eigen vorm van de bronfoto: geen vervorming, geen dichtgevulde webopeningen. Dit is nog geen definitieve configurator: slechts drie kleurgebieden, bestaande pad en beeldmerken blijven bronafhankelijk.</p><label>Body <input type=color id=body value=#f2f0ea></label><label>Web <input type=color id=web value=#2a304a></label><label>Veters <input type=color id=laces value=#e8b84c></label><main><section><h2>Huidige versie</h2><img src="data:image/png;base64,OLD"></section><section><h2>Eigen bronvorm — experimenteel</h2><canvas id=c></canvas></section></main><script>const layers=LAYERS;const imgs={};const c=document.querySelector('#c');c.width=WIDTH;c.height=HEIGHT;async function init(){for(const [k,v]of Object.entries(layers)){let im=new Image();im.src='data:image/png;base64,'+v;await im.decode();imgs[k]=im}draw()}function draw(){let g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);for(let k of ['body','web','laces']){let b=document.createElement('canvas');b.width=c.width;b.height=c.height;let x=b.getContext('2d');x.drawImage(imgs[k],0,0);x.globalCompositeOperation='multiply';x.fillStyle=document.getElementById(k).value;x.fillRect(0,0,b.width,b.height);x.globalCompositeOperation='destination-in';x.drawImage(imgs[k],0,0);g.drawImage(b,0,0)}g.drawImage(imgs.fixed,0,0)}document.querySelectorAll('input').forEach(x=>x.oninput=draw);init();</script>'''.replace('OLD',old64).replace('LAYERS',json.dumps(layers)).replace('WIDTH',str(im.width)).replace('HEIGHT',str(im.height))
(out/'index.html').write_text(html)
print(out/'index.html')
