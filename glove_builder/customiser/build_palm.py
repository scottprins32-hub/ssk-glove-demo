"""Assets for the palm view, from the zone map make_palm.py cuts.

The back view's builder does a great deal that only the back needs — swapping
webs, warping the SSK wordmark onto the ring finger, mounting a flag on the
index finger, punching out a knot. None of that exists on the palm, so this is
its own short script rather than another branch through that one. What it does
share is the part that matters: the same tint_base / spec_base split, so a
colour renders the same on both sides of the glove, and the same sheen scaling,
so one chosen colour does not come out as two.

    python glove_builder/customiser/build_palm.py

Writes assets/palm/*.webp and assets/palm-data.json, in the shape the engine
reads for a view: w, h, zones, bbox, assets.
"""

import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

from build_assets import spec_base, tint_base, sheen_p95, match_sheen

HERE = pathlib.Path(__file__).parent
LAYERS = HERE.parent / "layers" / "rainbow-palm"
OUT = HERE / "assets"
HEIGHT = 1100

# Which zone of the palm view answers which question on the form. Every one of
# these is already a colour field on the back view except that two of them —
# the wingtips — are collected there without being shown.
# id, palette group, label. The group has to match the back view's, or the
# same field offers a different set of colours depending on which side of the
# glove you are looking at.
ZONES = [
    ("palm",    "leather", "Palm colour"),
    ("web",     "leather", "Web colour"),
    ("back1",   "leather", "Back 1 — Wingtip thumb"),
    ("back9",   "leather", "Back 9 — Wingtip pinky"),
    ("welting", "lace",    "Welting"),
    ("binding", "lace",    "Binding"),
    ("laces",   "lace",    "Laces"),
]


# The palm carries three embossed marks, and lettering does not survive a
# mirror: on a left-handed glove "Sasaki PRO Custom Made", the SHOKUNIN stamp
# and the SSK wordmark would all come out backwards. Boxes here, in the zone
# map's own 1400x1398 space, read off a grid over layers/rainbow-palm/palm.png.
#
# These are the calibration glove's marks, and SSK Europe's gloves do not
# carry them: erase_marks() takes them off the leather, and stamp_mask() puts
# SSK Europe's own stamp there as a multiply mask of its own, which the
# engine lays back over the palm inside its box — flipped about its own
# centre on a left-handed glove, so it reads forwards.
MARKS = [
    (555, 762, 905, 912),    # Sasaki PRO Custom Made
    (798, 920, 900, 995),    # the SHOKUNIN box
    (598, 1085, 900, 1155),  # SSK, and the maker's mark beside it
]


def erase_marks(im, boxes, feather=10, margin=18, size=61, sigma=6, patch=24, pad=60, seed=0,
                grain=0.85):
    """The palm leather with the calibration glove's marks taken off.

    Inside each box a median window wider than any stroke — PRO is set in
    strokes 25 px wide, so the window is 61 — gives the leather's shading
    without the lettering. What the window took off is grain and lettering
    together, and an embossed mark is too faint to tell from grain by its
    depth, so none of it goes back: the grain is borrowed instead, in small
    patches from the clean pocket leather round the boxes, tiled over each
    box with a soft join. Feathered at the border so no rectangle shows;
    the alpha is untouched, and the borrowed grain is laid a little lighter
    than it was found, since the pocket is smoother than the leather round
    it. The boxes are grown by `margin` so the feather starts outside the
    last line of lettering. Each box is worked on its own crop.
    (The first version lifted the marks into a mask and divided them out of
    the leather, which left each box a shade paler and the ghost of "Custom
    Made" behind, hidden only as long as the same mask went back over it.)"""
    a = np.asarray(im).copy()
    H, W = a.shape[:2]
    rgb_all = a[..., :3].astype(np.float32)
    # clean leather: on the palm, away from every box
    clean = a[..., 3] > 200
    for x0, y0, x1, y1 in boxes:
        clean[max(y0 - 12, 0):y1 + 12, max(x0 - 12, 0):x1 + 12] = False
    clean = ndimage.binary_erosion(clean, np.ones((patch + 2, patch + 2), bool))
    grain_all = rgb_all - ndimage.gaussian_filter(rgb_all, (8, 8, 0))
    ys, xs = np.nonzero(clean)
    rng = np.random.default_rng(seed)
    pick = rng.choice(len(ys), size=min(600, len(ys)), replace=False)
    bank = [grain_all[ys[i] - patch // 2:ys[i] + patch // 2,
                      xs[i] - patch // 2:xs[i] + patch // 2] for i in pick]
    win = np.hanning(patch)[:, None] * np.hanning(patch)[None, :]
    win = win[..., None].astype(np.float32)

    for x0, y0, x1, y1 in boxes:
        cy0, cy1 = max(y0 - pad, 0), min(y1 + pad, H)
        cx0, cx1 = max(x0 - pad, 0), min(x1 + pad, W)
        # from `a`, not rgb_all: the crops overlap, and a later box must build on
        # what an earlier one erased rather than write the original back
        rgb = a[cy0:cy1, cx0:cx1, :3].astype(np.float32)
        h, w = rgb.shape[:2]
        hole = np.zeros((h, w), bool)
        hole[y0 - margin - cy0:y1 + margin - cy0, x0 - margin - cx0:x1 + margin - cx0] = True
        shade = ndimage.gaussian_filter(
            ndimage.median_filter(rgb, size=(size, size, 1), mode="nearest"), (sigma, sigma, 0))
        tiled = np.zeros((h, w, 3), np.float32)
        weight = np.zeros((h, w, 1), np.float32)
        step = patch // 2
        for py in range(0, h + step, step):
            for px in range(0, w + step, step):
                g = bank[rng.integers(len(bank))]
                yy0, xx0 = py - patch // 2, px - patch // 2
                sy0, sx0 = max(0, -yy0), max(0, -xx0)
                sy1, sx1 = min(patch, h - yy0), min(patch, w - xx0)
                if sy1 <= sy0 or sx1 <= sx0:
                    continue
                tiled[yy0 + sy0:yy0 + sy1, xx0 + sx0:xx0 + sx1] += g[sy0:sy1, sx0:sx1] * win[sy0:sy1, sx0:sx1]
                weight[yy0 + sy0:yy0 + sy1, xx0 + sx0:xx0 + sx1] += win[sy0:sy1, sx0:sx1]
        tiled *= grain / np.maximum(weight, 1e-3)
        wgt = np.clip(ndimage.distance_transform_edt(hole) / feather, 0, 1)[..., None]
        a[cy0:cy1, cx0:cx1, :3] = np.clip(rgb * (1 - wgt) + (shade + tiled) * wgt, 0, 255).astype(np.uint8)
    return Image.fromarray(a, "RGBA"), int(sum((y1 - y0) * (x1 - x0) for x0, y0, x1, y1 in boxes))


# SSK Europe's own stamp goes where the marks were: thirteen stars round the
# SSK mark over "Custom Made" (images/stamp/Stamp_SSK_Custom_glove.pdf from
# Pim, 25 Sep 2026, with a 600 dpi raster beside it so this runs without a
# PDF rasteriser). It sits inside the clear pocket leather between the lace
# crossings — on the real glove it does not run under the laces (Scott:
# "It doesn't overlap the laces running through that piece of leather. A
# little bit smaller like in picture DSC05727") — at three quarters of the
# largest lace-free circle there, 406 px round (864, 900) on the 1534 x 1400
# canvas; pressed a fixed fraction darker than the leather. One box, so a
# left-handed glove gets it flipped about its own centre and reading forwards.
STAMP = HERE.parent / "images" / "stamp" / "ssk-custom-made-600dpi.png"
STAMP_CENTRE = (864, 910)
STAMP_DIAMETER = 300
STAMP_DROP = 0.24


def stamp_mask(palm_alpha, glove_alpha):
    """The stamp as a multiply mask over the palm leather, and its box."""
    H, W = palm_alpha.shape
    ink = 1.0 - np.asarray(Image.open(STAMP).convert("L")).astype(np.float32) / 255.0
    ys, xs = np.nonzero(ink > 0.5)
    ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    side = max(ink.shape)
    sq = np.zeros((side, side), np.float32)
    oy, ox = (side - ink.shape[0]) // 2, (side - ink.shape[1]) // 2
    sq[oy:oy + ink.shape[0], ox:ox + ink.shape[1]] = ink
    d = STAMP_DIAMETER
    small = np.asarray(Image.fromarray((sq * 255).astype(np.uint8))
                       .resize((d, d), Image.LANCZOS)).astype(np.float32) / 255.0
    small = ndimage.gaussian_filter(small, 0.7)        # a pressed edge, not a printed one
    cx, cy = STAMP_CENTRE
    x0, y0 = cx - d // 2, cy - d // 2
    x1, y1 = x0 + d, y0 + d
    off = int(((glove_alpha[y0:y1, x0:x1] <= 200) & (small >= 0.05)).sum())
    under = int(((palm_alpha[y0:y1, x0:x1] <= 200) & (small >= 0.5)).sum())
    if off or under:
        raise SystemExit(f"stamp leaves the glove on {off} px and runs under a lace "
                         f"on {under} px; move or shrink it")
    ratio = np.ones((H, W), np.float32)
    ratio[y0:y1, x0:x1] = 1.0 - STAMP_DROP * small
    alpha = np.zeros((H, W), np.uint8)
    alpha[y0:y1, x0:x1] = np.where(palm_alpha[y0:y1, x0:x1] > 0, 255, 0)
    rgb = np.repeat((ratio * 255.0)[..., None], 3, 2)
    mask = Image.fromarray(np.dstack([rgb, alpha[..., None]]).astype(np.uint8), "RGBA")
    print(f"  stamp {d} px at {STAMP_CENTRE}, ink {int((small > 0.5).sum())} px, "
          f"{STAMP_DROP:.0%} darker, clear of the laces")
    return mask, [x0, y0, x1, y1]


def close_gaps(src, names):
    """Hand every pixel of the glove to the nearest piece of leather.

    The zone map is cut by hue, and hue runs out at a seam: about 5 per cent
    of the palm belongs to no zone, mostly the hairline between two panels
    and the antialiased rim of the silhouette. Those pixels fall through to
    the neutral base, which is a plain tan — so an orange glove renders with
    tan threads all down its fingers. Giving each one to whichever zone is
    nearest costs nothing and takes the tan out; the pixel keeps its own
    shading, so a seam still reads as a seam, in the colour of the leather
    it divides.
    """
    g = np.asarray(src["glove"])
    stack = np.stack([np.asarray(src[n])[..., 3] > 90 for n in names])
    cov = stack.any(0)
    gap = (g[..., 3] > 90) & ~cov
    if not gap.any():
        return 0
    idx = ndimage.distance_transform_edt(~cov, return_distances=False,
                                         return_indices=True)
    near = np.argmax(stack, 0)[idx[0], idx[1]]
    for i, n in enumerate(names):
        take = gap & (near == i)
        if not take.any():
            continue
        a = np.asarray(src[n]).copy()
        a[take] = g[take]
        src[n] = Image.fromarray(a, "RGBA")
    return int(gap.sum())


def main():
    src = {}
    for name, *_ in ZONES + [("glove", "", "")]:
        f = LAYERS / f"{name}.png"
        if not f.exists():
            print(f"  missing {f.name}; run make_palm.py first")
            return
        im = Image.open(f).convert("RGBA")
        w = round(im.width * HEIGHT / im.height)
        src[name] = im.resize((w, HEIGHT), Image.LANCZOS)
    W = src["glove"].width
    print(f"palm view canvas {W}x{HEIGHT}")

    n = close_gaps(src, [z[0] for z in ZONES])
    print(f"  closed {n} px the zone map left to the neutral base")

    # Layer space to canvas space, the same resize every layer took.
    k = HEIGHT / Image.open(LAYERS / "glove.png").height
    boxes = [[int(x0 * k), int(y0 * k), int(round(x1 * k)), int(round(y1 * k))]
             for x0, y0, x1, y1 in MARKS]
    src["palm"], n_erased = erase_marks(src["palm"], boxes)
    print(f"  erased the calibration glove's marks from {n_erased} px of palm")
    marks, stamp_box = stamp_mask(np.asarray(src["palm"])[..., 3],
                                  np.asarray(src["glove"])[..., 3])

    (OUT / "palm").mkdir(parents=True, exist_ok=True)

    # The neutral base, the same trick the back view uses: the whole glove
    # tinted to its own midtone and multiplied by a plain tan, so any pixel no
    # zone covers reads as leather rather than as this glove's rainbow.
    gb = np.asarray(tint_base(src["glove"])).astype(np.float32)
    gb[..., :3] *= np.array([200, 160, 106], np.float32) / 255.0
    base = Image.fromarray(gb.astype(np.uint8), "RGBA")

    assets, zones, bbox = {}, [], {}

    def put(name, img, **kw):
        p = OUT / "palm" / f"{name}.webp"
        img.save(p, "WEBP", **kw)
        assets[name] = f"assets/palm/{name}.webp"
        a = np.asarray(Image.open(p).convert("RGBA"))[..., 3]
        ys, xs = np.nonzero(a > 8)
        if len(ys):
            bbox[name] = [int(xs.min()), int(ys.min()),
                          int(xs.max()) + 1, int(ys.max()) + 1]

    put("glove", base, quality=88, method=4)
    # The back view measures one sheen scale per zone group and applies it so
    # the highlights agree; here every zone is plain leather under one light,
    # so the palm's own median is the target.
    seen = [sheen_p95(spec_base(src[n])) for n, _, _ in ZONES
            if spec_base(src[n]) is not None]
    seen = [t for t in seen if t]
    target = (float(np.median([t[0] for t in seen])),
              float(np.median([t[1] for t in seen]))) if seen else None
    for i, (name, group, label) in enumerate(ZONES, 1):
        im = src[name]
        if (np.asarray(im)[..., 3] > 90).sum() < 200:
            print(f"  {name}: empty on this view, skipped")
            continue
        put(name, tint_base(im), quality=85, method=4)
        sp = match_sheen(spec_base(im), target)
        if sp is not None:
            put(name + "_hi", sp, quality=80, method=4)
        zones.append({"id": name, "n": i, "group": group,
                      "label": label})
        print(f"  {name:9s} {int((np.asarray(im)[..., 3] > 90).sum()):7d} px"
              f"  {label}")

    # An id map, the same as the back view's: one byte per pixel saying which
    # zone owns it, so a click on the render can be turned back into a field.
    idmap = np.zeros((HEIGHT, W), np.uint8)
    for i, (name, _, _) in enumerate(ZONES, 1):
        a = np.asarray(src[name])[..., 3]
        idmap[a > 90] = i
    ip = OUT / "palm" / "idmap.png"
    Image.fromarray(np.dstack([idmap, idmap, idmap,
                               np.full_like(idmap, 255)]), "RGBA").save(ip)
    assets["_idmap"] = "assets/palm/idmap.png"

    put("marks", marks, quality=88, method=4)

    data = {"w": W, "h": HEIGHT, "zones": zones, "assets": assets,
            "bbox": bbox, "marks": {"zone": "palm", "boxes": [stamp_box]}}
    (OUT / "palm-data.json").write_text(json.dumps(data, separators=(",", ":")))
    total = sum(f.stat().st_size for f in (OUT / "palm").glob("*"))
    print(f"\nwrote assets/palm/ — {len(assets)} files, {total/1e6:.2f} MB"
          f" + palm-data.json")


if __name__ == "__main__":
    main()
