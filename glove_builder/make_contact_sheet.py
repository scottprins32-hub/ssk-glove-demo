"""Contact sheet of final zone layers with confidence labels.

Usage:
    python glove_builder/make_contact_sheet.py \
        --final glove_builder/layers/rainbow-back \
        --sam-report out/rainbow-back/report_zones.json \
        --zones glove_builder/zones_rainbow_back.json
"""

import argparse
import json
import math
import pathlib

import numpy as np
from PIL import Image, ImageDraw

LABELS = {
    "back1": "Back 1 - thumb wingtip", "back2": "Back 2 - rest of thumb",
    "back3": "Back 3 - index 1st part", "back4": "Back 4 - index 2nd part",
    "back5": "Back 5 - middle 1st part", "back6": "Back 6 - middle 2nd part",
    "back7": "Back 7 - ring finger", "back8": "Back 8 - rest of pinky",
    "back78": "Back 7+8 - ring+pinky piece",
    "back9": "Back 9 - pinky wingtip", "web": "Web", "belt": "Belt",
    "lining": "Lining", "binding": "Binding", "bullet_logo": "Bullet logo",
    "embroidery": "Embroidery (SSK)", "welting": "Welting", "laces": "Laces",
    "thumb_loops": "Thumb loops", "pinky_loops": "Pinky loops",
    "stitching": "Stitching", "glove": "Full glove",
}
ORDER = ["glove", "back1", "back2", "back3", "back4", "back5", "back6",
         "back78", "back9", "web", "belt", "lining", "binding",
         "welting", "laces", "thumb_loops", "pinky_loops", "embroidery",
         "bullet_logo", "stitching"]
COMBOS = {"back3": "back34", "back4": "back34", "back5": "back56",
          "back6": "back56", "back78": "back7"}


def confidence(name, zone_rep, sam_rep, zones_cfg):
    px = zone_rep.get(name, {}).get("pixels", 0)
    if name == "glove":
        return 0.94, "SAM3"
    if "hsv" in zones_cfg.get(name, zones_cfg.get(COMBOS.get(name, ""), {})):
        c = 0.93 if px > 8000 else 0.85 if px > 3000 else 0.7 if px > 1000 else 0.35
        return c, "color+box"
    scores = (sam_rep.get(name, {}).get("scores")
              or sam_rep.get(COMBOS.get(name, ""), {}).get("scores"))
    return (max(scores) if scores else 0.5), "SAM3"


def get_font(size):
    from PIL import ImageFont
    try:
        import matplotlib
        f = (pathlib.Path(matplotlib.get_data_path()) / "fonts" / "ttf"
             / "DejaVuSans-Bold.ttf")
        return ImageFont.truetype(str(f), size)
    except Exception:
        try:
            return ImageFont.load_default(size=size)
        except TypeError:
            return ImageFont.load_default()


def write_numbered(final, names, out_dir):
    """Copy each layer with a number badge bottom-right for rating."""
    out_dir = pathlib.Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(names, 1):
        im = Image.open(final / f"{name}.png").convert("RGBA")
        # composite on light checkerboard so transparent layers are visible
        q = np.full((im.height, im.width, 3), 235, np.uint8)
        yy, xx = np.mgrid[0:im.height, 0:im.width]
        q[((yy // 24) + (xx // 24)) % 2 == 0] = 215
        bg = Image.fromarray(q).convert("RGBA")
        bg.alpha_composite(im)
        d = ImageDraw.Draw(bg)
        r = int(im.width * 0.055)
        cx, cy = im.width - r - 12, im.height - r - 12
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(20, 20, 20, 230),
                  outline=(255, 255, 255, 255), width=3)
        font = get_font(int(r * 1.1))
        d.text((cx, cy), str(i), font=font, fill=(255, 255, 255, 255),
               anchor="mm")
        bg.convert("RGB").save(out_dir / f"{i:02d}_{name}.jpg", quality=92)
    print(f"wrote {len(names)} numbered layers to {out_dir}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--final", required=True)
    ap.add_argument("--sam-report", required=True)
    ap.add_argument("--zones", required=True)
    ap.add_argument("--numbered", default=None,
                    help="Also write numbered rating copies to this dir")
    args = ap.parse_args()

    final = pathlib.Path(args.final)
    zone_rep = json.load(open(final / "report.json"))
    sam_rep = json.load(open(args.sam_report))
    zones_cfg = {k: v for k, v in json.load(open(args.zones)).items()
                 if not k.startswith("_")}

    CELL_W, CELL_H, PAD = 300, 300, 26
    cols = 4
    names = [n for n in ORDER if (final / f"{n}.png").exists()]
    rows = math.ceil(len(names) / cols)
    sheet = Image.new("RGB", (cols * CELL_W, rows * (CELL_H + PAD)), (245,) * 3)
    d = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        im = Image.open(final / f"{name}.png")
        bg = Image.new("RGB", im.size, (235,) * 3)
        q = np.array(bg)
        yy, xx = np.mgrid[0:im.height, 0:im.width]
        q[((yy // 24) + (xx // 24)) % 2 == 0] = (215, 215, 215)
        bg = Image.fromarray(q)
        bg.paste(im, (0, 0), im)
        bg.thumbnail((CELL_W - 8, CELL_H - 8))
        x, y = (i % cols) * CELL_W, (i // cols) * (CELL_H + PAD)
        sheet.paste(bg, (x + (CELL_W - bg.width) // 2,
                         y + (CELL_H - bg.height) // 2))
        conf, method = confidence(name, zone_rep, sam_rep, zones_cfg)
        sm = " smoothed" if zone_rep.get(name, {}).get("smoothed") else ""
        d.text((x + 8, y + CELL_H + 4),
               f"{LABELS[name]}  |  conf {conf:.2f} ({method}){sm}",
               fill=(20, 20, 20))
    out = final / "contact_sheet.jpg"
    sheet.save(out, quality=90)
    print("saved", out)
    if args.numbered:
        write_numbered(final, names, args.numbered)


if __name__ == "__main__":
    main()
