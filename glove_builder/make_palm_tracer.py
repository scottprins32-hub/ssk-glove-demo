"""Build the palm tracer: bies, welting and finger leathers, pre-traced.

Scott: "We moeten even aan het werk met de bies, welting en vingerleer stukken
voor de palmview, maak een tracer voor mij ... pre trace the things for me so I
can select, edit and/or retrace things."

The September rainbow glove has every piece in its own colour, so the pieces
fall out of the photograph by hue: teal palm, pink lace/welting/binding,
green/yellow/orange/red finger leathers, purple thumb. Pink is split by width
(laces are wide, welting and binding are thin lines) and the thin lines by
place (on the outer edge of the glove = bies, between palm and finger
leather = welting). The result is a starting point, not a verdict; the page
is where it gets corrected.

    python glove_builder/make_palm_tracer.py

Writes customiser/dist/palm-tracer.html. Coordinates are palm-view canvas
pixels (1534x1400, the DSC05706 crop scaled by 1400/1145), the same space as
customiser/assets/palm-data.json; the JSON export also carries source-crop
pixels for make_store_palm.py.
"""
import base64
import io
import json
import pathlib
from collections import Counter

import cv2
import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).parent
PHOTO = HERE / "images/store-2026-09/rainbow-palm.png"
ASSETS = HERE / "customiser/assets"
OUT = HERE / "customiser/dist/palm-tracer.html"
W, H = 1534, 1400

CATS = [
    {"id": "binding", "label": "Bies", "color": "#1f6bff"},
    {"id": "welting", "label": "Welting", "color": "#e8332a"},
    {"id": "finger", "label": "Vingerleer", "color": "#f2c200"},
]
# rainbow colour -> finger leather piece, left to right on the palm view
FINGER = [
    (7, "Duimleer (paars)"),
    (6, "Vingerleer wijs-middel (groen)"),
    (5, "Vingerleer middel-ring (geel)"),
    (4, "Vingerleer ring-pink (oranje)"),
    (3, "Pinkleer buitenkant (rood)"),
]


def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def morph(m, opening=0, closing=0):
    m = m.astype(np.uint8)
    if opening:
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, disk(opening))
    if closing:
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, disk(closing))
    return m


def alpha(rel):
    return np.asarray(Image.open(ASSETS / rel).convert("RGBA"))[..., 3] > 100


def classify(rgb):
    """0 none, 1 teal, 2 pink, 3 red, 4 orange, 5 yellow, 6 green, 7 purple."""
    f = rgb.astype(float) / 255
    mx, mn = f.max(-1), f.min(-1)
    c = np.maximum(mx - mn, 1e-6)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / c) % 6, np.where(mx == g, (b - r) / c + 2, (r - g) / c + 4)) * 60
    sat = (s > .25) & (mx > .08)

    def hue(a, b):
        return ((h >= a) & (h < b)) if a < b else ((h >= a) | (h < b))

    cls = np.zeros(h.shape, np.uint8)
    cls[sat & hue(165, 205)] = 1
    cls[sat & hue(330, 15) & (s < .72)] = 2
    cls[sat & hue(345, 15) & (s >= .72)] = 3
    cls[sat & hue(15, 38) & (s >= .6)] = 4
    cls[sat & hue(38, 70)] = 5
    cls[sat & hue(75, 160)] = 6
    cls[sat & hue(250, 330)] = 7
    return cls


def pretrace(photo):
    glove = alpha("side-lossless-r01/palm-glove.png")
    web = cv2.dilate(alpha("side-lossless-r01/palm-web.png").astype(np.uint8), disk(6)) > 0
    cls = classify(np.asarray(photo))
    cls[~glove] = 0

    pink = morph(cls == 2, closing=1)
    thick = morph(pink, opening=7)                       # laces: wider than ~15 px
    thin = pink & (1 - cv2.dilate(thick, disk(2)))
    leather = morph(np.isin(cls, [1, 3, 4, 5, 6, 7]), 1, 2)
    thin = thin & cv2.dilate(leather, disk(10))          # not loose lace tails
    thin = (morph(thin, closing=2) & pink) | thin
    edge = cv2.distanceTransform(morph(glove, closing=3), cv2.DIST_L2, 5) < 16
    heel = np.arange(H)[:, None] > 1000
    binding = thin & (edge | heel).astype(np.uint8)
    welting = thin & (1 - binding)

    shapes = []

    def where(x, y):
        if y > 1000:
            return "hiel"
        for edge, finger in [(520, "duim"), (845, "wijsvinger"), (1000, "middelvinger"), (1170, "ringvinger")]:
            if x < edge:
                return finger
        return "pink"

    def add(mask, cat, name, min_area, eps):
        n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
        for i in sorted(range(1, n), key=lambda i: st[i, 0]):
            if st[i, 4] < min_area:
                continue
            comp = lab == i
            if cat != "finger" and (web[comp].mean() > .5 or max(st[i, 2], st[i, 3]) < 40):
                continue                                 # inside the web, or a speck
            cs, _ = cv2.findContours(comp.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            c = cv2.approxPolyDP(max(cs, key=cv2.contourArea), eps, True)[:, 0, :]
            if len(c) >= 3:
                if cat != "finger":
                    ys, xs = np.nonzero(comp)
                    name_ = f"{name} {where(xs.mean(), ys.mean())}"
                else:
                    name_ = name
                shapes.append({"cat": cat, "name": name_, "pts": c.astype(int).tolist()})

    for value, name in FINGER:
        add(morph(cls == value, 2, 4), "finger", name, 1200, 1.5)
    add(welting, "welting", "Welting", 150, .9)
    add(binding, "binding", "Bies", 150, .9)

    seen, total = Counter(), Counter(s["name"] for s in shapes)
    for s in shapes:
        seen[s["name"]] += 1
        if total[s["name"]] > 1:
            s["name"] += f" {seen[s['name']]}"
    return shapes


def old_masks():
    """Today's shipped welting/binding/laces masks, tinted, to compare against."""
    out = np.zeros((H, W, 4), np.uint8)
    for rel, colour in [("side-lossless-r01/palm-laces.png", (255, 255, 255)),
                        ("side-lossless-r01/palm-binding.png", (31, 107, 255)),
                        ("side-lossless-r01/palm-welting.png", (232, 51, 42))]:
        m = alpha(rel)
        out[m, :3] = colour
        out[m, 3] = 170
    return out


def uri(im, fmt, **kw):
    buf = io.BytesIO()
    im.save(buf, fmt, **kw)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    src = Image.open(PHOTO).convert("RGB")
    if src.size != (1255, 1145):
        raise ValueError("expected the documented 1255x1145 crop of DSC05706")
    photo = src.resize((W, H), Image.LANCZOS)
    shapes = pretrace(photo)
    render = Image.open(ASSETS / "side-lossless-r01/palm-glove.png").convert("RGBA")
    data = {
        "w": W, "h": H, "cats": CATS, "shapes": shapes,
        "srcScale": src.height / H,
        "source": {"photo": str(PHOTO.relative_to(HERE)), "crop": list(src.size), "frame": "DSC05706"},
        "photo": uri(photo, "JPEG", quality=88),
        "render": uri(render, "WEBP", quality=85),
        "oldMasks": uri(Image.fromarray(old_masks()), "WEBP", quality=80),
    }
    html = (HERE / "palm_tracer_template.html").read_text()
    html = html.replace("/*__DATA__*/{}", json.dumps(data, separators=(",", ":")))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html)
    count = Counter(s["cat"] for s in shapes)
    print(f"wrote {OUT.relative_to(HERE.parent)} ({OUT.stat().st_size / 1e6:.2f} MB): "
          + ", ".join(f"{count[c['id']]} {c['label'].lower()}" for c in CATS))


if __name__ == "__main__":
    main()
