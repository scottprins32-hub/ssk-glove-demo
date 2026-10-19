"""Turn Pim's product photographs into the customiser's photos.

    python3 build_photos.py --src <folder with Pim's photos> --out photos

Cuts the white studio background away (flood fill from the border, so white
garments keep their white), crops to the garment, scales to 1000px high and
writes WebP with alpha. Writes photos.json: per photo its size, so the page
can place logos in the photo's own coordinates.
"""
import argparse
import json
import pathlib
from collections import deque

from PIL import Image, ImageFilter

# source file -> (product, colour, view)
MAP = {}
for c in ['Black', 'Forest Green', 'Gold', 'Navy', 'Orange', 'Purple', 'Royal', 'Scarlet', 'White']:
    MAP[f'BST99 {c}.jpg'] = ('bst99', c, 'front')
    MAP[f'BST99LS {c}.jpg'] = ('bst99ls', c, 'front')
for c in ['Black', 'Navy', 'Royal', 'Scarlet']:
    MAP[f'BSJ200 {c}.png'] = ('bsj200', c, 'front')
    MAP[f'BSJ200 {c} Back.png'] = ('bsj200', c, 'back')
MAP.update({'hc2-black.jpg': ('hc2', 'Black', 'front'), 'hc2-navy.jpg': ('hc2', 'Navy', 'front'),
            'hc2-royal.jpg': ('hc2', 'Royal', 'front'), 'HC2SC1.jpg': ('hc2', 'Scarlet', 'front')})

HEIGHT = 1000


def cut_background(im, tol=26):
    """Alpha 0 for near-white pixels connected to the border."""
    im = im.convert('RGBA')
    w, h = im.size
    small = im.resize((w // 4, h // 4)) if w > 1200 else im
    sw, sh = small.size
    px = small.load()
    bg = [[False] * sw for _ in range(sh)]
    q = deque()
    for x in range(sw):
        q.extend([(x, 0), (x, sh - 1)])
    for y in range(sh):
        q.extend([(0, y), (sw - 1, y)])
    while q:
        x, y = q.popleft()
        if bg[y][x]:
            continue
        r, g, b, a = px[x, y]
        if a > 8 and min(r, g, b) < 255 - tol:
            continue
        bg[y][x] = True
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < sw and 0 <= ny < sh and not bg[ny][nx]:
                q.append((nx, ny))
    mask = Image.new('L', (sw, sh), 255)
    mp = mask.load()
    for y in range(sh):
        for x in range(sw):
            if bg[y][x]:
                mp[x, y] = 0
    mask = mask.filter(ImageFilter.MinFilter(3)).resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    alpha = Image.composite(im.getchannel('A'), Image.new('L', (w, h), 0), mask)
    im.putalpha(alpha)
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, type=pathlib.Path)
    ap.add_argument('--only', default='', help='only sources whose name contains this')
    ap.add_argument('--out', default=pathlib.Path(__file__).parent / 'photos', type=pathlib.Path)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    index_file = args.out / 'photos.json'
    index = json.loads(index_file.read_text()) if index_file.is_file() else {}
    for name, (product, colour, view) in sorted(MAP.items()):
        if args.only and args.only not in name:
            continue
        src = args.src / name
        if not src.is_file():
            print('missing', name)
            continue
        # White garments: only pure studio white counts as background, or the
        # fill runs into the shirt's own highlights.
        im = cut_background(Image.open(src), tol=4 if colour == 'White' else 26)
        im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox())
        scale = HEIGHT / im.height
        im = im.resize((round(im.width * scale), HEIGHT), Image.LANCZOS)
        slug = colour.lower().replace(' ', '-')
        file = f'{product}-{slug}-{view}.webp'
        im.save(args.out / file, 'WEBP', quality=84, method=6)
        index.setdefault(product, {}).setdefault(slug, {})[view] = {'src': f'photos/{file}', 'w': im.width, 'h': im.height}
        print(file, im.size)
    index_file.write_text(json.dumps(index, indent=1))


if __name__ == '__main__':
    main()
