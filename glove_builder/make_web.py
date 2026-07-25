"""Cut a web out of a photograph, split into leather and lacing.

SAM3's text prompts find the glove but not the web — "web of the baseball
glove" scores 0.00 on these photographs, the same way it did on the rainbow
calibration glove. What does work is colour: on every one of these gloves the
web leather and its lacing are different colours, so once the web's outline is
known the two separate cleanly.

The outline needs one thing a photograph cannot give: the seam where the web
meets the panel beside it. Both sides are the same leather in the same colour,
so no threshold finds it — but it is plainly visible as a welt, and a handful
of waypoints traced off the image is enough. That is what `seam` is for.

    python glove_builder/make_web.py --web closed-diamond-net

Writes runs/web-<slug>/leather.png, lace.png and check.jpg — the last being
the overlay to look at before believing any of it.
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
        # them off because they sit on the finger side of it.
        #
        # There is a fourth, low down beside back 2. It is left out: at this
        # angle it and back 2's leather are one unbroken dark region — erosion
        # will not part them — so a box round it takes panel as well, which
        # reads worse than the missing loop does.
        "loops": [(655, 130, 755, 480), (630, 560, 715, 760)],
    },
}


def cut(spec):
    im = Image.open(HERE / spec["photo"]).convert("RGB")
    a = np.asarray(im).astype(float)
    lum = a @ [0.299, 0.587, 0.114]
    glove = np.asarray(Image.open(HERE / spec["glove_mask"]).convert("L")) > 127

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

    # the lacing is whatever sits inside the web's outline and is not leather
    hull = ndimage.binary_fill_holes(
        ndimage.binary_closing(web, np.ones((45, 45), bool))) & keep
    lace = hull & glove & ~web
    lace = ndimage.binary_opening(lace, np.ones((3, 3), bool))
    lbl, n = ndimage.label(lace)
    sizes = ndimage.sum(lace, lbl, range(1, n + 1))
    lace = np.isin(lbl, np.nonzero(sizes > 120)[0] + 1)   # drop speckle
    return im, web, lace


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


def fit(layers, web_mask, height=1100):
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
    M = cv2.getPerspectiveTransform(quad(web_mask), quad(ref))
    return {n: Image.fromarray(
                cv2.warpPerspective(np.asarray(im), M, (w, height),
                                    flags=cv2.INTER_LANCZOS4), "RGBA")
            for n, im in layers.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", required=True, choices=sorted(WEBS))
    args = ap.parse_args()
    spec = WEBS[args.web]
    im, web, lace = cut(spec)

    out = HERE / "runs" / f"web-{args.web}"
    out.mkdir(parents=True, exist_ok=True)
    layers = {"leather": rgba(im, web), "lace": rgba(im, lace)}
    for n, layer in layers.items():
        layer.save(out / f"{n}.png")

    aligned = fit(layers, web | lace)
    base = Image.open(HERE / "customiser/assets/glove.webp").convert("RGBA")
    for n, layer in aligned.items():
        layer.save(out / f"{n}_aligned.png")
        base.alpha_composite(layer)
    base.convert("RGB").save(out / "fit.jpg", quality=92)

    ov = np.asarray(im).copy()
    ov[web] = (0.35 * ov[web] + 0.65 * np.array([255, 60, 60])).astype(np.uint8)
    ov[lace] = (0.35 * ov[lace] + 0.65 * np.array([60, 230, 90])).astype(np.uint8)
    Image.fromarray(ov).save(out / "check.jpg", quality=92)

    ys, xs = np.nonzero(web)
    report = {"web": args.web, "photo": spec["photo"],
              "leather_px": int(web.sum()), "lace_px": int(lace.sum()),
              "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    (out / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print(f"wrote {out}/ — look at check.jpg before trusting it")


if __name__ == "__main__":
    main()
