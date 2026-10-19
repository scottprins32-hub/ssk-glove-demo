"""Build the glove tracer: every view of the current builder, every part in
its own colour, with bies, welting and finger leathers pre-traced to edit.

Scott: "We moeten even aan het werk met de bies, welting en vingerleer stukken
voor de palmview, maak een tracer voor mij ... pre trace the things for me so I
can select, edit and/or retrace things", then "Gebruik de huidige builder voor
de hoeken etc met alle dingen in verschillende kleuren zodat ze makkelijk aan
te wijzen zijn."

    NODE_PATH=<dir holding playwright> node glove_builder/render_views.mjs
    python glove_builder/make_view_tracer.py

render_views.mjs drives the real configurator and saves back, palm, thumb and
pinky with one colour per order field (runs/view-tracer). This script adds,
per view, a zone map (which part is under the mouse) and a legend, and
pre-traces from the builder's own zone masks: binding -> bies, welting ->
welting, the back panels -> vingerleer.

The palm view is the exception. Its shipped masks are wrong where it matters
here (the pink welting line is in the laces layer, the finger leather between
the fingers is in the welting layer), so the palm is pre-traced from the
September rainbow photo instead, where every piece has its own colour: pink is
split by width (laces are wide, welting and binding thin lines) and the thin
lines by place (outer edge = bies, between palm and finger leather = welting).

Writes customiser/dist/view-tracer.html. Coordinates are each view's canvas
pixels, the space of its *-data.json; palm shapes also carry source-crop
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
OUT = HERE / "customiser/dist/view-tracer.html"
RENDERS = HERE / "runs/view-tracer"
W, H = 1534, 1400  # palm view

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


VIEWS = {
    "back": ("Achterkant", "glove-data.json"),
    "palm": ("Palm", "palm-data.json"),
    "thumb": ("Duimkant", "thumb-data.json"),
    "pinky": ("Pinkkant", "pinky-data.json"),
}
# back-view layer ids that are not field names (app.js FIELD_TO_LAYER)
BACK_FIELD = {"back78": "back7", "embroidery": "ring_emb"}
LABEL = {"palm": "Palm", "web": "Web", "belt": "Belt", "lining": "Lining", "binding": "Bies",
         "welting": "Welting", "laces": "Veters", "thumb_loops": "Duimlussen",
         "pinky_loops": "Pinklussen", "stitching": "Stiksel", "ring_emb": "Ringvinger borduur"}
FINGER_ZONES = {"back1", "back2", "back3", "back4", "back5", "back6", "back7", "back78", "back8", "back9"}


def zone_alpha(data, zid):
    w, h = data["w"], data["h"]
    rel = data["assets"].get(zid)
    if not rel:
        return None
    im = Image.open(HERE / "customiser" / rel).convert("RGBA")
    out = np.zeros((h, w), np.uint8)
    if im.size == (w, h):
        out[:] = np.asarray(im)[..., 3]
    else:
        x0, y0 = data["bbox"][zid][:2]
        a = np.asarray(im)[..., 3][: h - y0, : w - x0]
        out[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a
    return out


def view_data(view, colors, palettes):
    label, name = VIEWS[view]
    data = json.loads((ASSETS / name).read_text())
    legend, idmap, masks = [], np.zeros((data["h"], data["w"]), np.uint8), {}
    for z in data["zones"]:
        zid = z["id"]
        a = zone_alpha(data, zid)
        if a is None or (a > 128).sum() < 30:
            continue
        field = z.get("field") or (BACK_FIELD.get(zid, zid) if view == "back" else zid)
        if view == "back" and zid == "palm":
            field = "back2"                      # the back view's "palm" layer is Back 2
        code = colors.get(field)
        entry = next((c for c in palettes[z["group"]] if c[0] == code), None)
        pretty = field.replace("back", "Back ") if field.startswith("back") else LABEL.get(field, field)
        legend.append({"id": zid, "field": field, "label": pretty,
                       "colour": entry[1] if entry else "?", "hex": entry[2] if entry else "#999"})
        idmap[a > 128] = len(legend)             # later zones are drawn on top
        masks[zid] = a > 128
    return data, label, legend, idmap, masks


def shapes_from_masks(view, masks, legend):
    out = []
    names = {e["id"]: e["label"] for e in legend}
    for zid, m in masks.items():
        cat = "binding" if zid == "binding" else "welting" if zid == "welting" else \
            "finger" if zid in FINGER_ZONES else None
        if cat is None:
            continue
        n, lab, st, _ = cv2.connectedComponentsWithStats(morph(m, 0, 1), 8)
        parts = [i for i in range(1, n) if st[i, 4] >= 150]
        for k, i in enumerate(sorted(parts, key=lambda i: st[i, 0])):
            cs, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            c = cv2.approxPolyDP(max(cs, key=cv2.contourArea), 1.0, True)[:, 0, :]
            if len(c) >= 3:
                name = names[zid] + (f" {k + 1}" if len(parts) > 1 else "")
                out.append({"view": view, "cat": cat, "name": name, "pts": c.astype(int).tolist()})
    return out


def uri(im, fmt, **kw):
    buf = io.BytesIO()
    im.save(buf, fmt, **kw)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    if not (RENDERS / "colors.json").exists():
        raise SystemExit("run glove_builder/render_views.mjs first (builder renders per view)")
    colors = json.loads((RENDERS / "colors.json").read_text())
    palettes = json.loads((ASSETS / "glove-data.json").read_text())["palettes"]
    views, shapes = {}, []
    for view in VIEWS:
        data, label, legend, idmap, masks = view_data(view, colors, palettes)
        render = Image.open(RENDERS / f"{view}.png").convert("RGBA")
        if render.size != (data["w"], data["h"]):
            raise ValueError(f"{view}: render {render.size} is not the view canvas")
        v = {"label": label, "w": data["w"], "h": data["h"], "legend": legend,
             "render": uri(render, "WEBP", quality=90),
             "idmap": uri(Image.fromarray(idmap), "PNG", optimize=True)}
        if view == "palm":
            src = Image.open(PHOTO).convert("RGB")
            if src.size != (1255, 1145):
                raise ValueError("expected the documented 1255x1145 crop of DSC05706")
            photo = src.resize((W, H), Image.LANCZOS)
            v.update(photo=uri(photo, "JPEG", quality=88), srcScale=src.height / H,
                     source={"photo": str(PHOTO.relative_to(HERE)), "crop": list(src.size), "frame": "DSC05706"})
            shapes += [dict(s, view="palm") for s in pretrace(photo)]
        else:
            shapes += shapes_from_masks(view, masks, legend)
        views[view] = v
    data = {"start": "palm", "views": views, "cats": CATS, "shapes": shapes}
    html = (HERE / "view_tracer_template.html").read_text()
    html = html.replace("/*__DATA__*/{}", json.dumps(data, separators=(",", ":")))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html)
    print(f"wrote {OUT.relative_to(HERE.parent)} ({OUT.stat().st_size / 1e6:.2f} MB)")
    for view in VIEWS:
        count = Counter(s["cat"] for s in shapes if s["view"] == view)
        print(f"  {view:6s} " + ", ".join(f"{count[c['id']]} {c['label'].lower()}" for c in CATS))


if __name__ == "__main__":
    main()
