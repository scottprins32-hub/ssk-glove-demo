"""Build an isolated preview of the September shoot palm, never the live assets.

python glove_builder/build_store_palm.py --out work/palm-candidate/assets
Requires make_store_palm.py output. Source originals and shipped assets stay intact.
"""
import argparse
import json
from pathlib import Path
import shutil
import sys
import numpy as np
from PIL import Image
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / 'customiser'))
import build_palm
from build_assets import sheen_p95, match_sheen, tint_base

def main():
    p=argparse.ArgumentParser(); p.add_argument('--out',type=Path,required=True); args=p.parse_args()
    out=args.out.resolve()
    live=(HERE/'customiser/assets').resolve()
    if out == live or live in out.parents:
        raise ValueError('Candidate only: choose an output outside the shipped asset directory')
    out.mkdir(parents=True,exist_ok=True)
    for f in list(out.glob('palm/*')) + list(out.glob('palm-data.json')):
        if not f.is_file() or '.bak' in f.name: continue
        b=Path(str(f)+'.bak'); i=1
        while b.exists(): b=Path(str(f)+f'.bak.{i}'); i+=1
        shutil.copy2(f,b)
    data=json.loads((live/'glove-data.json').read_text())
    # Match measured current back-view material response rather than adding
    # the store lighting as a second, much stronger white specular layer.
    refs=['back2_hi','back3_hi','back4_hi','belt_hi','web_hi','laces_hi']
    samples=[sheen_p95(Image.open(HERE/'customiser'/data['assets'][key]))
             for key in refs if key in data['assets']]
    samples=[s for s in samples if s]
    if not samples: raise ValueError('No measured back-view sheen reference')
    target=tuple(np.median(samples,axis=0))
    build_palm.LAYERS=HERE/'layers/store-palm'; build_palm.OUT=out
    build_palm.MARKS=[(535,680,810,790),(695,795,800,875),(555,920,820,995)]
    build_palm.HEIGHT=1400
    build_palm.match_sheen=lambda sp,_:match_sheen(sp,target)
    build_palm.tint_base=lambda im:tint_base(im,flatten=.20)
    build_palm.main()
    meta=json.loads((out/'palm-data.json').read_text())
    meta['source']={'frame':'DSC05706','shoot':'2026-09-23','status':'candidate-not-approved',
                    'sheenReferenceP75P95':[float(v) for v in target]}
    (out/'palm-data.json').write_text(json.dumps(meta,separators=(',',':')))
if __name__=='__main__':main()
