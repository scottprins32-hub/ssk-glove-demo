"""Split the photographed Back 8 side panel from the Back 7 ring finger.

The seam follows the red/orange join in the original rainbow back photo,
registered at 929 x 1100. Preserve all original assets and illumination.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'glove_builder/customiser'
ASSETS = ROOT / 'assets'
OUT = ASSETS / 'back8-split-r01'
SEAM = [(215,202),(209,215),(202,235),(196,260),(188,290),(184,320),
        (180,350),(173,380),(169,410),(164,440),(159,470),(156,500),
        (156,530),(159,555),(160,580),(162,605),(168,630),(177,655),
        (183,680),(188,705),(193,730),(200,755),(209,780),(220,805),
        (233,830),(240,860),(242,900)]


def build():
    OUT.mkdir(exist_ok=True)
    data_path = ASSETS / 'glove-data.json'
    d = json.loads(data_path.read_text())
    mask = Image.new('1', (929,1100))
    ImageDraw.Draw(mask).polygon([(0,202),*SEAM,(0,900)],fill=1)
    mask.save(OUT / 'ownership.png')
    def split(source, names):
        source = Image.open(ASSETS / source).convert('RGBA')
        for name, side in zip(names, (False, True)):
            target = source.copy()
            target.putalpha(Image.composite(source.getchannel('A'),Image.new('L',source.size), mask if side else mask.point(lambda x: 1-x)))
            target.save(OUT / (name+'.png'))
            d['assets'][name]='assets/back8-split-r01/'+name+'.png'
            d['bbox'][name]=[0,0,929,1100]
    split('clean-edges-r01/back78.png', ['back78','back8'])
    # Highlights remain source-sized images; the same physical partition applies.
    split('back78_hi.webp',['back78_hi','back8_hi'])
    split('clean-edges-r01/back-heal-back78.png',['clean_edge_heal_back78','clean_edge_heal_back8'])
    for zone in d['zones']:
        if zone['id']=='back78': zone['label']='Back 7 - whole ring finger'
    if not any(z['id']=='back8' for z in d['zones']):
        d['zones'].insert(2,dict(id='back8',n=20,group='leather',label='Back 8 - pinky side panel'))
    d['materialSources']['back8']='back78_edge_original'
    # Both healing fragments keep the original calibrated light field.
    d['assets']['back78_heal_original']='assets/clean-edges-r01/back-heal-back78.png'
    d['bbox']['back78_heal_original']=[0,0,929,1100]
    d['materialResponse']['back78_heal_original']=d['materialResponse']['clean_edge_heal_back78']
    for key in ['clean_edge_heal_back78','clean_edge_heal_back8']:
        d['materialSources'][key]='back78_heal_original'
    if ['clean_edge_heal_back8','back8'] not in d['weltEdgeHealing']:
        at=d['weltEdgeHealing'].index(['clean_edge_heal_back78','back78'])+1
        d['weltEdgeHealing'].insert(at,['clean_edge_heal_back8','back8'])
    d['sheen']['back8']=d['sheen']['back78']
    # Keep the static map consistent as well as draw-derived hit testing.
    im=Image.open(ASSETS/'idmap.png').convert('RGBA')
    pixels=im.load(); select=mask.load()
    for y in range(im.height):
        for x in range(im.width):
            if select[x,y] and pixels[x,y][0]==3:
                r,g,b,a=pixels[x,y];pixels[x,y]=(20,g,b,a)
    im.save(OUT/'idmap.png')
    d['assets']['_idmap']='assets/back8-split-r01/idmap.png'
    # Keep each aliased material family on identical, padded working bounds.
    # These rectangles change processing area only, never image pixels.
    for names, box in [
        (['back78','back8','back78_edge_original'],[124,96,338,895]),
        (['clean_edge_heal_back78','clean_edge_heal_back8','back78_heal_original'],[138,105,308,811])]:
        for name in names: d['bbox'][name]=box
    data_path.write_text(json.dumps(d,indent=2)+'\n')

if __name__=='__main__': build()
