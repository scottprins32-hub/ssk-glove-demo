"""The traced back without its H-web, so every other web sits on the same body.

Scott's back trace (outputs/back-lace-r18) names each contour. This compiles
the same polygons a second time with the H-web, its lacing and the knot left
out: where they covered a panel, the panel's own polygon now owns the pixel,
so the leather under the knot and under the web's foot is whole. Panels the
H-web never touched come out byte-identical, and the script proves it reads
the trace the way the compiler does by reproducing every compiled layer's
alpha first.

Scott traced the panels round the lace, not under it, so the knot and the
web's foot leave a gap in the leather once they are gone. Where the earlier
photographed panels show there was glove under them, the gap is closed with
the nearest traced panel: its outline joins the trace exactly, and its tone
is the panel's own smooth light carried across (the compiled panels are a
smooth light field, so this is the same leather, not a patch).
Body thread is laid again along Scott's open stitch rows, without the rows
that sit on the web. The engine uses these layers only while a web other
than H is chosen.

    python3 scripts/derive_traced_back_swap.py [--check]
"""
import argparse, json, re, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]; APP = ROOT / 'glove_builder/customiser'; SS = 4
FIELDS = ['palm', 'back2', 'back78', 'back8', 'back6', 'back5', 'back4', 'back3', 'web', 'belt', 'lining', 'binding',
          'welting', 'pinky_loops', 'laces', 'embroidery', 'stitching']
NS = {f: i + 1 for i, f in enumerate(FIELDS)}
# H-web lacing and the calibration knot, by trace name. Two contours are both
# called "Veters 12": the knot is the wide one, the other is body lacing by
# the binding, so that name is settled by where the contour lies.
WEB_LACES = {'Veters · voortrace 6', 'Veters · voortrace 7', 'Veters · voortrace 8', 'Veters · voortrace 9',
             'Veters · voortrace 10', 'Veters · voortrace 11', 'Veters · voortrace 12',
             'Veters 9', 'Veters 10', 'Veters 11', 'Veters 13', 'Veters 16'}

def role(s):
    r = s['cat']
    if r == 'finger':
        m = re.search(r'Back\s*([1-9])', s['name'], re.I); r = 'back' + m.group(1) if m else 'palm'
    return {'back7': 'back78', 'ring_emb': 'embroidery'}.get(r, r)
def of_web(s):
    xs = [p[0] for p in s['pts']]
    if s['cat'] == 'web': return True
    if s['cat'] == 'opening': return True          # the gap in the H-web itself
    return s['cat'] == 'laces' and (s['name'] in WEB_LACES or (s['name'] == 'Veters 12' and max(xs) - min(xs) > 200))
def poly(im, pts, fill): ImageDraw.Draw(im).polygon([(round(x * SS), round(y * SS)) for x, y in pts], fill=fill)

def ownership(parts, W, H):
    """Exactly compile_traced_back_palm.py: later roles own over earlier ones."""
    cut = Image.new('L', (W * SS, H * SS)); own = Image.new('L', cut.size)
    for s in sorted(parts, key=lambda s: NS.get(role(s), 999)):
        r = role(s)
        if r in NS: poly(own, s['pts'], NS[r])
        elif r in ('opening', 'remove'): poly(cut, s['pts'], 255)
    cut_alpha = np.array(cut.resize((W, H), Image.Resampling.LANCZOS)); own.paste(0, mask=cut)
    masks = {}
    for r, n in NS.items():
        if r == 'stitching': continue
        mask = Image.eval(own, lambda p, n=n: 255 if p == n else 0).resize((W, H), Image.Resampling.LANCZOS)
        masks[r] = np.minimum(np.array(mask), 255 - cut_alpha)
    return masks, cut_alpha, np.array(own.resize((W, H), Image.Resampling.NEAREST))

def threads(paths, masks, cut_alpha, W, H):
    """The compiler's stitch rows: short rounded dashes by arc length."""
    thread = Image.new('RGBA', (W * SS, H * SS)); g = ImageDraw.Draw(thread); dash = 4; gap = dash * .42; width = dash * .34
    def point(pts, lens, d):
        i = int(np.searchsorted(lens, d, side='right')); i = max(1, min(len(pts) - 1, i)); a = np.array(pts[i - 1]); b = np.array(pts[i])
        t = (d - lens[i - 1]) / max(.000001, lens[i] - lens[i - 1]); return a + (b - a) * t
    for s in paths:
        pts = s['pts']; lens = np.r_[0, np.cumsum(np.linalg.norm(np.diff(np.array(pts), axis=0), axis=1))]; length = float(lens[-1])
        for start in np.arange(gap / 2, max(gap / 2, length - (dash - width)), dash + gap):
            distances = [start] + [float(x) for x in lens if start < x < start + dash - width] + [min(start + dash - width, length)]
            points = [tuple(point(pts, lens, d) * SS) for d in distances]; w = max(2, round(width * SS))
            g.line(points, fill=(206, 206, 206, 255), width=w, joint='curve')
            for x, y in [points[0], points[-1]]: g.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=(206, 206, 206, 255))
            g.line([(x, y - w * .17) for x, y in points], fill=(255, 255, 255, 255), width=max(1, w // 3))
    thread = np.array(thread.resize((W, H), Image.Resampling.LANCZOS))
    support = np.maximum.reduce([a for r, a in masks.items() if r not in ('laces', 'embroidery')])
    thread[:, :, 3] = np.minimum(thread[:, :, 3], np.minimum(support, 255 - cut_alpha)); return thread

def build():
    meta = json.loads((APP / 'assets/glove-data.json').read_text()); defn = meta['nativeBackTrace']
    trace = json.loads((ROOT / defn['traceSource']).read_text()); W, H = meta['w'], meta['h']
    parts = [s for s in trace['shapes'] if s['view'] == 'back']
    def layer(r): return np.array(Image.open(APP / meta['assets'][defn['assets'][r]]).convert('RGBA'))
    full, full_cut, ids = ownership(parts, W, H)
    paths = [s for s in parts if s['cat'] == 'stitch_path']
    have = {r: layer(r) for r in FIELDS if r in defn['assets']}
    # The proof: this reading of the trace gives back every compiled layer.
    for r, a in full.items():
        if r in have and not np.array_equal(a, have[r][:, :, 3]): sys.exit(f'{r}: this script no longer reads the trace as the compiler did')
    if not np.array_equal(threads(paths, full, full_cut, W, H)[:, :, 3], have['stitching'][:, :, 3]): sys.exit('stitching: thread rows differ from the compiled layer')
    if sum(of_web(s) and s['cat'] == 'laces' for s in parts) != 13: sys.exit('expected 13 H-web lace contours')
    body, body_cut, _ = ownership([s for s in parts if not of_web(s)], W, H)
    # What the H-web covered, and the photographed leather that lay under it.
    gone = Image.new('L', (W * SS, H * SS))
    for s in parts:
        if of_web(s): poly(gone, s['pts'], 255)
    gone = cv2.dilate(np.array(gone.resize((W, H), Image.Resampling.LANCZOS)), np.ones((5, 5), np.uint8)) > 0
    def photo(key):
        return np.array(Image.open(APP / meta['assets'][key]).convert('RGBA').resize((W, H)))[:, :, 3] if key in meta['assets'] else np.zeros((H, W), np.uint8)
    leather = [z['id'] for z in meta['zones'] if z['group'] == 'leather' and z['id'] != 'web'] + list(meta.get('knotHeal', {}).values())
    # Under the web's own leather a panel polygon is only Scott's rough edge,
    # never meant to be seen: a panel grows there by the photograph alone.
    web_leather = Image.new('L', (W * SS, H * SS))
    for s in parts:
        if s['cat'] == 'web': poly(web_leather, s['pts'], 255)
    web_leather = cv2.dilate(np.array(web_leather.resize((W, H), Image.Resampling.LANCZOS)), np.ones((3, 3), np.uint8)) > 0
    for z in meta['nativeBackTrace']['zones']:
        if z['group'] == 'leather' and z['id'] in body and z['id'] != 'web':
            body[z['id']] = np.where(web_leather, np.minimum(body[z['id']], full[z['id']]), body[z['id']])
    under = np.maximum.reduce([photo(k) for k in leather])
    # The photographed panels also took in a strip of the knotted lace where it
    # hangs off the rim; knot_cut is the stencil that names it. Not leather.
    under = (under * (1 - photo('knot_cut') / 255.)).astype(np.uint8)
    panels = [r for r in body if r not in ('web', 'laces', 'embroidery') and body[r].any()]
    union = np.maximum.reduce([body[r] for r in panels])
    # The finger's edge runs straight on under a lace: closing the traced
    # finger over a lace's width joins the edge on either side of each knot.
    finger_solid = (full['back3'] >= 128).astype(np.uint8)
    finger_reach = cv2.morphologyEx(finger_solid, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))) > 0
    edge = np.clip(cv2.GaussianBlur(finger_reach.astype(np.float32), (0, 0), .7) * 255, 0, 255)
    add = np.where(gone, np.maximum(np.minimum(under, 255 - union), np.where(finger_reach, np.minimum(edge, 255 - union), 0)), 0).astype(np.uint8)
    # only gaps in the glove: a closed piece has to touch traced leather
    count, parts_map = cv2.connectedComponents((add >= 128).astype(np.uint8)); touch = cv2.dilate((union >= 128).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    joined = np.zeros(count, bool); joined[np.unique(parts_map[touch & (parts_map > 0)])] = True
    big = np.bincount(parts_map.ravel(), minlength=count) >= 40
    add = np.where(cv2.dilate((joined & big)[parts_map].astype(np.uint8), np.ones((3, 3), np.uint8)) > 0, add, 0).astype(np.uint8)
    # Each closed pixel goes to the traced panel nearest to it, with one rule
    # for the seam the knot crossed: what the closing gave the finger is
    # finger, the rest of the gap is the hand's. (Nearest alone, or the
    # photographed seam, runs a spur of finger leather out into the palm.)
    solid = np.stack([body[r] >= 128 for r in panels]); owner = np.zeros((H, W), np.int32); best = np.full((H, W), np.inf, np.float32)
    for i, r in enumerate(panels):
        dist = cv2.distanceTransform((~solid[i]).astype(np.uint8), cv2.DIST_L2, 5)
        if r in ('palm', 'back2'): dist = np.where(finger_reach, np.inf, dist)
        if r == 'back3': dist = np.where(finger_reach, dist, np.inf)
        near = dist < best; owner[near] = i; best[near] = dist[near]
    # A gap closes from leather beside it, not from a panel far down the glove.
    add = np.where(best <= 48, add, 0).astype(np.uint8)
    for i, r in enumerate(panels):
        body[r] = np.minimum(255, body[r].astype(np.int32) + np.where(owner == i, add, 0)).astype(np.uint8)
    out = {}
    for r, a in body.items():
        if r == 'web' or r not in have or np.array_equal(a, have[r][:, :, 3]): continue
        rgba = have[r].copy(); old = have[r][:, :, 3] > 0; new = (a > 0) & ~old
        if new.any():
            # the panel's own smooth light, carried into the pixels the web had covered
            tone = have[r][:, :, 0].astype(np.float32); w = old.astype(np.float32)
            spread = cv2.GaussianBlur(tone * w, (0, 0), 9) / np.maximum(.001, cv2.GaussianBlur(w, (0, 0), 9))
            far = cv2.GaussianBlur(w, (0, 0), 9) < .001
            spread[far] = np.median(tone[old]) if old.any() else 246
            fill = np.clip(np.round(spread), 0, 255).astype(np.uint8)
            for ch in range(3): rgba[:, :, ch] = np.where(new, fill, rgba[:, :, ch])
        rgba[:, :, 3] = a; out[r] = rgba
    # thread: Scott's rows, minus the ones that lie on the web
    def on_web(s): return np.mean([ids[min(H - 1, int(round(y))), min(W - 1, int(round(x)))] == NS['web'] for x, y in s['pts']]) > .5
    out['stitching'] = threads([s for s in paths if not on_web(s)], body, body_cut, W, H)
    return meta, defn, out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--check', action='store_true'); args = ap.parse_args()
    meta, defn, out = build(); folder = Path(meta['assets'][defn['assets']['laces']]).parent; swap = {}; stale = []
    for r, rgba in out.items():
        key = f'scott_back_{r}_body'; rel = folder / f'{r}-body.webp'; path = APP / rel
        box = list(Image.fromarray(rgba[:, :, 3]).getbbox())
        if args.check:
            got = np.array(Image.open(path).convert('RGBA')) if path.exists() else None
            # lossless WebP does not keep the colour of fully transparent pixels
            same = got is not None and np.array_equal(got[:, :, 3], rgba[:, :, 3]) and np.array_equal(got[rgba[:, :, 3] > 0], rgba[rgba[:, :, 3] > 0])
            if not same: stale.append(str(rel))
            if meta['assets'].get(key) != str(rel) or defn.get('swapAssets', {}).get(r) != key or defn['bbox'].get(key) != box: stale.append(key)
            continue
        Image.fromarray(rgba).save(path, lossless=True, method=6)
        meta['assets'][key] = str(rel); defn['bbox'][key] = box; swap[r] = key
    if args.check:
        if set(defn.get('swapAssets', {})) != set(out): stale.append('swapAssets')
        if stale: sys.exit('stale: ' + ', '.join(stale))
        print('traced back swap layers are current:', ', '.join(sorted(out))); return
    for key in [k for k in meta['assets'] if re.fullmatch(r'scott_back_\w+_body', k) and k not in swap.values()]:
        del meta['assets'][key]; defn['bbox'].pop(key, None)
    defn['swapAssets'] = swap
    (APP / 'assets/glove-data.json').write_text(json.dumps(meta, indent=2) + '\n')
    print('wrote', ', '.join(sorted(swap)))

if __name__ == '__main__': main()
