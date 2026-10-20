"""Install the generated thread PNG losslessly and give visible stitches their own pick ownership."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];app=root/'glove_builder/customiser';out=app/'assets/palm-scott-trace-r01'
thread=Image.open(root/'outputs/palm-scott-trace-r01/stitching.png').convert('RGBA')
web=np.array(Image.open(out/'web.webp').convert('RGBA'))[:,:,3];rgba=np.array(thread);rgba[:,:,3]=np.minimum(rgba[:,:,3],web);Image.fromarray(rgba).save(out/'stitching.webp',lossless=True,method=6)
d=json.loads((app/'assets/palm-data.json').read_text());n=next(z['n']for z in d['nativePalmTrace']['zones']if z['id']=='stitching');im=np.array(Image.open(out/'idmap.png').convert('RGBA'));im[(im[:,:,0]==n),:3]=2;im[rgba[:,:,3]>=128,:3]=n;Image.fromarray(im).save(out/'idmap.png')
print('Visible thread pixels registered:',int((rgba[:,:,3]>=128).sum()))
