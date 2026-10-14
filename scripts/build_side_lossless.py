#!/usr/bin/env python3
"""Lossless transport derivatives; original photographic sources stay untouched.

Uses PNG compression (or verified opaque id-map WebP), retaining dimensions
and every RGBA byte (even transparent RGB). Excludes every PALM-P3 hash-pinned insert/mask. --check verifies the stored
mapping and all decoded bytes without modifying files.
"""
import argparse, hashlib, json, shutil
from pathlib import Path
from PIL import Image, PngImagePlugin

ROOT=Path(__file__).resolve().parents[1]/'glove_builder/customiser'
OUT=ROOT/'assets/side-lossless-r01'
MANIFEST=OUT/'manifest.json'
KEYS={
 'palm':'glove laces palm laces_hi web palm_hi binding web_hi _idmap binding_hi back9 _back9_opening_material welting back9_hi welting_hi _back9_opening_material_hi stitching'.split(),
 'thumb':'thumb_circle_art glove silhouette_glove h_detail_leather palm_bridge_h_detail_leather web mid_attachment_web back2 palm_bridge_back2 palm_bridge_h_detail_leather_hi laces h_detail_leather_hi stitch_audit_laces palm_bridge_palm back1 silhouette_back1 silhouette_welting palm laces_hi'.split(),
 'pinky':['welting'],
}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 check=argparse.ArgumentParser();check.add_argument('--check',action='store_true');args=check.parse_args()
 previous=json.loads(MANIFEST.read_text())['files'] if MANIFEST.exists() else []
 known={(r['view'],r['key']):r for r in previous}
 OUT.mkdir(parents=True,exist_ok=True);records=[]
 for view,keys in KEYS.items():
  path=ROOT/f'assets/{view}-data.json';d=json.loads(path.read_text())
  pinned={p['asset'] for e in d.get('palmWebs',{}).get('entries',{}).values() for p in [*e['parts'].values(),*([e['palmSupport']] if e.get('palmSupport') else [])]}
  pinned.update(m['asset'] for k,m in d.get('palmWebs',{}).items() if k in ['footprint','protected'])
  for key in keys:
   assert key not in pinned,key
   old=known.get((view,key));source=old['source'] if old else d['assets'][key]
   src=ROOT/source;webp=view=='palm' and key=='_idmap'
   dst=OUT/f"{view}-{key}.{'webp' if webp else 'png'}";rel=dst.relative_to(ROOT).as_posix()
   with Image.open(src) as im:
    expected=im.convert('RGBA');icc=im.info.get('icc_profile')
    if not args.check:
     if webp:expected.save(dst,'WEBP',lossless=True,exact=True,quality=100,method=6)
     else:
      # PNG and WebP decoders round translucent RGB differently. Keep PNG
      # on rendered layers; grayscale+alpha is safe only if all RGB bytes match.
      r,g,b,a=expected.split()
      image=Image.merge('LA',(r,a)) if r.tobytes()==g.tobytes()==b.tobytes() else expected
      info=PngImagePlugin.PngInfo()
      if 'srgb' in im.info:info.add(b'sRGB',bytes([im.info['srgb']]))
      image.save(dst,'PNG',optimize=True,compress_level=9,pnginfo=info,**({'icc_profile':icc} if icc else {}))
    with Image.open(dst) as encoded:
     assert encoded.size==expected.size and encoded.convert('RGBA').tobytes()==expected.tobytes(),key
     assert encoded.info.get('icc_profile')==icc,key
     if not webp:assert encoded.info.get('srgb')==im.info.get('srgb'),key
   if not args.check and dst.stat().st_size>src.stat().st_size:shutil.copyfile(src,dst)
   assert dst.stat().st_size<=src.stat().st_size,key
   if args.check:assert d['assets'][key]==rel,key
   else:d['assets'][key]=rel
   records.append(dict(view=view,key=key,source=source,output=rel,sourceSHA256=sha(src),outputSHA256=sha(dst),sourceBytes=src.stat().st_size,outputBytes=dst.stat().st_size,rgbaIdentical=True))
  if not args.check:path.write_text((json.dumps(d,separators=(',',':')) if view=='thumb' else json.dumps(d,indent=2))+'\n')
 result=dict(files=records,sourceBytes=sum(r['sourceBytes'] for r in records),outputBytes=sum(r['outputBytes'] for r in records))
 if not args.check:MANIFEST.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k!='files'}|{'files':len(records),'rgbaIdentical':True}))
if __name__=='__main__':main()
