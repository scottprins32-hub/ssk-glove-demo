"""Cut the finger pad out of a photograph and fit it to the index finger.

Same method as the webs (make_web.py): trace the outline, take what is inside,
warp it on, clip to the glove's silhouette. The pad is simpler — one piece of
leather, no lacing to separate — so there is no Otsu step, only the trace.

Where it lands is measured off the photograph rather than guessed. On SSK's
own glove the pad covers the index finger from 53% of its length down to 98%,
and 79% of its width there; those fractions carry to any glove.

    python glove_builder/make_pad.py

Writes layers/pad/pad.png and runs/pad/check.jpg.
"""

import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

from make_web import quad

HERE = pathlib.Path(__file__).parent

# Two photographs of the same pad, a yellow one and a pale blue one. The
# yellow is the cut — it is the larger and the better lit — and the SMK is
# kept as the check that the shape is the pad's and not that glove's.
SPEC = {
    "photo": "images/drive-2026-07/YellowPad1.jpg",
    "glove_mask": "runs/standard-i/masks/glove.png",
    "outline": [(630, 662), (682, 674), (716, 710), (738, 780), (747, 880),
                (748, 990), (740, 1070), (722, 1118), (680, 1136),
                (600, 1138), (556, 1124), (532, 1074), (522, 990),
                (521, 880), (531, 782), (556, 706), (588, 672)],
    # of the index finger's length and width, read off the same photograph
    # bottom runs past the finger's own end so the pad tucks under the
    # lining, the way it does on the photograph — there the yellow disappears
    # under the binding rather than stopping short of it
    "top": 0.53, "bottom": 1.06, "fill": 0.79,
}


def main():
    import cv2
    im = Image.open(HERE / SPEC["photo"]).convert("RGB")
    glove = np.asarray(Image.open(HERE / SPEC["glove_mask"]).convert("L")) > 127
    poly = np.zeros(glove.shape, np.uint8)
    cv2.fillPoly(poly, [np.array(SPEC["outline"], np.int32)], 1)
    pad = glove & poly.astype(bool)
    pad = ndimage.binary_opening(pad, np.ones((5, 5), bool))
    # pull in off the trace: the pad's stitched border sits against the shell,
    # and a few pixels of shell round the edge render as a blue fringe
    pad = ndimage.binary_erosion(pad, np.ones((7, 7), bool))

    # where it goes: the index finger, which on this view is back 3 and back 4
    H = 1100
    def ref(name):
        p = Image.open(HERE / f"layers/rainbow-back-4x/{name}.png").convert("RGBA")
        w = int(p.width * H / p.height)
        return np.asarray(p.resize((w, H), Image.LANCZOS))[..., 3] > 90, w

    b3, W = ref("back3")
    b4, _ = ref("back4")
    finger = b3 | b4
    ys = np.nonzero(finger.any(1))[0]
    y0, y1 = int(ys.min()), int(ys.max())
    span = y1 - y0
    top = y0 + int(span * SPEC["top"])
    bot = y0 + int(span * SPEC["bottom"])
    rows = [r for r in range(top, bot) if finger[r].any()]
    cx = np.median([np.nonzero(finger[r])[0].mean() for r in rows])
    wide = np.median([np.ptp(np.nonzero(finger[r])[0]) for r in rows])
    half = wide * SPEC["fill"] / 2
    dst = np.array([[cx - half, top], [cx + half, top],
                    [cx + half, bot], [cx - half, bot]], np.float32)

    M = cv2.getPerspectiveTransform(quad(pad), dst)
    rgba = np.dstack([np.asarray(im), (pad * 255).astype(np.uint8)])
    out = cv2.warpPerspective(rgba, M, (W, H), flags=cv2.INTER_LANCZOS4)

    sil_im = Image.open(HERE / "layers/rainbow-back-4x/glove.png").convert("RGBA")
    sil = np.asarray(sil_im.resize((W, H), Image.LANCZOS))[..., 3]
    out[..., 3] = np.minimum(out[..., 3],
                             (ndimage.binary_erosion(sil > 40,
                                                     np.ones((3, 3), bool))
                              * 255).astype(np.uint8))

    lay = HERE / "layers" / "pad"
    lay.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(lay / "pad.png")

    run = HERE / "runs" / "pad"
    run.mkdir(parents=True, exist_ok=True)
    ov = np.asarray(im).copy()
    ov[pad] = (0.35 * ov[pad] + 0.65 * np.array([60, 230, 90])).astype(np.uint8)
    Image.fromarray(ov).save(run / "check.jpg", quality=92)
    base = Image.open(HERE / "customiser/assets/glove.webp").convert("RGBA")
    base.alpha_composite(Image.fromarray(out, "RGBA"))
    base.convert("RGB").save(run / "fit.jpg", quality=92)

    a = out[..., 3] > 90
    yy, xx = np.nonzero(a)
    rep = {"pad_px_photo": int(pad.sum()), "pad_px_render": int(a.sum()),
           "lands": [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())],
           "index_finger": [int(np.nonzero(finger)[1].min()), y0,
                            int(np.nonzero(finger)[1].max()), y1]}
    (run / "report.json").write_text(json.dumps(rep, indent=2))
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()
