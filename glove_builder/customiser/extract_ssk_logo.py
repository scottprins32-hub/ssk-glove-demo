"""Extract the gold embroidered SSK logo (flag + letters) from Scott's
reference photo into a clean, deskewed, textured glyph asset.

    python glove_builder/customiser/extract_ssk_logo.py \
        --photo /root/.claude/uploads/.../ab6f69ee-photo.jpeg \
        --out glove_builder/customiser/ssk_logo_mask.png
"""

import argparse

import cv2
import numpy as np
from PIL import Image
from skimage import morphology

# logo bounding region in normalized coords of the reference photo
CROP = (0.29, 0.515, 0.625, 0.665)  # x0, y0, x1, y1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photo", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    pil = Image.open(args.photo).convert("RGB")  # raw orientation
    img = cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR)
    H, W = img.shape[:2]
    x0, y0, x1, y1 = (int(CROP[0] * W), int(CROP[1] * H),
                      int(CROP[2] * W), int(CROP[3] * H))
    crop = img[y0:y1, x0:x1]
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    mask = (h >= 14) & (h <= 45) & (s >= 80) & (v >= 60)
    mask = morphology.remove_small_objects(mask, 120)
    mask = morphology.remove_small_holes(mask, 200)
    mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE,
                            np.ones((5, 5), np.uint8)).astype(bool)
    # keep only the logo row: components aligned with the median band,
    # dropping laces/knots that wandered into the crop
    n, lab, stats, cents = cv2.connectedComponentsWithStats(
        mask.astype(np.uint8))
    big = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 2500]
    if big:
        ys = np.array([cents[i][1] for i in big])
        med = np.median(ys)
        keep = [i for i in big if abs(cents[i][1] - med) < mask.shape[0] * 0.28]
        mask = np.isin(lab, keep)

    ys, xs = np.nonzero(mask)
    pts = np.stack([xs - xs.mean(), ys - ys.mean()], 1).astype(np.float32)
    evals, evecs = np.linalg.eigh(np.cov(pts.T))
    vmain = evecs[:, np.argmax(evals)]
    angle = np.degrees(np.arctan2(vmain[1], vmain[0]))
    if angle > 90:
        angle -= 180
    if angle < -90:
        angle += 180

    # keep the embroidery's own thread shading as the glyph luminance
    lum = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    lum_in = lum[mask]
    lo, hi = np.percentile(lum_in, 8), np.percentile(lum_in, 97)
    tex = np.clip((lum - lo) / max(hi - lo, 1), 0, 1)
    base = (0.55 + 0.45 * tex) * 0.74 * 255 / 0.83  # normalized around 0.74

    rgba = np.dstack([base, base, base,
                      np.where(mask, 255, 0)]).astype(np.uint8)
    # deskew
    M = cv2.getRotationMatrix2D((crop.shape[1] / 2, crop.shape[0] / 2),
                                angle, 1.0)
    rgba = cv2.warpAffine(rgba, M, (crop.shape[1], crop.shape[0]),
                          flags=cv2.INTER_LINEAR)
    a = rgba[..., 3]
    ys, xs = np.nonzero(a > 40)
    pad = 8
    rgba = rgba[max(ys.min() - pad, 0):ys.max() + pad,
                max(xs.min() - pad, 0):xs.max() + pad]
    Image.fromarray(rgba, "RGBA").save(args.out)
    print(f"logo glyph {rgba.shape[1]}x{rgba.shape[0]}, deskew {angle:.1f} deg"
          f" -> {args.out}")


if __name__ == "__main__":
    main()
