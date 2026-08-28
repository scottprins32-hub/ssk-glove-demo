"""First pass at the palm view's zone map, from the rainbow calibration glove.

The back view needed SAM3 to find its zones. The palm does not: this glove was
made rainbow precisely so every part is its own hue, and on the palm side the
separation is clean — 65% turquoise, 24% pink, 6% purple, with red, yellow and
green strips in the finger channels.

Two pairs share a colour and hue cannot split them, so they come out as one
region each and need a traced boundary:
  - palm and web are both turquoise
  - the lacing and the binding are both pink

    python glove_builder/make_palm.py

Writes runs/palm/check.jpg — the overlay to look at before believing any of it.
"""

import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
PHOTO = HERE / "images/drive-2026-08/SE-1250-RAINBOW-Inside.jpg"
WORK = 1400          # working width; the photo is 3679 square

# hue window, saturation floor, and the colour to paint it in the check
BANDS = [
    ("turquoise  palm + web",   (165, 205), 0.25, (60, 220, 210)),
    ("pink       lacing + binding", (305, 355), 0.25, (240, 90, 170)),
    ("purple     thumb side",    (262, 302), 0.22, (150, 80, 220)),
    ("red        pinky side",    (352, 18),  0.30, (230, 60, 60)),
    ("yellow     finger channel", (25, 55),  0.30, (240, 210, 60)),
    ("green      finger channel", (130, 163), 0.28, (70, 200, 90)),
]


def main():
    im = Image.open(PHOTO).convert("RGB")
    im = im.resize((WORK, round(WORK * im.height / im.width)), Image.LANCZOS)
    hsv = np.asarray(im.convert("HSV")).astype(np.float32)
    H, S, V = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255

    # the glove against the white sweep
    glove = (S > 0.12) | (V < 0.80)
    glove = ndimage.binary_closing(glove, np.ones((9, 9), bool))
    glove = ndimage.binary_fill_holes(glove)
    lbl, n = ndimage.label(glove)
    glove = lbl == (1 + int(np.argmax(ndimage.sum(glove, lbl, range(1, n + 1)))))

    ov = np.asarray(im).copy()
    claimed = np.zeros(glove.shape, bool)
    print(f"working at {im.size}, glove is {100 * glove.mean():.0f}% of frame\n")
    for name, (lo, hi), smin, col in BANDS:
        band = ((H >= lo) & (H <= hi)) if lo <= hi else ((H >= lo) | (H <= hi))
        m = glove & band & (S >= smin)
        m = ndimage.binary_opening(m, np.ones((3, 3), bool))
        m = ndimage.binary_closing(m, np.ones((5, 5), bool))
        pieces = ndimage.label(m)[1]
        ov[m] = (0.35 * ov[m] + 0.65 * np.array(col)).astype(np.uint8)
        claimed |= m
        print(f"  {name:28s} {m.sum():7d} px  {100*m.sum()/glove.sum():5.1f}%"
              f"  {pieces:4d} pieces")

    left = glove & ~claimed
    ov[left] = (0.5 * ov[left] + 0.5 * np.array([40, 40, 40])).astype(np.uint8)
    print(f"\n  {'unclaimed (dark grey)':28s} {left.sum():7d} px"
          f"  {100*left.sum()/glove.sum():5.1f}%")

    out = HERE / "runs" / "palm"
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(ov).save(out / "check.jpg", quality=92)
    print(f"\nwrote {out}/check.jpg")


if __name__ == "__main__":
    main()
