"""How much sheen each layer adds, and the scale that evens it out.

    python glove_builder/sheen.py --assets glove_builder/customiser/assets
    python glove_builder/sheen.py --assets ... --apply
    python glove_builder/sheen.py --assets ... --check

glove-engine.js tints a layer by multiplying it with the chosen colour and
then ADDING a separate highlight layer: a multiply can only darken, and a
white glove needs its highlights back. Those highlight layers were cut from
one photograph, so each carries that glove's own lighting. Measured on the
shipped assets, the belt's highlight adds 38 per channel where the middle
finger panel adds 5 -- so a customer who picks Navy everywhere gets a navy
glove with a GREY belt (#615C60 against the #2A304A they chose), and the web,
laces and welting all read a shade too light.

The fix is a per-layer scale on the highlight, stored in glove-data.json and
applied by the renderer, rather than new pixels: the highlight's own SHAPE is
right -- it is where that leather actually shines -- only its strength is
inherited from a photograph nobody is looking at.

Each layer is measured where a colour is read from it: the lit band, the 70th
to 90th percentile of luminance, the same band glove_builder/colour_evidence.py
reads a leather with. TARGET is where the big leather panels already sit, so
the glove keeps the look it has wherever it was already right. Only
reductions: a layer with too little sheen is left alone rather than invented.
"""

from __future__ import annotations

import argparse
import json
import pathlib

import numpy as np
from PIL import Image

TARGET = 8.0        # per-channel highlight the leather panels already add
NEUTRAL = 128.0     # tint the measurement uses; nothing clips at mid grey
FLOOR = 0.995       # scales above this are not worth storing
LUM = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def lit_offset(base: np.ndarray, hi: np.ndarray, alpha: float = 1.0) -> float:
    """Per-channel lift the highlight gives where a colour is read.

    Mirrors the renderer: multiply the layer by the tint, add alpha * the
    highlight, then read the lit band of the result.
    """
    tinted = base * (NEUTRAL / 255.0)
    out = np.clip(tinted + hi * alpha, 0, 255)
    lums = out @ LUM
    lo, hi_p = np.percentile(lums, [70, 90])
    band = (lums >= lo) & (lums <= hi_p)
    if band.sum() < 20:
        band = np.ones(len(out), bool)
    read = np.median(out[band], axis=0)
    flat = np.median(tinted[band], axis=0)
    return float(np.mean(read - flat))


def scale(base: np.ndarray, hi: np.ndarray, target: float = TARGET) -> float:
    """The alpha that brings this layer's sheen down to target."""
    off = lit_offset(base, hi)
    if off <= target:
        return 1.0
    k = target / off
    for _ in range(4):                  # the band moves as the sheen drops
        got = lit_offset(base, hi, k)
        if abs(got - target) < 0.15 or got <= 0:
            break
        k = min(1.0, k * target / got)
    return round(k, 3)


def layers(assets: pathlib.Path):
    for hi_path in sorted(assets.glob("*_hi.webp")):
        zone = hi_path.name[:-len("_hi.webp")]
        base_path = assets / f"{zone}.webp"
        if base_path.exists():
            yield zone, base_path, hi_path


def read_pair(base_path: pathlib.Path, hi_path: pathlib.Path):
    b = np.asarray(Image.open(base_path).convert("RGBA")).astype(np.float32)
    h = np.asarray(Image.open(hi_path).convert("RGBA")).astype(np.float32)
    if b.shape[:2] != h.shape[:2]:
        return None, None
    m = b[..., 3] > 200
    if m.sum() < 500:
        return None, None
    return b[..., :3][m], h[..., :3][m]


def scales(assets: pathlib.Path, target: float = TARGET) -> dict[str, float]:
    """{layer: alpha} for every layer that shines too hard."""
    out = {}
    for zone, base_path, hi_path in layers(assets):
        base, hi = read_pair(base_path, hi_path)
        if base is None:
            continue
        k = scale(base, hi, target)
        if k < FLOOR:
            out[zone] = k
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", required=True, type=pathlib.Path)
    ap.add_argument("--target", type=float, default=TARGET)
    ap.add_argument("--apply", action="store_true",
                    help="write the scales into glove-data.json")
    ap.add_argument("--check", action="store_true",
                    help="exit non-zero if glove-data.json disagrees")
    args = ap.parse_args()

    print("layer                sheen   scaled   alpha")
    print("-" * 46)
    got = {}
    for zone, base_path, hi_path in layers(args.assets):
        base, hi = read_pair(base_path, hi_path)
        if base is None:
            print(f"{zone:20s}  (skipped: no usable layer)")
            continue
        before = lit_offset(base, hi)
        k = scale(base, hi, args.target)
        after = lit_offset(base, hi, k)
        if k < FLOOR:
            got[zone] = k
        print(f"{zone:20s} {before:5.1f}   {after:5.1f}   {k:5.3f}")

    data_path = args.assets / "glove-data.json"
    data = json.loads(data_path.read_text())
    if args.check:
        have = data.get("sheen", {})
        if have != got:
            missing = {k: v for k, v in got.items() if have.get(k) != v}
            extra = {k: v for k, v in have.items() if k not in got}
            print(f"\nglove-data.json disagrees: {missing or ''} {extra or ''}")
            return 1
        print("\nglove-data.json matches the assets")
        return 0

    if args.apply:
        data["sheen"] = got
        data_path.write_text(json.dumps(data, separators=(",", ":")) + "\n",
                             encoding="utf-8")
        print(f"\nwrote sheen scales for {len(got)} layer(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
