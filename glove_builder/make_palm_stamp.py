"""Press SSK Europe's stamp into the palm.

    python glove_builder/make_palm_stamp.py

The palm view carried the three marks lifted off the calibration glove:
"Sasaki PRO Custom Made", the SHOKUNIN box and the SSK wordmark. SSK
Europe's custom gloves carry one stamp instead — thirteen stars round the
SSK mark over "Custom Made" (images/stamp/Stamp_SSK_Custom_glove.pdf, from
Pim; 25 Sep 2026, Scott: "This is the new palm stamp logo, replace the Pro
sasaki stuff on the inside of the glove").

build_palm.py already writes the palm leather with its old marks lifted
off, and the marks as a multiply mask of their own that the engine lays
back over the leather inside `marks.boxes` — flipped about its own centre
on a left-handed glove, so it reads forwards. This script only replaces
that mask and its box: the stamp, rendered from the committed 600 dpi
raster, sized and placed on the pocket where the old marks stood, as a
pressed mark a fixed fraction darker than the leather. Nothing else in
assets/palm/ changes.
"""

import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
OUT = HERE / "customiser" / "assets"
STAMP = HERE / "images" / "stamp" / "ssk-custom-made-600dpi.png"

# Where the old marks stood on the palm view (654..1003 x 831..1217 in
# canvas pixels): the stamp is round, so it takes their centre and their
# width. The pocket leather is smooth there; the outer stars stay clear of
# the lace crossings on either side.
CENTRE = (828, 1010)
DIAMETER = 380
# How much darker the pressed ink is than the leather round it. The lifted
# lettering measured 12 per cent at its median; a stamp SSK Europe puts on
# every glove should read at a glance, so it is pressed a little deeper.
DROP = 0.24


# Where the old marks stood, in canvas pixels (build_palm.py's MARKS after
# the resize). lift_marks() took the lettering off the leather, but not all
# of it: a pale rectangle the size of each box and the ghost of "Custom
# Made" stayed in the leather, hidden as long as the old mask was laid back
# over them. With the stamp in their place they showed, so the leather
# inside each box is refilled from the leather round it.
OLD_BOXES = [[654, 831, 990, 966], [849, 972, 978, 1070], [678, 1124, 1003, 1217]]


def refill(path, boxes, feather=10, margin=6):
    """Replace what is inside `boxes` of a layer with leather inpainted from
    around them, feathered at the border. The alpha is untouched."""
    import cv2
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).copy()
    hole = np.zeros(a.shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes:
        hole[y0 - margin:y1 + margin, x0 - margin:x1 + margin] = 1
    rgb = np.ascontiguousarray(a[..., :3])
    filled = cv2.inpaint(rgb, hole, 12, cv2.INPAINT_TELEA)
    # a soft border, so the refill meets the leather round it without a step
    w = ndimage.distance_transform_edt(hole)
    w = np.clip(w / feather, 0, 1)[..., None].astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] * (1 - w) + filled * w, 0, 255).astype(np.uint8)
    Image.fromarray(a, "RGBA").save(path, "WEBP", quality=88, method=4)
    return int(hole.sum())


def main():
    data = json.loads((OUT / "palm-data.json").read_text())
    for name in ("palm", "palm_hi"):
        f = HERE / "customiser" / data["assets"][name]
        print(f"refilled {refill(f, OLD_BOXES)} px of the old marks' boxes in {f.name}")
    W, H = data["w"], data["h"]
    palm = np.asarray(Image.open(HERE / "customiser" / data["assets"]["palm"]).convert("RGBA"))[..., 3]

    ink = 1.0 - np.asarray(Image.open(STAMP).convert("L")).astype(np.float32) / 255.0
    ys, xs = np.nonzero(ink > 0.5)
    ink = ink[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    side = max(ink.shape)
    sq = np.zeros((side, side), np.float32)
    sq[(side - ink.shape[0]) // 2:(side - ink.shape[0]) // 2 + ink.shape[0],
       (side - ink.shape[1]) // 2:(side - ink.shape[1]) // 2 + ink.shape[1]] = ink
    small = np.asarray(Image.fromarray((sq * 255).astype(np.uint8))
                       .resize((DIAMETER, DIAMETER), Image.LANCZOS)).astype(np.float32) / 255.0
    # a pressed edge is soft, not a printed one
    small = ndimage.gaussian_filter(small, 0.7)

    cx, cy = CENTRE
    x0, y0 = cx - DIAMETER // 2, cy - DIAMETER // 2
    x1, y1 = x0 + DIAMETER, y0 + DIAMETER
    ratio = np.ones((H, W), np.float32)
    ratio[y0:y1, x0:x1] = 1.0 - DROP * small
    alpha = np.zeros((H, W), np.uint8)
    alpha[y0:y1, x0:x1] = np.where(palm[y0:y1, x0:x1] > 0, 255, 0)

    # The mask carries alpha only where the palm leather is, so the laces
    # crossing the pocket stay on top of the stamp, as they do on the glove.
    # What the stamp must not do is run off the glove altogether.
    glove = np.asarray(Image.open(OUT / "palm" / "glove.webp").convert("RGBA"))[..., 3]
    off = int(((glove[y0:y1, x0:x1] <= 200) & (small >= 0.05)).sum())
    if off:
        raise SystemExit(f"stamp leaves the glove on {off} px; move or shrink it")
    under_lace = int(((palm[y0:y1, x0:x1] <= 200) & (small >= 0.5)).sum())

    rgb = np.repeat((ratio * 255.0)[..., None], 3, 2)
    mask = Image.fromarray(np.dstack([rgb, alpha[..., None]]).astype(np.uint8), "RGBA")
    mask.save(OUT / "palm" / "marks.webp", "WEBP", quality=88, method=4)
    data["marks"] = {"zone": "palm", "boxes": [[x0, y0, x1, y1]]}
    (OUT / "palm-data.json").write_text(json.dumps(data, separators=(",", ":")))
    print(f"stamp {DIAMETER} px at {CENTRE}: box {[x0, y0, x1, y1]}, "
          f"ink {int((small > 0.5).sum())} px ({under_lace} under a lace), {DROP:.0%} darker; "
          f"wrote assets/palm/marks.webp")


if __name__ == "__main__":
    main()
