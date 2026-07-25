"""Extract the Edge Gold badge (gold metal S-flag + black rubber rim) from
Scott's reference photo and derive Edge Silver / Edge Gun Metal variants.

    python glove_builder/customiser/extract_edge_badge.py \
        --photo <upload.jpeg> --outdir glove_builder/customiser
"""

import argparse
import pathlib

import cv2
import numpy as np
from PIL import Image
from skimage import morphology

CROP = (0.325, 0.245, 0.665, 0.80)  # x0, y0, x1, y1 normalized (raw orient.)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--photo", required=True)
    ap.add_argument("--outdir", required=True)
    args = ap.parse_args()
    out = pathlib.Path(args.outdir)

    img = cv2.cvtColor(np.asarray(Image.open(args.photo).convert("RGB")),
                       cv2.COLOR_RGB2BGR)
    H, W = img.shape[:2]
    x0, y0, x1, y1 = (int(CROP[0] * W), int(CROP[1] * H),
                      int(CROP[2] * W), int(CROP[3] * H))
    crop = img[y0:y1, x0:x1]
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    gold = (h >= 15) & (h <= 40) & (s >= 40) & (v >= 90)
    gold = morphology.remove_small_objects(gold, 400)
    # rubber rim: dark pixels hugging the gold
    kd = np.ones((45, 45), np.uint8)
    near = cv2.dilate(gold.astype(np.uint8), kd) > 0
    dark = (v < 95)
    rim = dark & near
    badge = gold | rim
    badge = cv2.morphologyEx(badge.astype(np.uint8), cv2.MORPH_CLOSE,
                             np.ones((15, 15), np.uint8)).astype(bool)
    badge = morphology.remove_small_objects(badge, 4000)
    badge = morphology.remove_small_holes(badge, 4000)
    # keep every component near the largest one (tips can detach slightly)
    n, lab, stats, cents = cv2.connectedComponentsWithStats(
        badge.astype(np.uint8))
    if n > 1:
        main = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        mc = cents[main]
        keep = []
        for i in range(1, n):
            ys_i, xs_i = np.nonzero(lab == i)
            pts_i = np.stack([xs_i - xs_i.mean(), ys_i - ys_i.mean()], 1)
            ev = np.linalg.eigvalsh(np.cov(pts_i.T.astype(np.float32)))
            elong = np.sqrt(max(ev[1], 1e-6) / max(ev[0], 1e-6))
            near = np.hypot(*(cents[i] - mc)) < 0.5 * np.hypot(
                stats[main, cv2.CC_STAT_WIDTH], stats[main, cv2.CC_STAT_HEIGHT])
            if i == main or (elong < 4.0 and near):
                keep.append(i)
        badge = np.isin(lab, keep)

    # deskew so the flag runs horizontal like the catalog art
    ys, xs = np.nonzero(badge)
    pts = np.stack([xs - xs.mean(), ys - ys.mean()], 1).astype(np.float32)
    evals, evecs = np.linalg.eigh(np.cov(pts.T))
    vmain = evecs[:, np.argmax(evals)]
    angle = np.degrees(np.arctan2(vmain[1], vmain[0]))
    rgba = np.dstack([cv2.cvtColor(crop, cv2.COLOR_BGR2RGB),
                      np.where(badge, 255, 0).astype(np.uint8)])
    M = cv2.getRotationMatrix2D((crop.shape[1] / 2, crop.shape[0] / 2),
                                angle, 1.0)
    rot = cv2.warpAffine(rgba, M, (crop.shape[1], crop.shape[0]))
    a = rot[..., 3]
    ys, xs = np.nonzero(a > 40)
    pad = 10
    rot = rot[max(ys.min() - pad, 0):ys.max() + pad,
              max(xs.min() - pad, 0):xs.max() + pad]
    Image.fromarray(rot, "RGBA").save(out / "edge_gold_badge.png")

    # variants: recolor the gold metal, keep the black rim
    r = rot.astype(np.float32)
    hsv2 = cv2.cvtColor(r[..., :3].astype(np.uint8), cv2.COLOR_RGB2HSV)
    gsel = ((hsv2[..., 0] >= 12) & (hsv2[..., 0] <= 45) &
            (hsv2[..., 1] >= 30) & (r[..., 3] > 40))
    lum = r[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)

    silver = r.copy()
    for c in range(3):
        silver[..., c][gsel] = np.clip(lum[gsel] * 1.06 + 14, 0, 255)
    Image.fromarray(silver.astype(np.uint8), "RGBA").save(
        out / "edge_silver_badge.png")

    gun = r.copy()
    tint = np.array([0.52, 0.56, 0.62], np.float32)  # dark blue-grey
    for c in range(3):
        gun[..., c][gsel] = np.clip(lum[gsel] * tint[c] + 8, 0, 255)
    Image.fromarray(gun.astype(np.uint8), "RGBA").save(
        out / "edge_gunmetal_badge.png")
    print("badges written:", rot.shape[1], "x", rot.shape[0])


if __name__ == "__main__":
    main()
