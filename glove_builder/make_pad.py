"""Cut the finger pad or the finger hood out of a photograph and fit it to
the index finger.

Same method as the webs (make_web.py): trace the outline, take what is inside,
warp it on, clip to the glove's silhouette. The pad is simpler — one piece of
leather, no lacing to separate — so there is no Otsu step, only the trace.

Where it lands is measured off the photograph rather than guessed. On SSK's
own glove the pad covers the index finger from 53% of its length down to 98%,
and 79% of its width there; those fractions carry to any glove.

    python glove_builder/make_pad.py --part pad
    python glove_builder/make_pad.py --part hood

Writes layers/<part>/<part>.png and runs/<part>/check.jpg.
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
PARTS = {}
PARTS["pad"] = {
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
    # A little smaller than the first fit, which ran it right to the finger's
    # own width: "de fingerpad is trouwens ook een klein stukje kleiner."
    "top": 0.56, "bottom": 1.02, "fill": 0.72,
}

# The finger hood: a leather cap over the whole index finger, stitched down
# both sides, its rounded end hanging past the finger over the pocket. SSK's
# own photograph of one, shot down the finger almost square-on — which is why
# it needs the same perspective correction the pad and the webs do.
#
# There is no segmentation run for this photograph and it does not need one:
# it is a close-up, so everything in it except the pocket behind the hood's
# end is glove, and a luminance floor separates those.
PARTS["hood"] = {
    "photo": "images/drive-2026-08/SSK-Finger-Hood.jpg",
    "dark_floor": 40,
    # Traced OUTSIDE the stitching: two rows of stitches down each side and
    # round the end are what say "hood" at a glance, and a trace inside them
    # renders a plain slab of leather. Pulled in again where a lace crosses
    # the hood in the photograph — that lace is the photographed glove's, and
    # this one draws its own over the top.
    "outline": [(690, 244), (800, 252), (895, 292), (955, 366), (984, 456),
                (988, 620), (980, 800), (968, 980), (940, 1160),
                (884, 1240), (872, 1330), (872, 1430), (886, 1510),
                (906, 1580), (898, 1700), (876, 1880), (846, 1992),
                (768, 2052), (656, 2066), (556, 2042), (496, 1986),
                (474, 1880), (460, 1700), (450, 1520), (440, 1340),
                (428, 1160), (418, 980), (414, 800), (418, 620),
                (430, 448), (470, 348), (566, 272)],
    "erode": 3,
    # Where it lands. Not at the fingertip: the hood is the cap the index
    # finger sits in when it is held OUTSIDE the glove, so it is on the lower
    # half of the finger, in the same band as the pad, and its rounded end
    # runs on past the finger over the belt. Scott: "die hoed zit gewoon net
    # boven de belt, als de vinger uit de handschoen is."
    #
    # And it starts BELOW the flag. The flag is embroidered on bare finger
    # above the hood on the photograph; put the hood at the tip and the flag
    # lands on top of it, which is what the first two tries did. The flag
    # mount ends 42% of the way down the finger, so the hood starts there.
    "top": 0.54, "bottom": 1.10, "fill": 0.84,
}


def main():
    import argparse
    import cv2
    ap = argparse.ArgumentParser()
    ap.add_argument("--part", default="pad", choices=sorted(PARTS))
    args = ap.parse_args()
    SPEC = PARTS[args.part]
    im = Image.open(HERE / SPEC["photo"]).convert("RGB")
    if "glove_mask" in SPEC:
        glove = np.asarray(Image.open(HERE / SPEC["glove_mask"])
                           .convert("L")) > 127
    else:
        lum = np.asarray(im).astype(np.float32) @ np.array(
            [0.299, 0.587, 0.114], np.float32)
        glove = lum > SPEC.get("dark_floor", 40)
    poly = np.zeros(glove.shape, np.uint8)
    cv2.fillPoly(poly, [np.array(SPEC["outline"], np.int32)], 1)
    pad = glove & poly.astype(bool)
    pad = ndimage.binary_opening(pad, np.ones((5, 5), bool))
    # pull in off the trace: the pad's stitched border sits against the shell,
    # and a few pixels of shell round the edge render as a blue fringe
    k = int(SPEC.get("erode", 7))
    pad = ndimage.binary_erosion(pad, np.ones((k, k), bool))

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
    # Over the hand opening a LITTLE, and no more. Both of these run past the
    # end of the finger so they tuck under the binding rather than stopping
    # short of it, and on the glove the hood laps over the belt and the lining
    # a touch — Scott: "the hood is just overlapping it a little bit, so you
    # can let it overlap with that stuff as well." Clipped against the opening
    # eroded rather than the opening itself, so that lap is allowed and the
    # tongue that used to hang out over the pocket is not.
    lin = Image.open(HERE / "layers/rainbow-back-4x/lining.png").convert("RGBA")
    lin = np.asarray(lin.resize((W, H), Image.LANCZOS))[..., 3] > 90
    out[..., 3][ndimage.binary_erosion(lin, np.ones((3, 3), bool),
                                       iterations=7)] = 0

    lay = HERE / "layers" / args.part
    lay.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(lay / f"{args.part}.png")

    run = HERE / "runs" / args.part
    run.mkdir(parents=True, exist_ok=True)
    ov = np.asarray(im).copy()
    ov[pad] = (0.35 * ov[pad] + 0.65 * np.array([60, 230, 90])).astype(np.uint8)
    Image.fromarray(ov).save(run / "check.jpg", quality=92)
    base = Image.open(HERE / "customiser/assets/glove.webp").convert("RGBA")
    base.alpha_composite(Image.fromarray(out, "RGBA"))
    base.convert("RGB").save(run / "fit.jpg", quality=92)

    a = out[..., 3] > 90
    yy, xx = np.nonzero(a)
    rep = {"part": args.part,
           "px_photo": int(pad.sum()), "px_render": int(a.sum()),
           "lands": [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())],
           "index_finger": [int(np.nonzero(finger)[1].min()), y0,
                            int(np.nonzero(finger)[1].max()), y1]}
    (run / "report.json").write_text(json.dumps(rep, indent=2))
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main()
