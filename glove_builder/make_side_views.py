"""Thumb-side and pinky-side views of the fixed SSK base glove, cut from the
store shoot's own frames of the rainbow calibration glove.

Sources (Scott's Drive, SSK fotoshoot, 23 September 2026, RAW only):

    DSC05708.ARW  thumb side   (DSC05709 is the same pose, a repeat)
    DSC05710.ARW  pinky side   (DSC05711 is the same pose, a repeat)

Only these frames show those sides of THIS glove; the photographs in
images/scott-glove-2026-07 (thumb_side_a/b, pinky_side_pad) are of another
glove and are not used here (see docs/SIDE-VIEWS-HANDOFF.md).

The rainbow glove was made so that every order field is its own hue, so most
of the map is read off the colour. Where two fields share a hue the boundary
is a seam the camera recorded, and it is traced along that seam (SEAMS);
where a part has no order field of its own (the thumb circle, the silver
piping at the belt) it stays photographed and is never recoloured (FIXED).
Nothing is drawn that the frame does not show.

    python glove_builder/make_side_views.py --shoot <folder with the ARWs>
    python glove_builder/make_side_views.py            # from committed crops

The first develops the RAWs (rawpy, camera white balance, half size) and
refreshes images/store-2026-09/rainbow-{thumb,pinky}.png after checking each
RAW's SHA-256. Both then write layers/side-{thumb,pinky}/<zone>.png and
runs/side-views/<view>_classes.jpg, the overlay to look at before believing
any of it.
"""

import argparse
import hashlib
import json
import pathlib

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
RUNS = HERE / "runs/side-views"

VIEWS = {
    "thumb": {
        "raw": "DSC05708.ARW",
        "raw_sha256": "7f79d4c9bdbf4f976aaa2e17d44ecb0d1736c1ec8c141a536c81c59396fac060",
        "repeat": "DSC05709.ARW",
        "photo": "images/store-2026-09/rainbow-thumb.png",
        # in the half-size development (3514 x 2344)
        "crop": (950, 60, 2400, 2000),
    },
    "pinky": {
        "raw": "DSC05710.ARW",
        "raw_sha256": "c9d70fbfc3025927c2f98388dd7532deb44eee4edf98b237d2977b8278e0c568",
        "repeat": "DSC05711.ARW",
        "photo": "images/store-2026-09/rainbow-pinky.png",
        "crop": (1150, 120, 2450, 2060),
    },
}
DEVELOP = dict(use_camera_wb=True, half_size=True, output_bps=16)

# OpenCV hue (0-179), saturation floor, value floor
HUES = {
    "turquoise": ((80, 103), 70, 25),
    "purple":    ((125, 160), 45, 15),
    "red":       ((170, 5), 110, 25),
    "orange":    ((6, 17), 120, 40),
    "yellow":    ((18, 34), 100, 50),
    "green":     ((40, 79), 60, 25),
    "pink":      ((150, 179), 25, 70),   # laces, binding, welting, lettering
}
PAINT = {"turquoise": (40, 220, 210), "purple": (150, 80, 230),
         "red": (235, 50, 50), "orange": (255, 150, 30),
         "yellow": (250, 230, 40), "green": (50, 200, 70),
         "pink": (255, 120, 200)}


def develop(shoot, view):
    import rawpy
    spec = VIEWS[view]
    raw = pathlib.Path(shoot) / spec["raw"]
    got = hashlib.sha256(raw.read_bytes()).hexdigest()
    if got != spec["raw_sha256"]:
        raise SystemExit(f"{raw}: sha256 {got}, expected {spec['raw_sha256']}")
    with rawpy.imread(str(raw)) as r:
        im = r.postprocess(**DEVELOP)
    x0, y0, x1, y1 = spec["crop"]
    crop = (im[y0:y1, x0:x1] / 257.0 + 0.5).astype(np.uint8)
    out = HERE / spec["photo"]
    Image.fromarray(crop).save(out, optimize=True)
    print(f"{view}: {raw.name} developed ({DEVELOP}, rawpy {rawpy.__version__}),"
          f" crop {spec['crop']} -> {out.relative_to(HERE)}")
    return crop


def hue_classes(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    H, S, V = hsv[..., 0].astype(int), hsv[..., 1], hsv[..., 2]
    out = {}
    for name, ((lo, hi), smin, vmin) in HUES.items():
        band = (H >= lo) & (H <= hi) if lo <= hi else (H >= lo) | (H <= hi)
        out[name] = band & (S >= smin) & (V >= vmin)
    return out, hsv


def overlay(rgb, masks, path):
    ov = rgb.astype(np.float32).copy()
    for name, m in masks.items():
        col = PAINT.get(name, (128, 128, 128))
        ov[m] = 0.4 * ov[m] + 0.6 * np.array(col, np.float32)
    side = np.hstack([rgb, ov.astype(np.uint8)])
    Image.fromarray(side).resize((side.shape[1] // 2, side.shape[0] // 2),
                                 Image.LANCZOS).save(path, quality=88)


# Per view: which hue is which order field, where a seam divides two fields
# of one hue (a polyline the camera shows, and which side is which), and the
# parts that are not an order field at all.
#
# Coordinates are in the committed crop (images/store-2026-09/rainbow-*.png).
MAP = {
    "thumb": {
        "hues": {"turquoise": "web", "purple": "back1", "green": "back3"},
        # The web's bottom strap ends in a stitched point; below it is the
        # thumb's back panel, with the pink binding on its edge.
        "seams": [("turquoise", "web", "back2",
                   [(120, 1110), (200, 1195), (280, 1255), (380, 1285),
                    (470, 1295), (540, 1275), (600, 1235), (660, 1190),
                    (760, 1120)], (400, 1400),
                   [(60, 1080), (800, 1080), (720, 1300), (600, 1420),
                    (480, 1520), (330, 1530), (200, 1420), (60, 1250)]),
                  # Below the light piping the purple carries the edge of the
                  # rainbow bullet patch: that is the belt, not the wingtip.
                  ("purple", "back1", "belt",
                   [(300, 1450), (345, 1485), (450, 1560), (560, 1640),
                    (650, 1730), (700, 1790), (740, 1860)], (450, 1750))],
        "fixed": {
            # the thumb circle with the small SSK logo (form: circle colour
            # and number are not modelled here, see the handoff)
            "circle": ("ellipse", (690, 1490, 112, 104)),
            # light piping between back 1 and the belt: no order field
            "piping": ("band", ([(345, 1485), (450, 1560), (560, 1640),
                                 (650, 1730), (700, 1790)], 16)),
            # the rainbow bullet patch seen edge-on
            "bullet_edge": ("box", (385, 1550, 480, 1715)),
        },
        # the glove's own outline with the stand and table below it left out
        # Below y 1100 the thumb's shadowed edge stands against the black
        # stand and cannot be read off the colour: that stretch is traced
        # along the last glove pixels the light reaches.
        "roi": [(40, 30), (1445, 30), (1445, 1050), (1340, 1100), (1200, 1220),
                (1140, 1300), (1120, 1450), (1100, 1600), (1080, 1700),
                (1060, 1830), (1010, 1862), (560, 1862),
                (470, 1835), (400, 1740), (330, 1560), (200, 1400),
                (40, 1300)],
        # the H-web's slots look into the pocket: palm leather in shadow
        "interior": ("web", "palm", 38),
        # the web ends at the thumb's purple; turquoise-coloured shadow
        # beyond this outline is purple leather in the dark
        "scope": {"web": [(120, 150), (520, 60), (1130, 360), (1010, 560),
                          (840, 850), (700, 1100), (560, 1270), (200, 1210),
                          (110, 800)]},
        # purple leather never reaches brightness 40 in this frame; the pale
        # suede laces hanging over it do
        "bright_is_lace": {"back1": 55, "belt": 55},
        "binding_near_edge": True,
    },
    "pinky": {
        "hues": {"red": "back9", "orange": "back7", "yellow": "back6",
                 "green": "back4", "turquoise": "palm"},
        "seams": [("red", "back9", "back8", "red", (520, 700)),
                  ("yellow", "back6", "back5", "yellow", (1250, 700))],
        # Welting lines, traced roughly and snapped to the pink piping's
        # centre in the frame (snap_to_pink). The first two also divide the
        # red and the yellow into their two panels (seams above).
        "welts": {"red": [(237, 280), (300, 480), (387, 755), (462, 1005),
                          (550, 1255)],
                  "yellow": [(755, 100), (800, 180), (850, 300), (900, 430),
                             (935, 560), (965, 700), (990, 850), (1005, 1000),
                             (1015, 1150)],
                  "orange_yellow": [(640, 110), (680, 250), (730, 420),
                                    (790, 620), (850, 820), (900, 1020),
                                    (940, 1200)]},
        "welt_half_width": 11,
        # the palm shows only through the gap between pinky and ring finger
        "scope": {"palm": [(560, 560), (660, 560), (720, 920), (600, 920)]},
        "embroidery": [(630, 425), (700, 425), (770, 620), (840, 760),
                       (905, 900), (905, 1005), (790, 1005), (730, 800),
                       (725, 645), (700, 612), (640, 592)],
        "fixed": {},
        "roi": [(40, 40), (1295, 40), (1295, 1280), (1050, 1300), (900, 1420),
                (760, 1600), (640, 1725), (400, 1745), (260, 1705), (250, 1500),
                (235, 1260), (150, 1100), (60, 1000)],
        "binding_near_edge": True,
    },
}


def seam_side(shape, pts, toward):
    """The part of the frame on `toward`'s side of a traced seam. The seam
    is extended straight on at both ends to the frame's edge, drawn one
    pixel wide, and the frame flood-filled from `toward`."""
    h, w = shape
    pts = [tuple(map(float, p)) for p in pts]
    (x0, y0), (x1, y1) = pts[0], pts[1]
    k = 4 * (w + h) / max(np.hypot(x1 - x0, y1 - y0), 1)
    pts = [(x0 - (x1 - x0) * k, y0 - (y1 - y0) * k)] + pts
    (x0, y0), (x1, y1) = pts[-2], pts[-1]
    k = 4 * (w + h) / max(np.hypot(x1 - x0, y1 - y0), 1)
    pts = pts + [(x1 + (x1 - x0) * k, y1 + (y1 - y0) * k)]
    im = Image.new("1", (w, h))
    ImageDraw.Draw(im).line(pts, fill=1, width=3)
    wall = np.asarray(im)
    lbl, _ = ndimage.label(~wall)
    tx, ty = toward
    return lbl == lbl[int(ty), int(tx)]


def shape_mask(shape, kind, arg):
    h, w = shape
    im = Image.new("1", (w, h))
    d = ImageDraw.Draw(im)
    if kind == "ellipse":
        cx, cy, rx, ry = arg
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=1)
    elif kind == "box":
        d.rectangle(arg, fill=1)
    elif kind == "band":
        pts, width = arg
        d.line(pts, fill=1, width=width, joint="curve")
    elif kind == "poly":
        d.polygon(arg, fill=1)
    return np.asarray(im)


def snap_to_pink(pts, pinkish, reach=30):
    """Move each traced vertex along its row to the centre of the pink run
    nearest to it, so a seam traced by eye lies on the piping the camera
    recorded. Vertices with no pink within reach stay where they were."""
    out = []
    h, w = pinkish.shape
    for x, y in pts:
        y = int(round(y))
        lo, hi = max(0, int(x) - reach), min(w, int(x) + reach + 1)
        row = pinkish[max(0, y - 2):y + 3, lo:hi].any(0)
        xs = np.nonzero(row)[0]
        if not len(xs):
            out.append((float(x), float(y)))
            continue
        # the run containing the pink pixel nearest the traced point
        k = xs[np.argmin(np.abs(xs + lo - x))]
        a = b = k
        while a - 1 >= 0 and row[a - 1]:
            a -= 1
        while b + 1 < len(row) and row[b + 1]:
            b += 1
        out.append((lo + (a + b) / 2.0, float(y)))
    return out


def chromaticity(den, sigma=2.0):
    """R, G, B over their sum, smoothed in proportion to brightness so a
    shadow's noise does not decide its colour. Shading divides out: a panel
    in shadow has the same chromaticity as the same panel in light."""
    f = den.astype(np.float32)
    tot = f.sum(-1)
    num = np.dstack([ndimage.gaussian_filter(f[..., i], sigma) for i in range(3)])
    den_ = ndimage.gaussian_filter(tot, sigma)
    return num / np.maximum(den_, 1.0)[..., None], ndimage.gaussian_filter(tot / 3, sigma)


def segment(view, rgb):
    """Zone masks for one view: every glove pixel owned by exactly one order
    field or one fixed part."""
    spec = MAP[view]
    den = cv2.fastNlMeansDenoisingColored(np.ascontiguousarray(rgb), None,
                                          6, 12, 7, 21)
    cls, hsv = hue_classes(den)
    S, V = hsv[..., 1], hsv[..., 2]
    shape = rgb.shape[:2]
    chrom, lum = chromaticity(den)
    colourful = chrom.max(-1) - chrom.min(-1)

    # The glove against a grey wall and a black stand: both are near neutral.
    glove = (colourful > 0.11) & (lum > 4)
    fixed = {k: shape_mask(shape, *v) for k, v in spec["fixed"].items()}
    for m in fixed.values():
        glove |= m
    glove = ndimage.binary_opening(glove, np.ones((5, 5), bool))
    glove = ndimage.binary_closing(glove, np.ones((7, 7), bool), iterations=2)
    glove = ndimage.binary_fill_holes(glove)
    lbl, n = ndimage.label(glove)
    sizes = ndimage.sum(glove, lbl, range(1, n + 1))
    glove = np.isin(lbl, 1 + np.nonzero(sizes > 20000)[0])
    if spec.get("roi"):
        glove &= shape_mask(shape, "poly", spec["roi"])
    # but not the wall where it shows between two laces: filling holes
    # closed those, and they are daylight, not glove
    # a silhouette, not a staircase: the vote works in blocks in deep shadow
    disc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)).astype(bool)
    glove = ndimage.binary_opening(glove, structure=disc)
    glove = ndimage.gaussian_filter(glove.astype(np.float32), 2.0) > 0.5
    # The wall's own colour, read round the outside of the glove.
    ring = ndimage.binary_dilation(glove, iterations=40) & ~ndimage.binary_dilation(glove, iterations=10)
    ring &= lum > 40
    wc, wl = chrom[ring].mean(0), float(np.median(lum[ring]))
    wall = (np.abs(chrom - wc).sum(-1) < 0.035) & (np.abs(lum - wl) < 30)
    wall = ndimage.binary_opening(wall, np.ones((5, 5), bool))
    keep = np.zeros(shape, bool)
    for m in fixed.values():
        keep |= m
    glove &= ~(wall & ~keep)
    # and no crumbs beside it
    lbl, n = ndimage.label(glove)
    if n > 1:
        sizes = ndimage.sum(glove, lbl, range(1, n + 1))
        glove = np.isin(lbl, 1 + np.nonzero(sizes >= 3000)[0])

    # Each colour's chromaticity, measured on its own well-lit pixels (the
    # hue windows only choose which pixels to measure), then every glove
    # pixel goes to the nearest one.
    names = list(spec["hues"]) + ["pink"]
    means = {}
    for n_ in names:
        sure = cls[n_] & glove & (S > 110) & (V > 60)
        if n_ == "pink":
            sure = cls[n_] & glove & (V > 90)
        if sure.sum() < 200:
            raise SystemExit(f"{view}: too few sure pixels for {n_}")
        means[n_] = chrom[sure].mean(0)
    # Chromaticity, plus brightness at a small weight: pink lace and purple
    # leather are close in colour but pink is several times brighter, and
    # shading moves brightness far less than that between neighbours.
    loglum = np.log(np.maximum(lum, 1.0))
    feat = np.dstack([chrom, 0.035 * loglum[..., None]])
    for n_ in names:
        sure = cls[n_] & glove & (S > 110) & (V > 60) if n_ != "pink" \
            else cls[n_] & glove & (V > 90)
        means[n_] = feat[sure].mean(0)
    M = np.stack([means[n_] for n_ in names])
    d = ((feat[..., None, :] - M[None, None]) ** 2).sum(-1)
    near = np.argmin(d, -1)
    # A vote over each pixel's neighbourhood, weighted by brightness: in
    # deep shadow a pixel's own chromaticity is mostly noise, and orange in
    # shadow otherwise speckles into red.
    wgt = np.clip(lum / 40.0, 0.15, 1.0).astype(np.float32)
    votes = np.stack([ndimage.gaussian_filter(((near == i) * wgt).astype(np.float32), 2.5)
                      for i in range(len(names))])
    # Pink is lighter than every leather it touches (lace brightness 40 and
    # up against 5 to 40 for the leather beside it), so a dark pixel of
    # pink colour is leather in shadow with a warm cast: it goes to the best
    # leather instead, never to a gap for the nearest lace to take.
    # In deep shadow even the vote is mostly noise; there a pixel takes the
    # class of the lit leather around it, over a wider neighbourhood.
    wide_votes = np.stack([ndimage.gaussian_filter(((near == i) * wgt).astype(np.float32), 14)
                           for i in range(len(names))])
    votes = np.where((lum < 16)[None], wide_votes, votes)
    ip = names.index("pink")
    votes[ip] = np.where(lum > 38, votes[ip], -1.0)
    near = np.argmax(votes, 0)
    cls = {n_: glove & (near == i) for i, n_ in enumerate(names)}
    for n_ in cls:
        m = ndimage.binary_opening(cls[n_], np.ones((3, 3), bool))
        cls[n_] = ndimage.binary_closing(m, np.ones((3, 3), bool))

    welts = {}
    for name, pts in spec.get("welts", {}).items():
        welts[name] = snap_to_pink(pts, cls["pink"])
    zones = {}
    for hue, field in spec["hues"].items():
        zones.setdefault(field, np.zeros(shape, bool))
        zones[field] |= cls[hue]
    for seam in spec.get("seams", []):
        hue, left, right, pts, toward = seam[:5]
        if isinstance(pts, str):
            pts = welts[pts]                  # the snapped welting line
        side = seam_side(shape, pts, toward)
        if len(seam) > 5:
            # only within the panel the seam bounds, not across the frame
            side &= shape_mask(shape, "poly", seam[5])
        both = zones[left].copy()
        zones[left] = both & ~side
        zones[right] = zones.get(right, np.zeros(shape, bool)) | (both & side)

    # pink: laces, welting, binding, lettering, or stitch dots
    pink = cls["pink"] & glove
    emb = np.zeros(shape, bool)
    if "embroidery" in spec:
        emb = pink & shape_mask(shape, "poly", spec["embroidery"])
        emb = ndimage.binary_opening(emb, np.ones((3, 3), bool))
        pink &= ~emb
    # A lace is a strap 15 px and more across; welting and binding are
    # piping, 4 to 9 px. Opening with a disc wider than piping keeps the
    # laces and drops the piping, so the two separate even where a lace
    # crosses a welt.
    disc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)).astype(bool)
    wide = ndimage.binary_opening(pink, structure=disc)
    wide = ndimage.binary_dilation(wide, iterations=2) & pink
    thin = pink & ~wide
    edge = glove & ~ndimage.binary_erosion(glove, iterations=26)
    laces = np.zeros(shape, bool)
    welting = np.zeros(shape, bool)
    binding = np.zeros(shape, bool)
    stitching = np.zeros(shape, bool)
    lbl, n = ndimage.label(pink)
    for i in range(1, n + 1):
        piece = lbl == i
        px = int(piece.sum())
        if px < 250:
            # a stitch or a run of stitches: thread, the stitching field
            if px >= 12:
                stitching |= piece
            continue
        w_part = piece & wide
        t_part = piece & thin
        # binding: pink running along the glove's own outline
        if (piece & edge).sum() / px > 0.7:
            binding |= piece
            continue
        laces |= w_part
        # welting: long, even piping; a short pale scrap is a lace's end
        tl, tn = ndimage.label(t_part)
        for j in range(1, tn + 1):
            seg = tl == j
            ys, xs = np.nonzero(seg)
            (_, _), (rw, rh), _ = cv2.minAreaRect(
                np.c_[xs, ys].astype(np.float32))
            length = max(rw, rh)
            if seg.sum() < 1200 and seg.sum() / max(length, 1) < 5:
                stitching |= seg                  # a stitched line: thread
            elif length > 120 and seg.sum() / max(length, 1) < 9:
                welting |= seg
            else:
                laces |= seg
    if welts:
        hw = spec.get("welt_half_width", 10)
        along = np.zeros(shape, bool)
        for pts in welts.values():
            along |= shape_mask(shape, "band", (pts, 2 * hw + 1))
        on_welt = cls["pink"] & glove & along
        welting |= on_welt
        laces &= ~on_welt
        binding &= ~on_welt
        stitching &= ~on_welt
    zones["laces"] = laces
    zones["welting"] = welting
    zones["stitching"] = stitching
    zones["binding"] = binding
    if emb.any():
        zones["embroidery"] = emb

    for z, poly in spec.get("scope", {}).items():
        zones[z] &= shape_mask(shape, "poly", poly)
    for z, lmin in spec.get("bright_is_lace", {}).items():
        pale = zones[z] & (lum > lmin)
        pale = ndimage.binary_opening(pale, np.ones((5, 5), bool))
        zones[z] &= ~pale
        zones["laces"] |= pale
    if spec.get("interior"):
        # Seen through the web's slots: the pocket, in deep shadow. It is
        # the palm's leather, so it takes the palm colour, not the web's.
        src, dst, lmax = spec["interior"]
        dark = zones[src] & (lum < lmax)
        dark = ndimage.binary_opening(dark, np.ones((7, 7), bool))
        lbl, n = ndimage.label(dark)
        if n:
            sz = ndimage.sum(dark, lbl, range(1, n + 1))
            dark = np.isin(lbl, 1 + np.nonzero(sz > 1500)[0])
        zones[src] &= ~dark
        zones[dst] = zones.get(dst, np.zeros(shape, bool)) | dark
    if "bullet_edge" in fixed:
        # only the patch itself, not the belt leather in its box
        fixed["bullet_edge"] = fixed["bullet_edge"] & ~zones.get("belt", np.zeros(shape, bool))
    fixed_any = np.zeros(shape, bool)
    for m in fixed.values():
        fixed_any |= m & glove
    for z in zones:
        zones[z] &= ~fixed_any
        # a leather island far smaller than any panel is noise (the stand's
        # edge, a speck of shadow); it goes to whatever surrounds it
        if z != "palm" and (z in spec["hues"].values()
                            or z in ("back2", "belt", "back5", "back8")):
            lbl, n = ndimage.label(zones[z])
            if n > 1:
                sz = ndimage.sum(zones[z], lbl, range(1, n + 1))
                zones[z] = np.isin(lbl, 1 + np.nonzero(
                    sz >= max(2500, 0.03 * sz.max()))[0])

    # every glove pixel nobody claimed (stitch dots, specks, crevices) goes
    # to the nearest zone and keeps its own shading; fixed parts stay fixed
    names = list(zones)
    stack = np.stack([zones[z] for z in names])
    cov = stack.any(0)
    gap = glove & ~cov & ~fixed_any
    idx = ndimage.distance_transform_edt(~cov, return_distances=False,
                                         return_indices=True)
    nearest = np.argmax(stack, 0)[idx[0], idx[1]]
    for i, z in enumerate(names):
        zones[z] = (zones[z] | (gap & (nearest == i))) & glove
    return zones, fixed, glove, den, lum


PAINT_ZONE = {"web": (40, 220, 210), "back2": (20, 120, 255),
              "back1": (150, 80, 230), "belt": (90, 30, 140),
              "back3": (50, 200, 70), "back4": (20, 120, 40),
              "back5": (200, 255, 60), "back6": (250, 230, 40),
              "back7": (255, 150, 30), "back8": (255, 90, 90),
              "back9": (200, 20, 20), "palm": (0, 70, 170),
              "laces": (255, 120, 200), "welting": (255, 255, 255),
              "binding": (120, 60, 255), "embroidery": (255, 255, 0),
              "stitching": (255, 255, 255)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shoot", type=pathlib.Path,
                    help="folder holding DSC05708.ARW and DSC05710.ARW")
    ap.add_argument("--view", choices=sorted(VIEWS), action="append")
    args = ap.parse_args()
    RUNS.mkdir(parents=True, exist_ok=True)
    report = {}
    for view in args.view or sorted(VIEWS):
        if args.shoot:
            rgb = develop(args.shoot, view)
        else:
            rgb = np.asarray(Image.open(HERE / VIEWS[view]["photo"]).convert("RGB"))
        zones, fixed, glove, den, _ = segment(view, rgb)
        ov = den.astype(np.float32).copy()
        for z, m in zones.items():
            ov[m] = 0.35 * ov[m] + 0.65 * np.array(PAINT_ZONE.get(z, (128, 128, 128)))
        for m in fixed.values():
            ov[m & glove] = 0.5 * ov[m & glove] + 0.5 * np.array([0, 0, 0])
        side = np.hstack([den, ov.astype(np.uint8)])
        Image.fromarray(side).resize((side.shape[1] // 2, side.shape[0] // 2),
                                     Image.LANCZOS).save(RUNS / f"{view}_zones.jpg",
                                                         quality=88)
        # The layers carry the frame's shading, and the page lifts it to
        # whatever colour is chosen, so their grain is denoised harder than
        # the copy the classes were read from (chroma no longer matters).
        ycc = cv2.cvtColor(den, cv2.COLOR_RGB2YCrCb)
        ycc[..., 0] = cv2.fastNlMeansDenoising(np.ascontiguousarray(ycc[..., 0]),
                                               None, 9, 7, 21)
        den = cv2.cvtColor(ycc, cv2.COLOR_YCrCb2RGB)
        out = HERE / f"layers/side-{view}"
        out.mkdir(parents=True, exist_ok=True)
        for z, m in list(zones.items()) + [("glove", glove)]:
            # colour only where the zone is: the rest is never read and
            # would cost 5 MB a layer in the repository
            a = np.dstack([den * m[..., None], (m * 255).astype(np.uint8)])
            Image.fromarray(a, "RGBA").save(out / f"{z}.png")
        fx = np.zeros(glove.shape, bool)
        for m in fixed.values():
            fx |= m & glove
        Image.fromarray(np.dstack([den * fx[..., None], (fx * 255).astype(np.uint8)]),
                        "RGBA").save(out / "fixed.png")
        report[view] = {"source": VIEWS[view]["raw"],
                        "zones_px": {z: int(m.sum()) for z, m in zones.items()},
                        "fixed_px": {k: int((m & glove).sum()) for k, m in fixed.items()},
                        "glove_px": int(glove.sum())}
        print(view, json.dumps(report[view]["zones_px"]))
    (RUNS / "zones.json").write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
