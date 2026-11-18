"""Build body-first embroidered badges from the original HD badge scans.

Run with Pillow, NumPy and SciPy. The original files stay in hd-logos-r01.
The picker uses the same corrected artwork and angle as the glove renderer.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageColor
from scipy.ndimage import distance_transform_edt, gaussian_filter

from make_badge_previews import ROOT, preview


THREAD = {
    'Black': '#29282A', 'Blue': '#1857A6', 'Gold': '#C49B49',
    'Green': '#14703F', 'Navy': '#1B2545', 'Pink': '#E45F8E',
    'Purple': '#7231A5', 'Red': '#BC2628', 'Silver': '#A7A8AC',
    'White': '#E9E5DC', 'Winered': '#86303A',
}
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def unit(rgb):
    return rgb / np.maximum(np.linalg.norm(rgb, axis=-1, keepdims=True), 1)


def recolor(image, name):
    body_name, outline_name = name.split('/')
    rgba = np.array(image.convert('RGBA'))
    rgb = rgba[:, :, :3].astype(np.float32)
    luma = rgb @ LUMA
    distance = distance_transform_edt(rgba[:, :, 3] > 127)
    # The source embroidery has two separately coloured threads. Sample the
    # body well inside each ribbon and the outline just inside the silhouette.
    body = np.median(rgb[distance > 70], axis=0)
    outline = np.median(rgb[(distance > 6) & (distance < 17)], axis=0)
    if name == 'Black/Silver':
        # Silver and black have similar chroma; their lightness separates them.
        blend = np.clip((luma - 43) / 43, 0, 1)
    else:
        inside, outside = unit(body), unit(outline)
        contrast = max(1 - inside @ outside, 0.001)
        score = unit(rgb) @ (inside - outside) / contrast
        blend = np.clip(0.5 + score, 0, 1)
    blend = gaussian_filter(blend, sigma=0.8).astype(np.float32)
    if body_name == 'Black':
        # A deep crease in the source satin can be as dark as its original
        # black outline. Keep these stitches inside the new black body.
        blend = np.maximum(blend, np.clip((distance - 46) / 14, 0, 1))
    # Carry the stitch-by-stitch lightness into the new thread colours.
    def thread(color_name, original):
        color = np.asarray(ImageColor.getrgb(THREAD[color_name]), dtype=np.float32)
        shade = np.clip(luma / max(original @ LUMA, 1), 0.37, 1.62)
        return shade[:, :, None] * color

    weight = blend[:, :, None]
    corrected = weight * thread(body_name, body) + (1 - weight) * thread(outline_name, outline)
    rgba[:, :, :3] = np.rint(np.clip(corrected, 0, 255)).astype(np.uint8)
    return Image.fromarray(rgba)


def build():
    data_path = ROOT / 'assets/glove-data.json'
    registry_path = ROOT / 'hd-wrist-badges.json'
    data = json.loads(data_path.read_text())
    registry = json.loads(registry_path.read_text())
    by_asset = {badge['asset']: badge for badge in data['bullets']}
    for badge in registry:
        name = badge['name']
        if badge['material'] != 'embroidered' or '/' not in name:
            continue
        original = Path('assets/hd-logos-r01') / Path(badge['source']).name
        target = Path('assets/embroidered-body-first') / original.name
        thumb = Path('assets/thumbs') / f"body-first-{badge['asset']}.webp"
        (ROOT / target).parent.mkdir(parents=True, exist_ok=True)
        with Image.open(ROOT / original) as source:
            recolor(source, name).save(ROOT / target, 'WEBP', quality=91, method=4, exact=True)
        x, y, width, height = badge['sourceBox']
        with Image.open(ROOT / target) as image:
            preview(image.crop((x, y, x + width, y + height)), badge['artAngleDegrees']).save(
                ROOT / thumb, 'WEBP', lossless=True, exact=True
            )
        badge.update(source=target.as_posix(), thumb=thumb.as_posix())
        by_asset[badge['asset']]['thumb'] = thumb.as_posix()
        data['assets'][badge['asset']] = target.as_posix()
        print(name, target)
    data_path.write_text(json.dumps(data, indent=2) + '\n')
    registry_path.write_text(json.dumps(registry, indent=2) + '\n')


if __name__ == '__main__':
    build()
