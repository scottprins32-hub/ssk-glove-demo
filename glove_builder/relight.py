"""Re-cut every rainbow-back layer from the real photograph.

The whole back view was cut from a 634x750 web thumbnail, upscaled 4x by a
super-resolution model into `source/rainbow_back_4x.png`, and cut from that.
Pim's folder has the original of the same shot at 3721x4400 — 34x the pixels,
none of them invented, and the two register at 0.9987 IoU on a plain rescale,
because they are the same photograph exported at two sizes.

So nothing needs re-segmenting. Each layer keeps its alpha exactly as traced
and refined; only the colour underneath it is replaced, sampled from the real
photograph downscaled to the same 2536x3000 geometry. Every mask, every box
and every hand-traced polygon in this repo keeps its coordinates.

    python glove_builder/relight.py

Rewrites layers/rainbow-back-4x/*.png in place; --check writes a comparison.
"""

import argparse
import pathlib

import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).parent
REAL = HERE / "images/drive-2026-08/SE-1250-RAINBOW.jpg"
LAY = HERE / "layers/rainbow-back-4x"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    ref = Image.open(LAY / "glove.png")
    real = Image.open(REAL).convert("RGB").resize(ref.size, Image.LANCZOS)
    rgb = np.asarray(real)

    n = 0
    for p in sorted(LAY.glob("*.png")):
        im = Image.open(p).convert("RGBA")
        if im.size != ref.size:
            print(f"  skipped {p.name}: {im.size} is not the layer geometry")
            continue
        a = np.asarray(im)[..., 3]
        Image.fromarray(np.dstack([rgb, a]), "RGBA").save(p)
        n += 1
    print(f"re-cut {n} layers from the real photograph")

    if args.check:
        old = Image.open(HERE / "source/rainbow_back_4x.png").convert("RGB")
        box = (900, 900, 1500, 1400)
        c = Image.new("RGB", (1200, 500), (245, 243, 239))
        c.paste(old.crop(box).resize((600, 500), Image.LANCZOS), (0, 0))
        c.paste(real.crop(box).resize((600, 500), Image.LANCZOS), (600, 0))
        out = HERE / "runs/relight-check.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        c.save(out)
        print(f"wrote {out} — left upscaled, right real")


if __name__ == "__main__":
    main()
