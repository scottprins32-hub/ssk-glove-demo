"""Extract the embroidered Black/Gold bullet logo from Scott's photo.

    python glove_builder/customiser/extract_blackgold_badge.py \
        --photo <upload.jpeg> --out glove_builder/customiser/bullet_blackgold_badge.png
"""

import argparse

import cv2
import numpy as np
from PIL import Image
from skimage import morphology

CROP = (0.495, 0.32, 0.66, 0.73)  # x0, y0, x1, y1 normalized (raw orient.)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photo", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    img = cv2.cvtColor(np.asarray(Image.open(args.photo).convert("RGB")),
                       cv2.COLOR_RGB2BGR)
    H, W = img.shape[:2]
    x0, y0, x1, y1 = (int(CROP[0] * W), int(CROP[1] * H),
                      int(CROP[2] * W), int(CROP[3] * H))
    crop = img[y0:y1, x0:x1]
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    gold = (h >= 12) & (h <= 38) & (s >= 60) & (v >= 100)
    gold = morphology.remove_small_objects(gold, 400)
    kd = np.ones((41, 41), np.uint8)
    near = cv2.dilate(gold.astype(np.uint8), kd) > 0
    dark = v < 90
    badge = gold | (dark & near)
    badge = cv2.morphologyEx(badge.astype(np.uint8), cv2.MORPH_CLOSE,
                             np.ones((13, 13), np.uint8)).astype(bool)
    badge = morphology.remove_small_objects(badge, 4000)
    badge = morphology.remove_small_holes(badge, 4000)

    n, lab, stats, cents = cv2.connectedComponentsWithStats(
        badge.astype(np.uint8))
    main_c = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    mc = cents[main_c]
    keep = []
    for i in range(1, n):
        ys_i, xs_i = np.nonzero(lab == i)
        pts_i = np.stack([xs_i - xs_i.mean(), ys_i - ys_i.mean()], 1)
        ev = np.linalg.eigvalsh(np.cov(pts_i.T.astype(np.float32)))
        elong = np.sqrt(max(ev[1], 1e-6) / max(ev[0], 1e-6))
        near_c = np.hypot(*(cents[i] - mc)) < 0.5 * np.hypot(
            stats[main_c, cv2.CC_STAT_WIDTH], stats[main_c, cv2.CC_STAT_HEIGHT])
        if i == main_c or (elong < 4.0 and near_c):
            keep.append(i)
    badge = np.isin(lab, keep)

    ys, xs = np.nonzero(badge)
    pts = np.stack([xs - xs.mean(), ys - ys.mean()], 1).astype(np.float32)
    evals, evecs = np.linalg.eigh(np.cov(pts.T))
    vmain = evecs[:, np.argmax(evals)]
    angle = np.degrees(np.arctan2(vmain[1], vmain[0]))
    rgba = np.dstack([cv2.cvtColor(crop, cv2.COLOR_BGR2RGB),
                      np.where(badge, 255, 0).astype(np.uint8)])
    rot = np.asarray(Image.fromarray(rgba, "RGBA").rotate(
        angle, expand=True, resample=Image.BICUBIC))
    a = rot[..., 3]
    ys, xs = np.nonzero(a > 40)
    pad = 10
    rot = rot[max(ys.min() - pad, 0):ys.max() + pad,
              max(xs.min() - pad, 0):xs.max() + pad]
    Image.fromarray(rot, "RGBA").save(args.out)
    print(f"black/gold badge {rot.shape[1]}x{rot.shape[0]}, "
          f"deskew {angle:.1f} deg -> {args.out}")


if __name__ == "__main__":
    main()
