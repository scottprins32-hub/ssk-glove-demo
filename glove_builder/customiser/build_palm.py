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
# Flipping the boxes straight off the palm asset does read the right way round
# — but the leather under a mark is not flat, and a flipped rectangle of it
# lands its light side against its neighbour's dark side, so three rectangles
# stand out on the render. So each mark is lifted off the leather instead: the
# lettering becomes a multiply mask of its own, and the palm under it is
# divided by that mask and comes out smooth. Then the mark can be flipped on
# its own with nothing but the letters moving.
MARKS = [
    (555, 762, 905, 912),    # Sasaki PRO Custom Made
    (798, 920, 900, 995),    # the SHOKUNIN box
    (598, 1085, 900, 1155),  # SSK, and the maker's mark beside it
]


def lift_marks(im, boxes, sigma=9.0, close=55, feather=8.0, floor=0.10):
    """Split a layer into (leather without the marks, the marks as a mask).

    The mark is what is darker than its own surroundings, which is what a
    local ratio measures: the pixel over a blur of it. Away from lettering
    that ratio is 1 and neither half changes, so the seam a box would leave
    closes itself; a short feather at the border makes sure of it.

    The floor has to be low. Lift the lettering only part of the way and it
    disappears from the diffuse half — which is clipped at the midtone — while
    staying dark in the specular half, and the mark comes back as a ghost of
    itself in the highlights.
    """
    a = np.asarray(im).astype(np.float32)
    r = np.ones(a.shape[:2], np.float32)
    for x0, y0, x1, y1 in boxes:
        reg = a[y0:y1, x0:x1, :3]
        lum = reg @ np.array([0.299, 0.587, 0.114], np.float32)
        # A blur alone will not do it: PRO is set in strokes 25 px wide, and
        # a blur of a 25 px stroke is still dark in the middle of it, so the
        # ratio comes out at 1 there and the mark keeps its insides. A grey
        # closing first fills any dark feature narrower than its footprint
        # with the leather around it, and what is left to blur is the
        # lighting.
        base = ndimage.gaussian_filter(
            ndimage.grey_closing(lum, size=close), sigma)
        q = np.where(base > 6, lum / np.maximum(base, 1e-3), 1.0)
        # A closing only ever brightens, so the whole box comes out lifted a
        # little and stands out as a pale rectangle. The leather between the
        # letters is what should be left alone: put its ratio back at 1.
        q = q / max(float(np.percentile(q, 96)), 1e-3)
        h, w = q.shape
        yy = np.minimum(np.arange(h), h - 1 - np.arange(h))[:, None]
        xx = np.minimum(np.arange(w), w - 1 - np.arange(w))[None, :]
        f = np.clip(np.minimum(yy, xx) / feather, 0.0, 1.0)
        r[y0:y1, x0:x1] = 1.0 + (q - 1.0) * f
    r = np.clip(r, floor, 1.0)
    flat = a.copy()
    flat[..., :3] = np.clip(a[..., :3] / r[..., None], 0, 255)
    # The mask is opaque only inside the boxes, and only where the layer
    # itself is: a multiply over a lace crossing the palm would darken the
    # lace with lettering that is not on it.
    inside = np.zeros(a.shape[:2], bool)
    for x0, y0, x1, y1 in boxes:
        inside[y0:y1, x0:x1] = True
    al = np.where(inside, a[..., 3], 0.0)
    mask = np.dstack([np.repeat((r * 255.0)[..., None], 3, 2), al[..., None]])
    return (Image.fromarray(flat.astype(np.uint8), "RGBA"),
            Image.fromarray(np.clip(mask, 0, 255).astype(np.uint8), "RGBA"))


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
    src["palm"], marks = lift_marks(src["palm"], boxes)

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
            "bbox": bbox, "marks": {"zone": "palm", "boxes": boxes}}
    (OUT / "palm-data.json").write_text(json.dumps(data, separators=(",", ":")))
    total = sum(f.stat().st_size for f in (OUT / "palm").glob("*"))
    print(f"\nwrote assets/palm/ — {len(assets)} files, {total/1e6:.2f} MB"
          f" + palm-data.json")


if __name__ == "__main__":
    main()
