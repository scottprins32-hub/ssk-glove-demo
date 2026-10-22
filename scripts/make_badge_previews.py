"""Create level catalogue thumbnails from registered wrist art; never alter glove artwork."""
import json
import pathlib
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'glove_builder/customiser'

def preview(image, angle):
    art = image.convert('RGBA').rotate(-angle, Image.Resampling.BICUBIC, expand=True)
    # Ignore disconnected near-transparent generation specks when framing;
    # this mask only finds the crop, it never changes artwork pixels.
    bounds = art.getchannel('A').point(lambda a: 255 if a >= 32 else 0).filter(ImageFilter.MedianFilter(9)).getbbox()
    if not bounds:
        raise ValueError('Empty badge artwork')
    x0,y0,x1,y1=bounds
    bounds=(max(0,x0-8),max(0,y0-8),min(art.width,x1+8),min(art.height,y1+8))
    art = art.crop(bounds)
    art.thumbnail((330, 200), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (350, 220))
    canvas.alpha_composite(art, ((350-art.width)//2, (220-art.height)//2))
    return canvas

def build():
    path = ROOT / 'assets/glove-data.json'
    data = json.loads(path.read_text())
    registries = [(ROOT / name) for name in ['hd-wrist-badges.json', 'silicone-badges.json']]
    named = {}
    for badge in data['bullets']:
        with Image.open(ROOT / data['assets'][badge['asset']]) as source:
            x,y,w,h = badge['sourceBox']
            image = preview(source.crop((x,y,x+w,y+h)), badge.get('artAngleDegrees',0))
        # Sibling derivatives preserve every previous preview and full-resolution source.
        target = pathlib.Path(badge['thumb']).with_name('level-r15-'+badge['asset']+'.webp')
        image.save(ROOT / target, 'WEBP', lossless=True, exact=True)
        badge['thumb'] = target.as_posix()
        named[badge['name']] = badge['thumb']
    path.write_text(json.dumps(data,indent=2)+'\n')
    for path in registries:
        rows=json.loads(path.read_text())
        for row in rows: row['thumb']=named[row['name']]
        path.write_text(json.dumps(rows,indent=2)+'\n')
    print('Aligned previews:',len(named))

if __name__ == '__main__': build()
