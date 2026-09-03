"""Assets for the palm view, from the zone map make_palm.py cuts.

The back view's builder does a great deal that only the back needs — swapping
webs, warping the SSK wordmark onto the ring finger, mounting a flag on the
index finger, punching out a knot. None of that exists on the palm, so this is
its own short script rather than another branch through that one. What it does
share is the part that matters: the same tint_base / spec_base split, so a
colour renders the same on both sides of the glove, and the same sheen scaling,
so one chosen colour does not come out as two.

    python glove_builder/customiser/build_palm.py

Writes assets/palm/*.webp and assets/palm-data.json, in the shape the engine
reads for a view: w, h, zones, bbox, assets.
"""

import json
import pathlib

import numpy as np
from PIL import Image

from build_assets import spec_base, tint_base, sheen_p95, match_sheen

HERE = pathlib.Path(__file__).parent
LAYERS = HERE.parent / "layers" / "rainbow-palm"
OUT = HERE / "assets"
HEIGHT = 1100

# Which zone of the palm view answers which question on the form. Every one of
# these is already a colour field on the back view except that two of them —
# the wingtips — are collected there without being shown.
ZONES = [
    ("palm",    "Palm colour"),
    ("web",     "Web colour"),
    ("back1",   "Back 1 — Wingtip thumb"),
    ("back9",   "Back 9 — Wingtip pinky"),
    ("welting", "Welting"),
    ("binding", "Binding"),
    ("laces",   "Laces"),
]


def main():
    src = {}
    for name, _ in ZONES + [("glove", "")]:
        f = LAYERS / f"{name}.png"
        if not f.exists():
            print(f"  missing {f.name}; run make_palm.py first")
            return
        im = Image.open(f).convert("RGBA")
        w = round(im.width * HEIGHT / im.height)
        src[name] = im.resize((w, HEIGHT), Image.LANCZOS)
    W = src["glove"].width
    print(f"palm view canvas {W}x{HEIGHT}")

    (OUT / "palm").mkdir(parents=True, exist_ok=True)

    # The neutral base, the same trick the back view uses: the whole glove
    # tinted to its own midtone and multiplied by a plain tan, so any pixel no
    # zone covers reads as leather rather than as this glove's rainbow.
    gb = np.asarray(tint_base(src["glove"])).astype(np.float32)
    gb[..., :3] *= np.array([200, 160, 106], np.float32) / 255.0
    base = Image.fromarray(gb.astype(np.uint8), "RGBA")

    assets, zones, bbox = {}, [], {}

    def put(name, img, **kw):
        p = OUT / "palm" / f"{name}.webp"
        img.save(p, "WEBP", **kw)
        assets[name] = f"assets/palm/{name}.webp"
        a = np.asarray(Image.open(p).convert("RGBA"))[..., 3]
        ys, xs = np.nonzero(a > 8)
        if len(ys):
            bbox[name] = [int(xs.min()), int(ys.min()),
                          int(xs.max()) + 1, int(ys.max()) + 1]

    put("glove", base, quality=88, method=4)
    # The back view measures one sheen scale per zone group and applies it so
    # the highlights agree; here every zone is plain leather under one light,
    # so the palm's own median is the target.
    seen = [sheen_p95(spec_base(src[n])) for n, _ in ZONES
            if spec_base(src[n]) is not None]
    seen = [t for t in seen if t]
    target = (float(np.median([t[0] for t in seen])),
              float(np.median([t[1] for t in seen]))) if seen else None
    for i, (name, label) in enumerate(ZONES, 1):
        im = src[name]
        if (np.asarray(im)[..., 3] > 90).sum() < 200:
            print(f"  {name}: empty on this view, skipped")
            continue
        put(name, tint_base(im), quality=85, method=4)
        sp = match_sheen(spec_base(im), target)
        if sp is not None:
            put(name + "_hi", sp, quality=80, method=4)
        zones.append({"id": name, "n": i, "group": "palm", "label": label})
        print(f"  {name:9s} {int((np.asarray(im)[..., 3] > 90).sum()):7d} px"
              f"  {label}")

    data = {"w": W, "h": HEIGHT, "zones": zones, "assets": assets,
            "bbox": bbox}
    (OUT / "palm-data.json").write_text(json.dumps(data, separators=(",", ":")))
    total = sum(f.stat().st_size for f in (OUT / "palm").glob("*"))
    print(f"\nwrote assets/palm/ — {len(assets)} files, {total/1e6:.2f} MB"
          f" + palm-data.json")


if __name__ == "__main__":
    main()
