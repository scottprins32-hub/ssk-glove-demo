"""Recolor the HD Black/Gold embroidered bullet patch into every other
color combo. Thread texture is preserved via luminance-normalized HSV
mapping.

Which colour goes on the border and which on the body is taken from SSK's
own catalogue photos in form_assets/bullet_logos/, not from the option name:
the Black/X patches are named border-first, while Blue/Gold, Navy/Gold,
Green/Gold, Winered/Gold and Red/Green are named body-first. Compare any
change against those JPEGs before trusting the name.

    python glove_builder/customiser/recolor_badge.py \
        --base glove_builder/customiser/bullet_blackgold_badge.png \
        --outdir glove_builder/customiser
"""

import argparse
import pathlib

import cv2
import numpy as np
from PIL import Image

# slug -> (display name, border hex or None=keep black, inner hex or
# None=keep gold, inner mode)
COMBOS = {
    "blackred":    ("Black/Red",    None,      "#C8102E", "color"),
    "blackpink":   ("Black/Pink",   None,      "#E17FC0", "color"),
    "blackpurple": ("Black/Purple", None,      "#8A3FBF", "color"),
    "blacksilver": ("Black/Silver", None,      None,      "silver"),
    # body-first names: the gold is the BORDER on these, per SSK's photos
    "redgreen":    ("Red/Green",    "#279B48", "#C8102E", "color"),
    "greengold":   ("Green/Gold",   "#C9A227", "#279B48", "color"),
    "wineredgold": ("Winered/Gold", "#C9A227", "#7B2A2F", "color"),
    "bluegold":    ("Blue/Gold",    "#C9A227", "#2145D6", "color"),
    "navygold":    ("Navy/Gold",    "#C9A227", "#1D3A8F", "color"),
}


def hex_rgb(hx):
    n = int(hx.lstrip("#"), 16)
    return np.array([(n >> 16) & 255, (n >> 8) & 255, n & 255], np.float32)


def recolor_region(rgb, sel, target_hex):
    """Map region pixels to the target color, keeping thread shading."""
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    med = max(np.median(lum[sel]), 1.0)
    t = hex_rgb(target_hex)
    scale = (lum[sel] / med)[:, None]
    # allow highlights above the target color, softly
    out = np.clip(t[None, :] * np.clip(scale, 0.25, 1.75), 0, 255)
    rgb[sel] = out
    return rgb


def silver_region(rgb, sel):
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    v = np.clip(lum[sel] * 1.08 + 16, 0, 255)
    rgb[sel] = np.stack([v * 0.98, v * 1.0, v * 1.04], 1).clip(0, 255)
    return rgb


def level_angle(alpha):
    """Tilt of the badge's long axis vs horizontal, via min-area rect."""
    pts = cv2.findNonZero((alpha > 40).astype(np.uint8))
    (_, _), (w, h), th = cv2.minAreaRect(pts)
    if w < h:
        th += 90
    return ((th + 90) % 180) - 90


def level(pil_img):
    """Rotate so the ribbon bars read horizontal — picker thumbnails only.
    The badge files keep the photographed on-glove tilt for mounting."""
    th = level_angle(np.asarray(pil_img)[..., 3])
    r = pil_img.rotate(th, expand=True, resample=Image.BICUBIC)
    ra = np.asarray(r)
    ys, xs = np.nonzero(ra[..., 3] > 40)
    pad = 8
    ra = ra[max(ys.min() - pad, 0):ys.max() + pad,
            max(xs.min() - pad, 0):xs.max() + pad]
    return Image.fromarray(ra, "RGBA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--outdir", required=True)
    args = ap.parse_args()
    out = pathlib.Path(args.outdir)

    base_img = Image.open(args.base).convert("RGBA")
    base = np.asarray(base_img).astype(np.float32)
    rgb0, alpha = base[..., :3], base[..., 3]
    vis = alpha > 40
    hsv = cv2.cvtColor(rgb0.astype(np.uint8), cv2.COLOR_RGB2HSV)
    v = hsv[..., 2]
    border = vis & (v < 90)          # black embroidered outline
    inner = vis & ~border            # gold satin threads

    for slug, (name, border_hex, inner_hex, mode) in COMBOS.items():
        rgb = rgb0.copy()
        if mode == "color":
            rgb = recolor_region(rgb, inner, inner_hex)
        elif mode == "silver":
            rgb = silver_region(rgb, inner)
        # mode "keep": inner gold stays as photographed
        if border_hex is not None:
            rgb = recolor_region(rgb, border, border_hex)
        patch = np.dstack([rgb, alpha]).astype(np.uint8)
        Image.fromarray(patch, "RGBA").save(out / f"bullet_{slug}_badge.png")

        thumb = level(Image.fromarray(patch, "RGBA"))
        thumb.thumbnail((140, 140), Image.LANCZOS)
        thumb.save(out / f"thumb_{slug}.png")
        print(f"{name:14s} -> bullet_{slug}_badge.png + thumb")

    # matching straight-on thumb for Black/Gold itself (consistency)
    bg = level(Image.fromarray(base.astype(np.uint8), "RGBA"))
    bg.thumbnail((140, 140), Image.LANCZOS)
    bg.save(out / "thumb_blackgold.png")
    print("Black/Gold thumb written")


if __name__ == "__main__":
    main()
