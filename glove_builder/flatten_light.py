"""Even out the light on the store photographs before a web is cut from them.

The gloves were shot on a stand by a window on the left, so every web sits
on the dark side of its glove: on the Modified Trapeze the web reads at half
the brightness of the finger panels beside it, and a cut carries that shade
into the configurator, where a multiply can only darken further. Scott: "the
lighting is way too dark on the webs so make the lighting there equal to the
left side."

Leather of one colour is the light meter. For each photograph the shell's
own leather is picked by colour, a smooth quadratic surface is fitted to its
log-brightness across the glove, and the whole frame is divided by that
surface normalised to its lit side. Albedo stays, since the surface varies
over the glove, not over a lace or a seam; only the falloff goes.

    python glove_builder/flatten_light.py images/store-2026-09/smlee.jpg ...
    python glove_builder/flatten_light.py --check images/store-2026-09/*.jpg
"""

import argparse
import pathlib

import cv2
import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).parent

# Which pixels are the shell leather, by photograph: (hue lo, hue hi) in
# OpenCV's 0-179, then saturation and value bounds. None on hue means any.
SHELL = {
    "trapeze": (None, (0, 40), (80, 255)),           # white leather
    "modified-trapeze": (None, (0, 90), (10, 110)),  # black leather
    "smlee": ((3, 22), (120, 255), (40, 255)),       # orange leather
    "em-rocket": ((85, 105), (80, 255), (30, 255)),  # Columbia blue
    "hood": ((3, 22), (120, 255), (25, 255)),        # the SMLEE glove again
}


def shell_mask(hsv, key):
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    hr, sr, vr = SHELL[key]
    m = (s >= sr[0]) & (s <= sr[1]) & (v >= vr[0]) & (v <= vr[1])
    if hr:
        m &= (h >= hr[0]) & (h <= hr[1])
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN,
                         np.ones((9, 9), np.uint8)) > 0
    return m


def fit_surface(lum, mask, order=2):
    """Least-squares polynomial surface through log-brightness, refitted
    twice without the worst residuals so laces, seams and stitching that
    slipped into the mask do not bend it."""
    H, W = lum.shape
    ys, xs = np.nonzero(mask)
    x = xs / W - 0.5
    y = ys / H - 0.5
    t = np.log(np.maximum(lum[ys, xs], 4.0))

    def design(x, y):
        cols = [np.ones_like(x), x, y, x * x, x * y, y * y]
        if order == 3:
            cols += [x ** 3, x * x * y, x * y * y, y ** 3]
        return np.stack(cols, 1)

    keep = np.ones(len(t), bool)
    for _ in range(3):
        A = design(x[keep], y[keep])
        coef, *_ = np.linalg.lstsq(A, t[keep], rcond=None)
        r = t - design(x, y) @ coef
        lim = 1.2 * np.median(np.abs(r[keep])) * 1.4826 * 2.5
        keep = np.abs(r) < max(lim, 0.05)
    gy, gx = np.mgrid[0:H, 0:W]
    return np.exp(design((gx / W - 0.5).ravel(),
                         (gy / H - 0.5).ravel()) @ coef).reshape(H, W)


def local_surface(lum, mask, sigma):
    """The light as it falls across the glove, read off the shell leather
    alone and smoothed over `sigma` pixels: a normalised convolution, so a
    lace or a seam inside the mask's holes borrows the light of the leather
    round it instead of dragging the estimate down. Scott, on the first
    version, which only took out the window's falloff: "I want it to look
    like there's light from 360 degrees around the glove." This one also
    takes the shade off each finger's far side, because at this scale that
    is shading too, not shape."""
    m = mask.astype(np.float32)
    num = cv2.GaussianBlur(lum * m, (0, 0), sigma)
    den = cv2.GaussianBlur(m, (0, 0), sigma)
    surf = num / np.maximum(den, 1e-3)
    # far from any shell leather the estimate is unsupported: fall back to a
    # wider blur so the gain stays smooth out to the laces and the edges
    wide = cv2.GaussianBlur(lum * m, (0, 0), sigma * 3) / np.maximum(
        cv2.GaussianBlur(m, (0, 0), sigma * 3), 1e-3)
    w = np.clip(den / 0.15, 0, 1)
    return surf * w + wide * (1 - w)


def flatten(path, key, cap=3.6, check=None, sigma=45):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    hsv = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_RGB2HSV)
    lum = im @ np.array([0.299, 0.587, 0.114], np.float32)
    mask = shell_mask(hsv, key)
    surf = local_surface(lum, mask, sigma)
    # the lit side sets the level: the brightest tenth of the surface over
    # the shell is what the whole glove is brought up to
    ref = float(np.percentile(surf[mask], 92))
    gain = np.clip(ref / np.maximum(surf, 1.0), 0.8, cap)
    # only the glove is relit; the backdrop and the stand keep their light.
    # The backdrop is the unsaturated bright field behind the glove (on the
    # white glove only the very unsaturated part of it), and the windows of
    # an open web are backdrop too, which is what keeps them from glowing.
    s_lim = 12 if key == "trapeze" else 45
    backdrop = (hsv[..., 1] < s_lim) & (hsv[..., 2] > 60)
    body = cv2.morphologyEx((~backdrop).astype(np.uint8), cv2.MORPH_OPEN,
                            np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(body, 8)
    if n > 1:
        body = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    # the silhouette, holes and all: a window in a web is backdrop, and the
    # web is cut with its windows read off the photograph either way
    from scipy import ndimage
    body = ndimage.binary_fill_holes(body > 0).astype(np.float32)
    glove = cv2.GaussianBlur(body, (0, 0), 2)
    gain = 1.0 + (gain - 1.0) * glove
    out = np.clip(im * gain[..., None], 0, 255).astype(np.uint8)
    print(f"{path.name}: shell {int(mask.sum())} px, gain over the shell "
          f"{gain[mask].min():.2f}-{gain[mask].max():.2f}, "
          f"web side x{np.median(gain[mask & (np.arange(im.shape[1])[None, :] > im.shape[1] * 0.6)]):.2f}")
    if check is not None:
        side = np.concatenate([im.astype(np.uint8), out], 1)
        Image.fromarray(side).resize((side.shape[1] // 2, side.shape[0] // 2),
                                     Image.LANCZOS).save(check, quality=88)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("photos", nargs="+")
    ap.add_argument("--check", action="store_true",
                    help="write runs/flatten-check/<name>.jpg, before|after, "
                         "and do not touch the photograph")
    args = ap.parse_args()
    for p in args.photos:
        p = pathlib.Path(p)
        key = p.stem
        if key not in SHELL:
            print(f"skip {p.name}: no shell rule")
            continue
        chk = None
        if args.check:
            d = HERE / "runs" / "flatten-check"
            d.mkdir(parents=True, exist_ok=True)
            chk = d / f"{key}.jpg"
        out = flatten(p, key, check=chk)
        if not args.check:
            Image.fromarray(out).save(p, quality=95)
            print(f"  wrote {p}")


if __name__ == "__main__":
    main()
