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
# the panel that is the index finger's side along the outline.
PANEL_REACH, STRIPS = 41, {'back3'}
EDGE = 2.2           # how far the leather's edge is evened, in pixels
SLIVER, SEAL, HOLE = 11, 19, 2500      # a gap this narrow (SEAL on a web that is not a lattice), or an enclosed hole this small, is not an opening
FOOT_HOLE = 8000     # ... and one this small beside the palm leather under an open web's foot is palm
CORNER, RING = 3, 25     # how round a window's corners are, and how wide its edge is lit evenly, in pixels
LATTICE = {'trapeze', 'modified-trapeze'}    # webs of laced straps: their small openings are real
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


def four_sides(hole):
    """The four-sided outline that fits a hole best: its corners where its outline turns most."""
    contour = max(cv2.findContours(hole, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
    hull = cv2.convexHull(contour)
    for k in np.linspace(.01, .2, 40):
        poly = cv2.approxPolyDP(hull, k * cv2.arcLength(hull, True), True)
        if len(poly) <= 4: break
    if len(poly) != 4: poly = np.int32(cv2.boxPoints(cv2.minAreaRect(contour)))[:, None, :]
    # the fitted shape keeps the hole's own area: shrink it toward its centre until it does
    poly = poly.reshape(-1, 2).astype(np.float64); centre = poly.mean(0); area = hole.sum()
    for scale in np.linspace(1, .8, 41):
        q = np.zeros_like(hole); cv2.fillPoly(q, [np.int32(np.round(centre + (poly - centre) * scale))], 1)
        if q.sum() <= area: break
    return np.int32(np.round(centre + (poly - centre) * scale))


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
    # (anywhere inside the glove's outline beside its place counts as under: a
    # nick the H-web's window left in a panel's edge is not an opening)
    contours, _ = cv2.findContours(thumb_full, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    outline = np.zeros_like(thumb_full); cv2.drawContours(outline, contours, -1, 1, -1)
    envelope = cv2.GaussianBlur(((place > 0) | (under & (outline > 0))).astype(np.float32), (0, 0), .7)
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

    # The H-web's straps are tied off through the thumb panel: short lace ends
    # beside the web that no other web has. They are named here so the engine
    # can leave them out, and the panel they pierce is made whole under them
    # (Scott traced the panels round the lace, not under it): each pixel takes
    # the nearest panel and that panel's own light.
    trace = thumb['nativeHContour']
    laces = (alpha(thumb, trace, 'laces') > 127).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(laces, connectivity=8)
    beside = cv2.dilate(place, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))) > 0
    beside_web = cv2.dilate(place, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) > 0
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
    # The glove's outline with its openings filled, how deep each pixel lies
    # inside it, and which way out is nearest.
    depth, out = cv2.distanceTransformWithLabels(outline, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    oy, ox = np.nonzero(outline == 0); exit_at = np.zeros((out.max() + 1, 2), np.float32); exit_at[out[oy, ox]] = np.stack([ox, oy], 1)
    gy, gx = np.mgrid[0:outline.shape[0], 0:outline.shape[1]]
    way = exit_at[out] - np.dstack([gx, gy]); way /= np.maximum(np.linalg.norm(way, axis=2, keepdims=True), 1e-3)
    # the web's own axes: along it (toward the hand) and across it
    wy, wx = np.nonzero(place); spread = np.stack([wx, wy], 1) - np.array([wx.mean(), wy.mean()])
    across = np.linalg.svd(spread, full_matrices=False)[2][1]
    for i, z in enumerate(panels):
        mine = (owner == i + 1).astype(np.uint8)
        whole = cv2.morphologyEx(mine, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (PANEL_REACH, PANEL_REACH))) > 0
        if z in STRIPS and mine.any():
            # The index finger's side. Beside the H-web it shows only between the
            # straps that lap over it; beside any other web the whole side shows,
            # from the fingertip to the hand: one band along the outline, as deep
            # as the side is where no strap covers it, wherever the way out of
            # the glove is sideways off the web on the finger's side.
            sy_, sx_ = np.nonzero(mine); side = np.sign((np.stack([sx_, sy_], 1) - np.array([wx.mean(), wy.mean()])) @ across).sum()
            band = (outline > 0) & (depth <= float(np.percentile(depth[mine > 0], 99)) + 1) & ((way @ across) * np.sign(side) > .6) & beside_web
            band = (cv2.GaussianBlur(band.astype(np.float32), (0, 0), 3) > .5) & (outline > 0)     # one clean end, no fringe
            whole |= band; freed = freed | (band & (owner == 0))
        claim[whole & freed & (claim == 0)] = i + 1
    # a strap end that reaches further from the web than the web is ever drawn lies on a panel: it is that panel
    fy, fx = np.nonzero((ties > 0) & (claim == 0) & (owner == 0) & ~under); ny, nx = nearest[lab[fy, fx]].T
    claim[fy, fx] = owner[ny, nx]
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
    # what the traced glove covers once that is done: the web shows only where it does not
    glove = ((covered & (ties == 0)) | (claim > 0)).astype(np.uint8)

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
        # Carried over and filled, the leather's edge is ragged where the pieces
        # meet: steps a few pixels deep along a window. A strap's edge is even.
        even = cv2.GaussianBlur((a > .5).astype(np.float32), (0, 0), EDGE)
        grown = (even > .5) & (a <= .5)
        if grown.any() and solid.any():
            dist, lab = cv2.distanceTransformWithLabels((a <= .5).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
            ys, xs = np.nonzero(a > .5); nearest = np.zeros((lab.max() + 1, 2), np.int32); nearest[lab[ys, xs]] = np.stack([ys, xs], 1)
            gy_, gx_ = np.nonzero(grown); sy, sx = nearest[lab[gy_, gx_]].T; rgb[gy_, gx_] = rgb[sy, sx]
        a[:] = np.clip((even - .5) * 4 + .5, 0, 1)
        # Slivers of page between the web's parts and the glove are leather: a
        # gap narrower than a lace, and (unless the web is a lattice, whose small
        # openings are real) a small hole wholly enclosed by web and glove.
        drawn = np.maximum.reduce([(alpha_ > .5).astype(np.uint8) for _, alpha_ in layers.values()] + [glove])
        reach = SLIVER if slug in LATTICE else SEAL
        sealed = cv2.morphologyEx(drawn, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (reach, reach)))
        gaps = (sealed > 0) & (drawn == 0)
        if slug not in LATTICE:
            n, holes, stats, _ = cv2.connectedComponentsWithStats((sealed == 0).astype(np.uint8), connectivity=4)
            edge = set(np.unique(np.concatenate([holes[0], holes[-1], holes[:, 0], holes[:, -1]])).tolist())
            for h in range(1, n):
                if h not in edge and stats[h, cv2.CC_STAT_AREA] < HOLE: gaps |= holes == h
            # Under the laces that tie an open web's foot to the hand lies the
            # palm, not the page: an enclosed hole beside that palm leather is palm.
            if 'support' in layers:
                srgb, sa = layers['support']; palm_here = cv2.dilate((sa > .5).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
                foot = np.zeros(gaps.shape, bool)
                for h in range(1, n):
                    if h not in edge and HOLE <= stats[h, cv2.CC_STAT_AREA] < FOOT_HOLE and ((holes == h) & palm_here).any(): foot |= holes == h
                foot = cv2.dilate(foot.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
                if foot.any():
                    _, lab = cv2.distanceTransformWithLabels((sa <= .5).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
                    ys, xs = np.nonzero(sa > .5); nearest = np.zeros((lab.max() + 1, 2), np.int32); nearest[lab[ys, xs]] = np.stack([ys, xs], 1)
                    fy, fx = np.nonzero(foot & (sa <= .5)); sy, sx = nearest[lab[fy, fx]].T; srgb[fy, fx] = srgb[sy, sx]; sa[fy, fx] = 1
        gaps |= (ties > 0) & (claim == 0) & (owner == 0)        # where a strap end of the H-web lay on the web
        gaps &= under
        if gaps.any() and (a > .5).any():
            dist, lab = cv2.distanceTransformWithLabels((a <= .5).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
            ys, xs = np.nonzero(a > .5); nearest = np.zeros((lab.max() + 1, 2), np.int32); nearest[lab[ys, xs]] = np.stack([ys, xs], 1)
            gy_, gx_ = np.nonzero(gaps); sy, sx = nearest[lab[gy_, gx_]].T; rgb[gy_, gx_] = rgb[sy, sx]; a[gy_, gx_] = 1
            smooth = cv2.GaussianBlur(rgb, (0, 0), 3); rgb[gy_, gx_] = smooth[gy_, gx_]
        # A window in a web is a clean four-sided hole. Carried over and cut to
        # the glove it comes out with nicks and steps; each one is redrawn as
        # the four-sided shape that fits it best, corners slightly rounded.
        # Leather fills what the hole loses, and no lace or thread is drawn in it.
        if slug not in LATTICE:
            drawn = np.maximum.reduce([(alpha_ > .5).astype(np.uint8) for _, alpha_ in layers.values()] + [glove])
            n, holes, stats, _ = cv2.connectedComponentsWithStats((drawn == 0).astype(np.uint8), connectivity=4)
            edge = set(np.unique(np.concatenate([holes[0], holes[-1], holes[:, 0], holes[:, -1]])).tolist())
            for h in range(1, n):
                if h in edge or stats[h, cv2.CC_STAT_AREA] < HOLE: continue
                hole = (holes == h).astype(np.uint8)
                quad = np.zeros_like(hole); cv2.fillPoly(quad, [four_sides(hole)], 1)
                quad = cv2.GaussianBlur(quad.astype(np.float32), (0, 0), CORNER) > .5
                lost = (hole > 0) & ~quad
                if lost.any() and (a > .5).any():
                    _, lab = cv2.distanceTransformWithLabels((a <= .5).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
                    ys, xs = np.nonzero(a > .5); nearest = np.zeros((lab.max() + 1, 2), np.int32); nearest[lab[ys, xs]] = np.stack([ys, xs], 1)
                    gy_, gx_ = np.nonzero(lost); sy, sx = nearest[lab[gy_, gx_]].T; rgb[gy_, gx_] = rgb[sy, sx]; a[gy_, gx_] = 1
                # the photograph's shading of the old nicks goes with them: an even light round the window
                ring = (cv2.dilate(quad.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (RING, RING))) > 0) & ~quad & (a > .5)
                if ring.any():
                    weight = (a > .5).astype(np.float32); even = cv2.GaussianBlur(rgb * weight[:, :, None], (0, 0), 5) / np.maximum(cv2.GaussianBlur(weight, (0, 0), 5), 1e-3)[:, :, None]
                    rgb[ring] = even[ring]
                soft = cv2.GaussianBlur(quad.astype(np.float32), (0, 0), .8)
                for _, alpha_ in layers.values(): alpha_ *= 1 - soft
        entries[slug] = {}
        for role, (rgb, a) in layers.items():
            rgba = (np.dstack([np.clip(rgb, 0, 1), a * np.clip(envelope, 0, 1)]) * 255 + .5).astype(np.uint8)
            if not rgba[:, :, 3].any(): continue
            key = f"thumb_estimate_{slug.replace('-', '_')}_{role}"
            entries[slug][role] = key; put(key, f'{slug}-{role}.webp', rgba)

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
