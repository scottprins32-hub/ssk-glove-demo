"""Cut a web out of a photograph, split into leather, lacing and finger edge.

SAM3's text prompts are no help here — "web of the baseball glove" scores 0.00
on these photographs, the same as on the rainbow calibration glove. Nor is
colour on its own: on the Columbia glove the web's leather runs from V 0.29 in
shadow to 0.60 in light and the shell in shadow reaches 0.60 too, so any
threshold either loses half the web or swallows half the glove.

What works is tracing the web's outline off the photograph and taking what is
inside it. Within the outline the split really is two-way — the only bright
thing in there is lace — so Otsu finds it per photograph with nothing to tune.

`finger_poly` carries the index finger's own right-hand edge along with the
web, so the join between the two comes from a single photograph instead of
being butted against a different glove's finger. It stays a separate layer and
takes the finger's colour, because that is what it is.

    python glove_builder/make_web.py --web spiral-i

Writes runs/web-<slug>/{leather,lace,finger}.png and check.jpg — the last
being the overlay to look at before believing any of it.
"""

import argparse
import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent

# One entry per photographed web. `seam` is (y, x) waypoints down the welt
# that bounds the web on the finger side; everything left of it is another
# panel. `dark` splits leather from lace by luminance — which of the two is
# darker is what `leather_is_dark` says.
WEBS = {
    "closed-diamond-net": {
        "photo": "images/drive-2026-07/Blue_web1.jpg",
        "glove_mask": "runs/blue-web1/masks/glove.png",
        "dark": 100,
        "leather_is_dark": True,
        "seam": [(0, 686), (700, 700), (750, 712), (800, 740),
                 (850, 790), (900, 855), (950, 925), (1000, 1000)],
        # the leather loops the lace passes through: web, but the seam cuts
        # them off because they sit on the finger side of it. The low one sits
        # beside back 2, penned in by the welt on its left and the lace on its
        # right, which is what keeps the box off back 2's leather.
        "loops": [(655, 130, 755, 480), (630, 560, 715, 760)],
    },
    # The Japan glove has this web too, but its navy web is the same navy as
    # its fingers and half of it sits in shadow against a black background —
    # 47k px of fragments and no lace at all. The Columbia glove is the same
    # case as the Closed Diamond Net: light shell, dark web, shot on white.
    "spiral-i": {
        "photo": "images/drive-2026-07/Blue1.jpg",
        "glove_mask": "runs/spiral-i-blue/masks/glove.png",

        # traced off the photograph: down the outer rim, across the bottom,
        # back up the edge against the index finger
        "outline": [(895, 45), (985, 35), (1065, 70), (1120, 150), (1150, 280),
                    (1150, 400), (1120, 530), (1080, 650), (1030, 760),
                    (975, 860), (930, 940), (880, 1010), (800, 1025),
                    (730, 1010), (692, 975), (676, 915), (674, 862),
                    (686, 818), (712, 784), (762, 764), (800, 700),
                    (830, 640), (845, 560), (838, 480), (848, 400),
                    (862, 300), (878, 200), (890, 110)],
        # Scott's idea: carry the index finger's own right-hand edge in the
        # cutout, so the join between finger and web comes from one photograph
        # rather than being butted up against a different glove's finger. It
        # is kept as its own layer and takes the index finger's colour, not
        # the web's — it is finger leather, and the order form asks for it
        # separately.
        "finger_poly": [(890, 45), (890, 110), (878, 200), (862, 300),
                        (848, 400), (838, 480), (845, 560), (830, 640),
                        (800, 700), (762, 764), (712, 784), (686, 818),
                        (674, 862), (676, 915), (692, 975), (730, 1010),
                        (664, 1004), (616, 968), (600, 910), (602, 856),
                        (614, 810), (646, 778), (696, 756), (734, 694),
                        (764, 634), (778, 556), (770, 478), (780, 398),
                        (794, 298), (810, 198), (820, 108), (822, 45)],
        # The lace that crosses from the index finger into the middle of the
        # web runs out past the web's own edge, so the outline cuts its end
        # off. Only the bright pixels in here are taken, which keeps the
        # shell it passes over out of it.
        "lace_polys": [[(604, 726), (668, 716), (770, 762), (752, 800),
                        (648, 772), (600, 752)]],
        # The low loop beside back 2 is a strap running diagonally down to the
        # heel, not a blob, so a box round it takes back 2's leather with it —
        # three tries proved that. Traced as a polygon off Scott's reading of
        # the photograph instead.
        "loop_polys": [[(760, 840), (899, 935), (780, 935), (730, 890)]],
    },
}


def cut(spec):
    im = Image.open(HERE / spec["photo"]).convert("RGB")
    a = np.asarray(im).astype(float)
    lum = a @ [0.299, 0.587, 0.114]
    glove = np.asarray(Image.open(HERE / spec["glove_mask"]).convert("L")) > 127

    if "outline" in spec:
        # Trace the web's boundary and take everything inside it.
        #
        # Hunting for the web by colour does not work on every glove. On the
        # Columbia Spiral I the web's leather runs from V 0.29 in shadow to
        # 0.60 in light, while the shell in shadow drops to 0.60 too — they
        # overlap in every channel, so any threshold either loses half the web
        # or swallows half the glove. Inside a traced outline the problem goes
        # away: the only bright thing in there is lace.
        import cv2
        poly = np.zeros(glove.shape, np.uint8)
        cv2.fillPoly(poly, [np.array(spec["outline"], np.int32)], 1)
        region = glove & poly.astype(bool)
        hsv = np.asarray(im.convert("HSV")).astype(float)
        val = hsv[..., 2] / 255
        # Inside the outline the split is a clean two-way one, so let Otsu
        # find it rather than carrying a hand-tuned number per photograph.
        # Guessing 0.68 here put the shaded laces on the leather side; Otsu
        # says 0.451 for this glove.
        cutv = spec.get("lace_v")
        if cutv is None:
            cutv = cv2.threshold((val[region] * 255).astype(np.uint8), 0, 255,
                                 cv2.THRESH_BINARY + cv2.THRESH_OTSU)[0] / 255
            print(f"leather/lace split at V = {cutv:.3f} (Otsu)")
        web = region & (val < cutv)
        web = ndimage.binary_closing(web, np.ones((7, 7), bool))
        web = ndimage.binary_opening(web, np.ones((3, 3), bool))
        lace = region & ~web
        lace = ndimage.binary_opening(lace, np.ones((3, 3), bool))
        lbl, n = ndimage.label(lace)
        sizes = ndimage.sum(lace, lbl, range(1, n + 1))
        lace = np.isin(lbl, np.nonzero(sizes > 120)[0] + 1)
        for poly in spec.get("lace_polys", ()):
            extra = np.zeros(glove.shape, np.uint8)
            cv2.fillPoly(extra, [np.array(poly, np.int32)], 1)
            lace |= glove & extra.astype(bool) & (val >= cutv)
        finger = None
        if "finger_poly" in spec:
            fp = np.zeros(glove.shape, np.uint8)
            cv2.fillPoly(fp, [np.array(spec["finger_poly"], np.int32)], 1)
            finger = glove & fp.astype(bool) & ~region & ~lace
            finger = ndimage.binary_opening(finger, np.ones((5, 5), bool))
        return im, web, lace, finger


    if "leather_hue" in spec:
        # Brightness alone cannot always tell leather from lace: on the Japan
        # glove the red thumb sits at the same luminance as the navy web, so
        # a threshold hands the thumb to the web. Hue keeps them apart —
        # navy 212 degrees, tan lace 40, red thumb 356.
        hsv = np.asarray(im.convert("HSV")).astype(float)
        hue, sat = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
        lo, hi = spec["leather_hue"]
        band = (hue >= lo) & (hue <= hi) if lo <= hi else (hue >= lo) | (hue <= hi)
        body = glove & band & (sat >= spec.get("leather_sat", 0.10))
    else:
        dark = glove & (lum < spec["dark"])
        body = dark if spec["leather_is_dark"] else (glove & ~dark)

    lbl, n = ndimage.label(body)
    sizes = ndimage.sum(body, lbl, range(1, n + 1))
    web = lbl == (int(np.argmax(sizes)) + 1)

    # everything on the far side of the welt belongs to the next panel
    pts = spec["seam"]
    bound = np.interp(np.arange(web.shape[0]),
                      [p[0] for p in pts], [p[1] for p in pts])
    cols = np.arange(web.shape[1])[None, :]
    keep = cols >= bound[:, None]
    web &= keep

    lbl, n = ndimage.label(web)
    sizes = ndimage.sum(web, lbl, range(1, n + 1))
    web = lbl == (int(np.argmax(sizes)) + 1)
    web = ndimage.binary_closing(web, np.ones((7, 7), bool))

    for x0, y0, x1, y1 in spec.get("loops", ()):
        box = np.zeros_like(web)
        box[y0:y1, x0:x1] = True
        web |= body & box
    for poly in spec.get("loop_polys", ()):
        import cv2
        region = np.zeros(web.shape, np.uint8)
        cv2.fillPoly(region, [np.array(poly, np.int32)], 1)
        web |= body & region.astype(bool)

    # The lacing is whatever sits in the web's outline and is not leather —
    # but taken as whole pieces, not clipped to the outline. The loops round
    # the rim straddle it, and half a loop rendered is worse than none: the
    # outer half would stay the old web's colour while the inner half changed.
    hull = ndimage.binary_fill_holes(
        ndimage.binary_closing(web, np.ones((45, 45), bool))) & keep
    light = glove & ~body
    light = ndimage.binary_opening(light, np.ones((3, 3), bool))
    lbl, n = ndimage.label(light)
    sizes = ndimage.sum(light, lbl, range(1, n + 1))
    inside = ndimage.sum(light & hull, lbl, range(1, n + 1))
    # a piece is web lacing if it reaches into the outline and is lace-sized:
    # the shell beside the web touches it too, and is twenty times bigger
    cap = spec.get("lace_max", 20000)
    take = np.nonzero((inside > 60) & (sizes > 120) & (sizes < cap))[0] + 1
    lace = np.isin(lbl, take)
    return im, web, lace, None


def rgba(im, mask):
    a = np.dstack([np.asarray(im), (mask * 255).astype(np.uint8)])
    return Image.fromarray(a, "RGBA")


def quad(mask):
    """Corners of the mask's minimum-area rectangle, ordered around it."""
    import cv2
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL,
                             cv2.CHAIN_APPROX_SIMPLE)
    box = cv2.boxPoints(cv2.minAreaRect(max(cs, key=cv2.contourArea)))
    ctr = box.mean(0)
    order = np.argsort(np.arctan2(box[:, 1] - ctr[1], box[:, 0] - ctr[0]))
    return box[order].astype(np.float32)


def fit(layers, web_mask, height=1100, extend=0.06, finger=None,
        lean=0.55):
    """Warp a cutout onto the reference glove's web aperture.

    Not a stretch — a perspective transform. The reference glove is
    photographed at more of an angle than these webs are, so its web is
    foreshortened; the same foreshortening has to be applied to anything
    dropped into that opening or it sits there too wide.
    """
    import cv2
    ref_im = Image.open(HERE / "layers/rainbow-back-4x/web.png").convert("RGBA")
    w = int(ref_im.width * height / ref_im.height)
    ref = np.asarray(ref_im.resize((w, height), Image.LANCZOS))[..., 3] > 90
    dst = quad(ref)
    # Run the bottom of the web on past the opening so it disappears under the
    # knotted lace instead of stopping just short of it. That lace is on the
    # outside of the glove and draws over the web, so the overshoot is hidden.
    if extend:
        ctr = dst.mean(0)
        low = np.argsort(dst[:, 1])[-2:]
        dst[low] += (dst[low] - ctr) * extend
    # With a finger edge in the cutout the fit has to account for it, or the
    # warp lands the web correctly and leaves the finger edge hanging short of
    # the glove's own finger — a gap where the join should be. Widen the
    # destination on the finger side by however much wider the cutout is than
    # the web alone, and fit from the two together.
    src = web_mask
    if finger is not None and finger.any():
        src = web_mask | finger
        wide = quad(src)
        narrow = quad(web_mask)
        span = lambda q: float(np.ptp(q[:, 0]))
        grow = (span(wide) / max(span(narrow), 1.0)) - 1.0
        left = np.argsort(dst[:, 0])[:2]
        # the bottom of the two leans out further: the finger flares there
        order = left[np.argsort(dst[left, 1])]
        for corner, share in zip(order, (1.0 - lean, 1.0 + lean)):
            dst[corner, 0] -= span(narrow) * grow * share
    M = cv2.getPerspectiveTransform(quad(src), dst)
    return {n: Image.fromarray(
                cv2.warpPerspective(np.asarray(im), M, (w, height),
                                    flags=cv2.INTER_LANCZOS4), "RGBA")
            for n, im in layers.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", required=True, choices=sorted(WEBS))
    args = ap.parse_args()
    spec = WEBS[args.web]
    im, web, lace, finger = cut(spec)

    out = HERE / "runs" / f"web-{args.web}"
    out.mkdir(parents=True, exist_ok=True)
    layers = {"leather": rgba(im, web), "lace": rgba(im, lace)}
    if finger is not None and finger.sum() > 500:
        layers["finger"] = rgba(im, finger)
    for n, layer in layers.items():
        layer.save(out / f"{n}.png")

    aligned = fit(layers, web | lace, finger=finger)
    # where build_assets.py picks them up, alongside the glove's own layers
    lay = HERE / "layers" / "webs" / args.web
    lay.mkdir(parents=True, exist_ok=True)
    base = Image.open(HERE / "customiser/assets/glove.webp").convert("RGBA")
    for n, layer in aligned.items():
        layer.save(out / f"{n}_aligned.png")
        layer.save(lay / f"{n}.png")
        base.alpha_composite(layer)
    base.convert("RGB").save(out / "fit.jpg", quality=92)

    ov = np.asarray(im).copy()
    if finger is not None:
        ov[finger] = (0.35 * ov[finger]
                      + 0.65 * np.array([250, 200, 40])).astype(np.uint8)
    ov[web] = (0.35 * ov[web] + 0.65 * np.array([255, 60, 60])).astype(np.uint8)
    ov[lace] = (0.35 * ov[lace] + 0.65 * np.array([60, 230, 90])).astype(np.uint8)
    Image.fromarray(ov).save(out / "check.jpg", quality=92)

    ys, xs = np.nonzero(web)
    report = {"web": args.web, "photo": spec["photo"],
              "leather_px": int(web.sum()), "lace_px": int(lace.sum()),
              "finger_px": int(finger.sum()) if finger is not None else 0,
              "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    (out / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print(f"wrote {out}/ — look at check.jpg before trusting it")


if __name__ == "__main__":
    main()
