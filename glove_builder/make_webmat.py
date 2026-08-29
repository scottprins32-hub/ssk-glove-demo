"""Continuous web leather, for any web shape to be cut out of.

Every web so far was a photograph of a DIFFERENT glove, warped by a homography
into this glove's aperture and hole-filled by smearing. Different leather,
different light, different angle, three sources of error stacked, and the fill
smeared pixels in from far away. Scott, looking at all five: "right now they
are overlapping and stuff like that... compare it to how it works on the 44pro
custom website where the webs seamlessly change and immediately fit perfectly."

They fit perfectly there because a web is a SHAPE cut out of one material, not
a photograph of someone else's glove. So: keep the hand-traced shape, throw
away the borrowed pixels, and cut every web out of this glove's own web
leather. Then all webs share one material, one light and one angle, and
swapping between them cannot introduce a seam.

The stock H-web is a lattice, so its leather has 23% holes. Those are filled by
diffusion seeded ONLY from web leather — Telea inpainting bleeds the green
finger and the pink lacing straight in, because it propagates from every
boundary it can see. Grain is carried back afterwards from the leather's own
high-frequency residual, so the filled area is not glassy.

    python glove_builder/make_webmat.py

Writes layers/rainbow-back-4x/web_material.png.
"""

import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

from make_web import aperture

HERE = pathlib.Path(__file__).parent
LAY = HERE / "layers" / "rainbow-back-4x"


def main():
    import argparse
    ap_ = argparse.ArgumentParser()
    ap_.add_argument("--layer", default="web",
                     help="which zone supplies the material: web or laces")
    args = ap_.parse_args()
    web = Image.open(LAY / f"{args.layer}.png").convert("RGBA")
    a = np.asarray(web).astype(np.float32)
    known = a[..., 3] > 90
    ap = aperture(height=web.height)
    # a little margin, so a traced shape that overshoots still lands on leather
    ap = ndimage.binary_dilation(ap, np.ones((3, 3), bool), iterations=3)
    # The glove's OUTLINE, not its silhouette: the silhouette has holes exactly
    # where the web's openings are, so intersecting with it deleted the
    # aperture and left 19k px of the 960k.
    sil = np.asarray(Image.open(LAY / "glove.png").convert("RGBA"))[..., 3] > 40
    ap &= ndimage.binary_fill_holes(sil)
    hole = ap & ~known
    print(f"web leather {known.sum():,} px; aperture {ap.sum():,}; "
          f"to fill {hole.sum():,} ({100 * hole.sum() / ap.sum():.0f}%)")

    # --- colour and lighting: solve Laplace across the holes with the web's
    # own leather as the only boundary. Coarse to fine, because a plain
    # relaxation at full size takes thousands of sweeps to cross a 100 px gap.
    # Normalised convolution was the first attempt and washed out: the weight
    # term saturates once a wide blur touches everything, and the fill turned
    # into a white glow.
    import cv2
    rgb = a[..., :3].copy()
    seed = rgb.copy()
    seed[~known] = np.nan
    for k in (16, 8, 4, 2, 1):
        h, w_ = rgb.shape[0] // k, rgb.shape[1] // k
        # Downsample using ONLY known pixels. A plain INTER_AREA average pulls
        # in the white background showing through the lattice, and the coarse
        # levels then carry that white back down into every opening — which is
        # what turned the fill into a pale wash.
        kf = cv2.resize(known.astype(np.float32), (w_, h),
                        interpolation=cv2.INTER_AREA)
        num = cv2.resize(rgb * known[..., None], (w_, h),
                         interpolation=cv2.INTER_AREA)
        cur = num / np.maximum(kf, 1e-4)[..., None]
        kn = kf > 0.05
        hl = cv2.resize((ap & ~known).astype(np.uint8), (w_, h),
                        interpolation=cv2.INTER_NEAREST) > 0
        if k == 16:
            # Everything unknown starts at the leather's mean, not at whatever
            # `cur` holds there — outside the aperture that is a divide by a
            # near-zero weight, and the blur drags those values back in as a
            # pale wash over every opening.
            u = np.where(kn[..., None], cur,
                         cur[kn].mean(0) if kn.any() else 0.0).astype(np.float32)
        else:
            u = cv2.resize(u, (w_, h), interpolation=cv2.INTER_LINEAR)
            u = np.where(kn[..., None], cur, u).astype(np.float32)
        for _ in range(60):
            b = cv2.blur(u, (3, 3))
            u = np.where(hl[..., None], b, np.where(kn[..., None], cur, u))
    smooth = u.astype(np.float32)

    # --- grain, tiled rather than copied. Taking each filled pixel's grain
    # from its nearest real one replicates the same value along a ray and
    # rakes the fill with star-shaped streaks. A patch of real leather
    # mirror-tiled across the whole aperture gives even, believable grain.
    hi = rgb - np.dstack([ndimage.gaussian_filter(rgb[..., c], 3.0)
                          for c in range(3)])
    # Pick the calmest patch of real leather: the first one chosen sat across a
    # row of stitching and tiled it back across the whole web as ghost seams.
    T = 192
    deep = ndimage.binary_erosion(known, np.ones((T // 2, T // 2), bool))
    energy = ndimage.uniform_filter(np.abs(hi).mean(2), T)
    energy[~deep] = 1e9
    cy, cx = np.unravel_index(int(np.argmin(energy)), energy.shape)
    patch = hi[cy - T // 2:cy + T // 2, cx - T // 2:cx + T // 2]
    tile = np.concatenate([patch, patch[:, ::-1]], 1)
    tile = np.concatenate([tile, tile[::-1]], 0)          # mirrored, seamless
    ny = rgb.shape[0] // tile.shape[0] + 1
    nx = rgb.shape[1] // tile.shape[1] + 1
    grain = np.tile(tile, (ny, nx, 1))[:rgb.shape[0], :rgb.shape[1]]
    grain = np.where(known[..., None], hi, grain)

    out = np.clip(smooth + grain, 0, 255).astype(np.uint8)
    rgba = np.dstack([out, np.where(ap, 255, 0).astype(np.uint8)])
    p = LAY / f"{args.layer}_material.png"
    Image.fromarray(rgba, "RGBA").save(p)
    print(f"wrote {p.relative_to(HERE.parent)}")

    run = HERE / "runs" / f"{args.layer}mat"
    run.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out).crop((1500, 300, 2536, 2100)).resize((520, 900),
        Image.LANCZOS).save(run / "material.jpg", quality=92)


if __name__ == "__main__":
    main()
