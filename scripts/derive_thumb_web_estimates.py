"""The thumb side of every web, estimated from its palm side.

Only the H-web was ever photographed and traced from the thumb side. The
other eight exist from the back and, as an estimate, from the palm. From the
thumb side a glove shows the same web the palm shows, seen from its other
face: the same straps, lacing and thread, mirrored.

So each web's palm layers are carried over to the thumb side by one plane
mapping. The mapping is fitted once, on the web that exists on both sides:
it lays the place the traced H-web has on the palm side (windows and bays
closed) over the place it has on the thumb side, as well as a plane can. Leather the palm side could not see (it tucks behind
the thumb there) is carried on from the leather beside it, so the web meets
the thumb; a real window stays a window. Everything is cut to the place the
traced H-web has on the thumb side, and the engine draws it behind the
traced body, which hides what the fingers and thumb cover.

This is an estimate and the app says so. It is not a photograph.

    python3 scripts/derive_thumb_web_estimates.py [--check] [--fit]

--fit computes the mapping again from the two traces (a minute or two);
without it the mapping stored in thumb-data.json is used.
"""
import argparse, json, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]; APP = ROOT / 'glove_builder/customiser'
OUT = APP / 'assets/thumb-web-estimate-r01'; REVISION = 'THUMB-WEB-ESTIMATE-R01'
ROLES = ['leather', 'laces', 'stitching']
TIE_AREA = 4500      # a lace piece smaller than this, beside the web, is a strap end of the H-web
# How wide a notch the H-web may have cut in a panel and still be closed, and
# the panel that shows only as a strip along the outline (the index finger's side).
PANEL_REACH, STRIPS = 85, {'back3'}
# the four H-web windows, palm side -> thumb side (window centres), to start the fit from
START = ([[585, 330], [630, 579], [427, 417], [496, 672]], [[312, 286], [216, 497], [458, 366], [345, 576]])


def load(name): return json.loads((APP / f'assets/{name}-data.json').read_text())
def alpha(meta, trace, zone): return np.array(Image.open(APP / meta['assets'][trace['assets'][zone]]).convert('RGBA'))[:, :, 3]


def body(meta, trace):
    """(everything drawn, the web) of a traced side, as 0/1 masks."""
    full = None
    for zone in trace['zones']:
        if zone['id'] in trace['assets']:
            a = alpha(meta, trace, zone['id']); full = a if full is None else np.maximum(full, a)
    return (full > 127).astype(np.uint8), (alpha(meta, trace, 'web') > 127).astype(np.uint8)


def windows(full, web):
    """The web's windows and bays: page enclosed by the glove once hairline gaps are closed."""
    closed = cv2.morphologyEx(full, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats((closed == 0).astype(np.uint8), connectivity=4)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
    near = cv2.dilate(web, np.ones((31, 31), np.uint8)) > 0
    return [lab == i for i in range(1, n) if i not in edge and stats[i, cv2.CC_STAT_AREA] > 1500
            and ((lab == i) & near).sum() > .3 * stats[i, cv2.CC_STAT_AREA]]


def filled(mask):
    closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = np.zeros_like(mask); cv2.drawContours(out, contours, -1, 1, -1); return out


def place_of(full, web):
    """The place a web has on a side: the traced H-web with its windows and bays, as one shape."""
    space = web.copy()
    for window in windows(full, web): space[window] = 1
    # the H-web's strap ends make steps along its free edge; another web has none
    return cv2.morphologyEx(filled(space), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))


def fit(source, target, size):
    """Plane mapping that lays the web's place on the palm side over its place on the thumb side."""
    target = target > 0
    def miss(h):
        w = cv2.warpPerspective(source * 255, np.append(h, 1).reshape(3, 3), size, flags=cv2.INTER_LINEAR) > 127
        return 1 - (w & target).sum() / max(1, (w | target).sum())
    start = cv2.getPerspectiveTransform(np.float32(START[0]), np.float32(START[1]))
    best = (start / start[2, 2]).flatten()[:8]; cost = miss(best)
    scale = np.array([.02, .02, 6, .02, .02, 6, 2e-5, 2e-5]); step = 1.0
    while step > .02:
        better = False
        for i in range(8):
            for sign in (1, -1):
                h = best.copy(); h[i] += sign * step * scale[i]; c = miss(h)
                if c < cost - 1e-6: best, cost, better = h, c, True
        if not better: step /= 2
    return [round(float(v), 9) for v in best], round(float(1 - cost), 4)


def carried(path, H, size):
    """A palm layer on the thumb side: (rgb 0..1, alpha 0..1)."""
    im = np.array(Image.open(path).convert('RGBA')).astype(np.float32) / 255
    pre = np.dstack([im[:, :, :3] * im[:, :, 3:4], im[:, :, 3]])
    w = cv2.warpPerspective(pre, H, size, flags=cv2.INTER_LINEAR)
    a = w[:, :, 3]
    return np.where(a[:, :, None] > 1e-4, w[:, :, :3] / np.maximum(a[:, :, None], 1e-4), 0), a


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true'); parser.add_argument('--fit', action='store_true')
    args = parser.parse_args()
    palm, thumb = load('palm'), load('thumb')
    size = (thumb['w'], thumb['h'])
    palm_full, palm_web = body(palm, palm['nativePalmTrace'])
    thumb_full, thumb_web = body(thumb, thumb['nativeHContour'])
    stored = thumb.get('thumbWebEstimates') or {}
    if args.fit or not stored.get('mapping'):
        if args.check: sys.exit('stale: no stored mapping')
        mapping, overlap = fit(place_of(palm_full, palm_web), place_of(thumb_full, thumb_web), size)
    else: mapping, overlap = stored['mapping'], stored.get('outlineOverlap')
    H = np.append(np.array(mapping, np.float64), 1).reshape(3, 3)

    place = place_of(thumb_full, thumb_web)
    # It may run on under the fingers and thumb, which are drawn over it; where
    # its place meets the page, the place's own traced edge is the outline.
    covered = (thumb_full > 0) & (thumb_web == 0)
    under = cv2.dilate(place, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))) > 0
    envelope = cv2.GaussianBlur(((place > 0) | (under & covered)).astype(np.float32), (0, 0), .7)
    rim = cv2.dilate(covered.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (29, 29))) > 0
    # what the palm side could not see of it
    hidden = cv2.warpPerspective((((palm_full > 0) & (palm_web == 0)) * 255).astype(np.uint8), H, size) > 127

    entries, assets, boxes, stale = {}, {}, {}, []
    def put(key, name, rgba):
        """Write (or, with --check, compare) one layer and register it."""
        rgba[rgba[:, :, 3] == 0] = 0
        rel = OUT.relative_to(APP) / name; box = list(Image.fromarray(rgba[:, :, 3]).getbbox())
        assets[key] = str(rel); boxes[key] = box
        if args.check:
            path = APP / rel; got = np.array(Image.open(path).convert('RGBA')) if path.exists() else None
            same = got is not None and np.array_equal(got[:, :, 3], rgba[:, :, 3]) and np.array_equal(got[rgba[:, :, 3] > 0], rgba[rgba[:, :, 3] > 0])
            if not same: stale.append(str(rel))
            if thumb['assets'].get(key) != str(rel) or thumb['bbox'].get(key) != box: stale.append(key)
            return
        OUT.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba).save(APP / rel, lossless=True, method=6)

    for slug, entry in palm['palmWebs']['entries'].items():
        parts = {role: entry['parts'][role]['asset'] for role in ROLES}
        if entry.get('palmSupport'): parts['support'] = entry['palmSupport']['asset']
        layers = {role: list(carried(APP / palm['assets'][key], H, size)) for role, key in parts.items()}
        rgb, a = layers['leather']
        solid = (a > .5).astype(np.uint8)
        if solid.any():
            dist, lab = cv2.distanceTransformWithLabels((solid == 0).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
            ys, xs = np.nonzero(solid); nearest = np.zeros((lab.max() + 1, 2), np.int32); nearest[lab[ys, xs]] = np.stack([ys, xs], 1)
            # unseen from the palm: carried on from the leather beside it. And a
            # sliver between leather and the finger it is laced to is leather.
            margin = (under & (solid == 0)) & ((hidden & (dist < 110)) | (rim & (dist < 22)))
            my, mx = np.nonzero(margin); sy, sx = nearest[lab[my, mx]].T
            rgb[my, mx] = rgb[sy, sx]; a[my, mx] = 1
            smooth = cv2.GaussianBlur(rgb, (0, 0), 3); rgb[my, mx] = smooth[my, mx]
        entries[slug] = {}
        for role, (rgb, a) in layers.items():
            rgba = (np.dstack([np.clip(rgb, 0, 1), a * np.clip(envelope, 0, 1)]) * 255 + .5).astype(np.uint8)
            if not rgba[:, :, 3].any(): continue
            key = f"thumb_estimate_{slug.replace('-', '_')}_{role}"
            entries[slug][role] = key; put(key, f'{slug}-{role}.webp', rgba)

    # The H-web's straps are tied off through the thumb panel: short lace ends
    # beside the web that no other web has. They are named here so the engine
    # can leave them out, and the panel they pierce is made whole under them
    # (Scott traced the panels round the lace, not under it): each pixel takes
    # the nearest panel and that panel's own light.
    trace = thumb['nativeHContour']
    laces = (alpha(thumb, trace, 'laces') > 127).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(laces, connectivity=8)
    beside = cv2.dilate(place, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))) > 0
    ties = np.zeros_like(laces)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < TIE_AREA and ((lab == i) & beside).any(): ties[lab == i] = 1
    ties = cv2.dilate(ties, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    mask = np.zeros(ties.shape + (4,), np.uint8); mask[ties > 0] = 255
    tie_block = {'mask': 'thumb_estimate_h_ties', 'heal': {}}; put(tie_block['mask'], 'h-ties.webp', mask)
    panels = [z['id'] for z in trace['zones'] if z['group'] == 'leather' and z['id'] != 'web' and z['id'] in trace['assets']]
    art = {z: np.array(Image.open(APP / thumb['assets'][trace['assets'][z]]).convert('RGBA')) for z in panels}
    owner = np.zeros(ties.shape, np.int32)
    for i, z in enumerate(panels): owner[(art[z][:, :, 3] > 127) & (owner == 0)] = i + 1
    _, lab = cv2.distanceTransformWithLabels((owner == 0).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(owner); nearest = np.zeros((lab.max() + 1, 2), np.int32); nearest[lab[ys, xs]] = np.stack([ys, xs], 1)
    # Only as far as each panel's own edge runs once the notches the H-web cut
    # in it are closed: where its strap ends pierce the thumb panel, and where
    # its straps cross the strip of the index finger. Past that edge lies the
    # web, and the web is drawn there. Nothing the H-web did not cover is touched.
    freed = ((ties > 0) | (thumb_web > 0)) & (owner == 0)
    claim = np.zeros(ties.shape, np.int32)
    depth = cv2.distanceTransform(thumb_full, cv2.DIST_L2, 5)        # how far inside the glove's outline
    for i, z in enumerate(panels):
        mine = (owner == i + 1).astype(np.uint8)
        whole = cv2.morphologyEx(mine, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (PANEL_REACH, PANEL_REACH))) > 0
        if z in STRIPS and mine.any():
            # A strip along the outline that the H-web's straps lap over: it is
            # as deep everywhere as where no strap covers it, along its own length.
            hull = np.zeros_like(mine); cv2.fillConvexPoly(hull, cv2.convexHull(cv2.findNonZero(mine)), 1)
            band = (hull > 0) & (depth <= np.percentile(depth[mine > 0], 90))
            whole |= band; freed = freed | (band & (owner == 0) & (thumb_full > 0))    # thread and lace ends on it too
        claim[whole & freed & (claim == 0)] = i + 1
    ty, tx = np.nonzero(claim); sy, sx = nearest[lab[ty, tx]].T
    for i, z in enumerate(panels):
        mine = claim[ty, tx] == i + 1
        if mine.any():      # the light of this panel itself, not of a nearer neighbour
            _, own = cv2.distanceTransformWithLabels((owner != i + 1).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
            py, px = np.nonzero(owner == i + 1); near = np.zeros((own.max() + 1, 2), np.int32); near[own[py, px]] = np.stack([py, px], 1)
            sy[mine], sx[mine] = near[own[ty[mine], tx[mine]]].T
        if not mine.any(): continue
        rgba = np.zeros(ties.shape + (4,), np.uint8)
        rgba[ty[mine], tx[mine], :3] = art[z][sy[mine], sx[mine], :3]; rgba[ty[mine], tx[mine], 3] = 255
        tone = cv2.GaussianBlur(rgba[:, :, :3].astype(np.float32) * (rgba[:, :, 3:4] > 0), (0, 0), 4)
        cover = cv2.GaussianBlur((rgba[:, :, 3] > 0).astype(np.float32), (0, 0), 4)
        rgba[ty[mine], tx[mine], :3] = np.clip(tone[ty[mine], tx[mine]] / np.maximum(cover[ty[mine], tx[mine], None], 1e-3) + .5, 0, 255).astype(np.uint8)
        tie_block['heal'][z] = f'thumb_estimate_heal_{z}'; put(tie_block['heal'][z], f'heal-{z}.webp', rgba)
    block = {'revision': REVISION, 'label': 'estimated', 'source': 'palmWebs (PALM-P3), carried to the thumb side by one plane mapping',
             'mapping': mapping, 'outlineOverlap': overlap, 'hWebTies': tie_block, 'entries': entries}
    if args.check:
        if stored != block: stale.append('thumbWebEstimates')
        if stale: sys.exit('stale: ' + ', '.join(stale))
        print('thumb web estimates are current:', ', '.join(sorted(entries))); return
    for key in [k for k in thumb['assets'] if k.startswith('thumb_estimate_') and k not in assets]:
        del thumb['assets'][key]; thumb['bbox'].pop(key, None)
    thumb['assets'].update(assets); thumb['bbox'].update(boxes); thumb['thumbWebEstimates'] = block
    (APP / 'assets/thumb-data.json').write_text(json.dumps(thumb, indent=2) + '\n')
    print('wrote', ', '.join(sorted(entries)), '| outline overlap', overlap)


if __name__ == '__main__': main()
