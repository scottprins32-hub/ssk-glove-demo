"""Draw the flag patches the configurator offers, as SVG.

SSK embroiders the flag on one piece of leather on the index finger. The
patch is a plain rectangle, so a flat SVG is all the renderer needs: the
page rotates it onto the finger and multiplies the leather's own shading
back over it.

Every flag here is drawn from its official construction sheet, except
Sint Maarten — its coat of arms is far too detailed for a 3 cm patch, so
the emblem is a simplified stand-in and the real supplier artwork wins.

    python glove_builder/customiser/make_flags.py
"""

import math
import pathlib

OUT = pathlib.Path(__file__).parent / "assets" / "flags"

# 3:2 is the working size for a patch; flags with another official ratio
# are drawn on their own canvas and the page letterboxes nothing — the
# embroiderer scales to the finger either way.
W, H = 900, 600


def svg(body, w=W, h=H, title=""):
    # width/height as well as viewBox: an Image() with no intrinsic size
    # rasterises at the browser's 300x150 default before it is scaled.
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" '
            f'height="{h}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


def rect(x, y, w, h, fill):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="{fill}"/>'


def star(cx, cy, r, points=5, ratio=0.382, rot=-90.0, fill="#fff", extra=""):
    """A regular star polygon. `ratio` is the inner radius as a fraction of r."""
    pts = []
    for i in range(points * 2):
        rad = r if i % 2 == 0 else r * ratio
        a = math.radians(rot + i * 180.0 / points)
        pts.append(f"{cx + rad * math.cos(a):.2f},{cy + rad * math.sin(a):.2f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"{extra}/>'


def bands(colors, vertical=False, w=W, h=H):
    out, n = [], len(colors)
    for i, c in enumerate(colors):
        if vertical:
            out.append(rect(i * w / n, 0, w / n + 0.5, h, c))
        else:
            out.append(rect(0, i * h / n, w, h / n + 0.5, c))
    return "".join(out)


FLAGS = {}

# ---------------------------------------------------------------- Europe
FLAGS["netherlands"] = ("Nederland / Netherlands",
                        bands(["#AE1C28", "#FFFFFF", "#21468B"]))

FLAGS["belgium"] = ("België / Belgium",
                    bands(["#000000", "#FDDA24", "#EF3340"], vertical=True))

FLAGS["germany"] = ("Duitsland / Germany",
                    bands(["#000000", "#DD0000", "#FFCE00"]))

FLAGS["italy"] = ("Italië / Italy",
                  bands(["#008C45", "#F4F5F0", "#CD212A"], vertical=True))

# ------------------------------------------------------------------ Japan
# SSK is a Japanese house; 3:2 with the disc 3/5 of the height, centred.
FLAGS["japan"] = ("Japan",
                  rect(0, 0, W, H, "#FFFFFF") +
                  f'<circle cx="{W/2}" cy="{H/2}" r="{H*0.3:g}" fill="#BC002D"/>')

# -------------------------------------------------------------------- USA
# 19:10, 13 stripes, 50 stars in the 6-5-6-5-6-5-6-5-6 grid.
_uw, _uh = 950, 500
_us = [rect(0, 0, _uw, _uh, "#FFFFFF")]
for _i in range(0, 13, 2):
    _us.append(rect(0, _i * _uh / 13, _uw, _uh / 13 + 0.5, "#B31942"))
_cw, _ch = _uw * 0.4, _uh * 7 / 13
_us.append(rect(0, 0, _cw, _ch, "#0A3161"))
for _row in range(9):
    _n = 6 if _row % 2 == 0 else 5
    _y = _ch * (_row + 1) / 10
    for _col in range(_n):
        _x = _cw * (_col + 1) / 7 + (0 if _row % 2 == 0 else _cw / 14)
        _us.append(star(_x, _y, _ch * 0.0616))
FLAGS["usa"] = ("Verenigde Staten / United States", "".join(_us), _uw, _uh)

# ------------------------------------------------------- Dutch Caribbean
# Curaçao: 2:3, yellow stripe below the midline, two stars in the canton.
_cu = [rect(0, 0, W, H, "#002B7F"),
       rect(0, H * 0.611, W, H * 0.111, "#F9E814"),
       star(W * 0.139, H * 0.222, H * 0.083),
       star(W * 0.222, H * 0.389, H * 0.117)]
FLAGS["curacao"] = ("Curaçao", "".join(_cu))

# Aruba: 2:3, two yellow stripes low, a red four-pointed star hoist-high.
_ar = [rect(0, 0, W, H, "#418FDE"),
       rect(0, H * 0.583, W, H * 0.056, "#F9E814"),
       rect(0, H * 0.750, W, H * 0.056, "#F9E814"),
       star(W * 0.194, H * 0.306, H * 0.222, points=4, ratio=0.30, rot=-90,
            fill="#EF3340", extra=' stroke="#FFFFFF" stroke-width="7"')]
FLAGS["aruba"] = ("Aruba", "".join(_ar))

# Sint Maarten: 3:2, red over blue with a white hoist triangle. The arms
# are simplified — see the module docstring.
_sm = [rect(0, 0, W, H / 2, "#C8102E"),
       rect(0, H / 2, W, H / 2, "#003DA5"),
       f'<polygon points="0,0 0,{H} {W*0.42:g},{H/2:g}" fill="#FFFFFF"/>',
       f'<path d="M {W*0.075:g} {H*0.34:g} h {W*0.13:g} v {H*0.18:g} '
       f'q 0 {H*0.12:g} -{W*0.065:g} {H*0.14:g} '
       f'q -{W*0.065:g} -{H*0.02:g} -{W*0.065:g} -{H*0.14:g} z" '
       f'fill="#F9E814" stroke="#003DA5" stroke-width="9"/>']
FLAGS["sint_maarten"] = ("Sint Maarten", "".join(_sm))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, spec in FLAGS.items():
        title, body = spec[0], spec[1]
        w, h = (spec[2], spec[3]) if len(spec) > 2 else (W, H)
        p = OUT / f"{slug}.svg"
        p.write_text(svg(body, w, h, title), encoding="utf-8")
        print(f"{p.name:20s} {p.stat().st_size:5d} B  {w}x{h}")


if __name__ == "__main__":
    main()
