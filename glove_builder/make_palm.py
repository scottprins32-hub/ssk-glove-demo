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

Writes layers/rainbow-palm/*.png — one RGBA cutout per zone, the same shape
the back view's layers have — and runs/palm/check.jpg, the overlay to look at
before believing any of it.
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
    leather = (S > 0.12) | (V < 0.80)
    leather = ndimage.binary_closing(leather, np.ones((9, 9), bool))
    glove = ndimage.binary_fill_holes(leather)
    lbl, n = ndimage.label(glove)
    glove = lbl == (1 + int(np.argmax(ndimage.sum(glove, lbl, range(1, n + 1)))))
    # What you can see through: background enclosed by the outline. Kept from
    # before the fill, because the fill is what closes it.
    holes = glove & ~leather

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

    # ---------------------------------------------------------------- zones
    #
    # Hue gets six regions; two of them are two zones each, and both splits
    # are geometric rather than photometric.
    #
    # The WEB is the only turquoise you can see through. Its openings are
    # background enclosed by the glove's outline — the same fact the back
    # view's aperture is built on — so the web is the turquoise that touches
    # them and the palm is the rest.
    #
    # The BINDING is the only pink that follows the outline all the way
    # round. Everything pink is within a hand's width of something, so
    # nearness alone will not do it: take the pink that lies in a band along
    # the boundary AND belongs to the one piece that runs the whole way, and
    # the laces are what is left. This is the pair that wants a traced
    # boundary from Scott; until then it is an estimate, and the report says
    # by how much.
    band = {}
    for name, (lo, hi), smin, _ in BANDS:
        b = ((H >= lo) & (H <= hi)) if lo <= hi else ((H >= lo) | (H <= hi))
        m = glove & b & (S >= smin)
        m = ndimage.binary_opening(m, np.ones((3, 3), bool))
        band[name.split()[0]] = ndimage.binary_closing(m, np.ones((5, 5), bool))

    outline = glove
    # Not every hole is the web's. There are seven, and two of them are
    # elsewhere — a gap by the pinky and a nick in the rim. The web's five sit
    # together, so take the biggest and keep the ones near it.
    lbl, n = ndimage.label(holes)
    sizes = ndimage.sum(holes, lbl, range(1, n + 1)) if n else np.zeros(0)
    big = [i for i in range(1, n + 1) if sizes[i - 1] > 400]
    if big:
        seed = max(big, key=lambda i: sizes[i - 1])
        cy, cx = ndimage.center_of_mass(lbl == seed)
        near = []
        for i in big:
            y, x = ndimage.center_of_mass(lbl == i)
            if np.hypot(y - cy, x - cx) < 0.3 * glove.shape[1]:
                near.append(i)
        holes = np.isin(lbl, near)
        print(f"\n  web openings: {len(near)} of {len(big)} holes, "
              f"{int(holes.sum())} px")
    # The web is the turquoise around them. Reach is set by how far the web's
    # own bars run from an opening, not by a component test — the palm comes
    # back as one piece with the web attached, so a component test hands the
    # palm to the web.
    turq = band["turquoise"]
    web = turq & ndimage.binary_dilation(holes, np.ones((3, 3), bool),
                                         iterations=55)
    web = ndimage.binary_closing(web, np.ones((9, 9), bool))
    palm = turq & ~web

    edge = ndimage.binary_dilation(outline, np.ones((3, 3), bool)) & ~ \
        ndimage.binary_erosion(outline, np.ones((3, 3), bool), iterations=55)
    pink = band["pink"]
    ring = pink & edge
    lbl, n = ndimage.label(ndimage.binary_closing(ring, np.ones((9, 9), bool)))
    if n:
        sizes = ndimage.sum(ring, lbl, range(1, n + 1))
        keep = 1 + int(np.argmax(sizes))
        binding = ring & (lbl == keep)
    else:
        binding = ring
    laces = pink & ~binding

    zones = {"palm": palm, "web": web, "binding": binding, "laces": laces,
             "back1": band["purple"], "back9": band["red"],
             "welting": band["yellow"] | band["green"], "glove": glove}
    lay = HERE / "layers" / "rainbow-palm"
    lay.mkdir(parents=True, exist_ok=True)
    rgb = np.asarray(im)
    print()
    for name, m in zones.items():
        a = np.dstack([rgb, (m * 255).astype(np.uint8)])
        Image.fromarray(a, "RGBA").save(lay / f"{name}.png")
        print(f"  {name:10s} {int(m.sum()):7d} px -> "
              f"{(lay / (name + '.png')).relative_to(HERE.parent)}")

    zov = np.asarray(im).copy()
    for name, col in (("palm", (60, 220, 210)), ("web", (255, 170, 0)),
                      ("binding", (240, 90, 170)), ("laces", (60, 90, 240)),
                      ("back1", (150, 80, 220)), ("back9", (230, 60, 60)),
                      ("welting", (240, 210, 60))):
        m = zones[name]
        zov[m] = (0.3 * zov[m] + 0.7 * np.array(col)).astype(np.uint8)
    Image.fromarray(zov).save(out / "zones.jpg", quality=92)
    print(f"\nwrote {out}/zones.jpg")


if __name__ == "__main__":
    main()
