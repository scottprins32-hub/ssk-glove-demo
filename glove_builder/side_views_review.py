"""Review sheets for the thumb-side and pinky-side views, rendered by the page.

    python glove_builder/side_views_review.py [--out DIR]

Serves glove_builder/, opens side_views/index.html and writes, per colourway,
<name>.jpg: thumb RHT | thumb LHT | pinky RHT | pinky LHT at the canvas's own
size, and <name>_2x.jpg with each view's busiest part at 200%. Plus
source_vs_contrast.jpg: each source frame beside a render where every order
field has a different colour, which is where a zone that spills over a seam
shows.
"""

import argparse
import asyncio
import base64
import functools
import http.server
import io
import json
import os
import pathlib
import threading

from PIL import Image

HERE = pathlib.Path(__file__).parent
CHROMIUM = os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium")
PAGE = (244, 243, 239)

ALL = ["web", "back1", "back2", "back3", "back4", "back5", "back6", "back7",
       "back8", "back9", "palm", "belt"]


def order(leather, lace, stitching=None, emb="10"):
    c = {f: leather for f in ALL}
    c.update(binding=lace, welting=lace, laces=lace,
             stitching=stitching or lace, ring_emb=emb)
    return c


WAYS = {
    "white_black": order("10", "90", "90", "90"),
    "dark_light": order("90", "10", "10", "10"),
    "natural_tan": order("44", "44", "45", "10"),   # 44 is not a thread colour
    "japan_starter": {**order("71", "45", "45", "39"), "back1": "32",
                      "back2": "32", "belt": "32"},
}
CONTRAST = {"web": "70", "back1": "20", "back2": "35", "back3": "60",
            "back4": "90", "back5": "45", "back6": "10", "back7": "43",
            "back8": "50", "back9": "25", "palm": "12", "belt": "48",
            "binding": "10", "welting": "90", "laces": "45", "stitching": "20",
            "ring_emb": "10"}
# (x0, y0, x1, y1) on each canvas, for 200%
ZOOM = {"thumb": (380, 480, 822, 920), "pinky": (180, 150, 620, 590)}


def serve(root):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(root)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def shoot(port, jobs):
    from playwright.async_api import async_playwright
    out = {}
    async with async_playwright() as p:
        try:
            b = await p.chromium.launch(args=["--no-sandbox"])
        except Exception:
            b = await p.chromium.launch(args=["--no-sandbox"],
                                        executable_path=CHROMIUM)
        pg = await b.new_page(viewport={"width": 1300, "height": 1000})
        await pg.goto(f"http://127.0.0.1:{port}/side_views/index.html")
        await pg.wait_for_function("() => window.__side")
        for key, (view, hand, colors, web) in jobs.items():
            await pg.evaluate("a => window.__side.set(a)",
                              {"view": view, "hand": hand, "colors": colors,
                               "webType": web})
            u = await pg.evaluate(
                "() => document.getElementById('glove').toDataURL('image/png')")
            out[key] = Image.open(io.BytesIO(base64.b64decode(u.split(",", 1)[1]))).convert("RGBA")
        await b.close()
    return out


def mirror_box(box, w):
    x0, y0, x1, y1 = box
    return (w - x1, y0, w - x0, y1)


def on(im):
    bg = Image.new("RGBA", im.size, PAGE + (255,))
    bg.alpha_composite(im)
    return bg.convert("RGB")


def row(tiles, height=None):
    if height:
        tiles = [t.resize((round(t.width * height / t.height), height), Image.LANCZOS)
                 for t in tiles]
    w = sum(t.width for t in tiles) + 12 * (len(tiles) - 1)
    h = max(t.height for t in tiles)
    s = Image.new("RGB", (w, h), PAGE)
    x = 0
    for t in tiles:
        s.paste(t, (x, 0))
        x += t.width + 12
    return s


# The embroidered text, rendered by the configurator itself (the standalone
# preview has no order form). Cases: text, font, main and outline thread,
# and the leather under it.
EMB_CASES = [
    ("script_yellow_on_navy", "Scott Prins", "Script", "45", "10", "70"),
    ("block_outline_white_on_navy", "Scott Prins", "Block with Outline", "10", "20", "70"),
    ("brush_shadow_navy_on_tan", "Modern Pitching", "Brush with Shadow", "70", "90", "44"),
    ("script_white_on_black", "Modern Pitching", "Script", "10", "10", "90"),
]


async def shoot_app(port, cases):
    from playwright.async_api import async_playwright
    out = {}
    async with async_playwright() as p:
        try:
            b = await p.chromium.launch(args=["--no-sandbox"])
        except Exception:
            b = await p.chromium.launch(args=["--no-sandbox"],
                                        executable_path=CHROMIUM)
        pg = await b.new_page(viewport={"width": 1440, "height": 1000})
        await pg.goto(f"http://127.0.0.1:{port}/index.html")
        await pg.wait_for_function("() => document.querySelectorAll('#stageview button').length > 0")
        for key, (view, hand, text, font, main, outline, leather) in cases.items():
            st = await pg.evaluate("() => JSON.parse(localStorage.getItem('ssk-glove-v1') || '{}')")
            st.update({"view": view, "hand": hand, "webType": "H-Web", "size": '12"',
                       "lang": "en", "step": 5, "thumbText": text, "pinkyText": text,
                       "thumbFont": font, "thumbMain": main, "thumbOutline": outline,
                       "colors": order(leather, "10", "10", "10")})
            await pg.evaluate("([k, v]) => localStorage.setItem(k, v)",
                              ["ssk-glove-v1", json.dumps(st)])
            await pg.reload()
            await pg.wait_for_function(
                "() => document.fonts.check('400 40px \"Yellowtail\"')")
            await pg.wait_for_timeout(600)
            u = await pg.evaluate(
                "() => document.getElementById('glove').toDataURL('image/png')")
            out[key] = Image.open(io.BytesIO(base64.b64decode(u.split(",", 1)[1]))).convert("RGBA")
        await b.close()
    return out


# where each text sits, for the 200% crops (right hand; mirrored for left)
EMB_ZOOM = {"thumb": (330, 330, 780, 860), "pinky": (30, 320, 420, 980)}


def embroidery_sheets(out):
    cases = {}
    for name, text, font, main, outline, leather in EMB_CASES:
        for view in ("thumb", "pinky"):
            for hand in ("RHT", "LHT"):
                cases[(name, view, hand)] = (view, hand, text, font, main, outline, leather)
    srv = serve(HERE / "customiser")
    try:
        shots = asyncio.run(shoot_app(srv.server_address[1], cases))
    finally:
        srv.shutdown()
    for name, *_ in EMB_CASES:
        tiles = []
        for view in ("thumb", "pinky"):
            for hand in ("RHT", "LHT"):
                im = shots[(name, view, hand)]
                box = EMB_ZOOM[view] if hand == "RHT" else mirror_box(EMB_ZOOM[view], im.width)
                t = on(im).crop(box)
                tiles.append(t.resize((t.width * 2, t.height * 2), Image.LANCZOS))
        row(tiles, height=1000).save(out / f"embroidery_{name}.jpg", quality=88)
    print(f"embroidery sheets in {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=pathlib.Path, default=HERE / "runs/side-views/review")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    jobs = {}
    for name, colors in list(WAYS.items()) + [("contrast", CONTRAST)]:
        for view in ("thumb", "pinky"):
            for hand in ("RHT", "LHT"):
                jobs[(name, view, hand)] = (view, hand, colors, "H-Web")
    jobs[("unphotographed_web", "thumb", "RHT")] = ("thumb", "RHT", WAYS["japan_starter"],
                                                    "Modified Trapeze-Web")
    srv = serve(HERE)
    try:
        shots = asyncio.run(shoot(srv.server_address[1], jobs))
    finally:
        srv.shutdown()
    for name in list(WAYS) + ["contrast"]:
        tiles = [on(shots[(name, v, h)]) for v in ("thumb", "pinky") for h in ("RHT", "LHT")]
        row(tiles).save(args.out / f"{name}.jpg", quality=88)
        zoom = []
        for v in ("thumb", "pinky"):
            x0, y0, x1, y1 = ZOOM[v]
            t = on(shots[(name, v, "RHT")]).crop((x0, y0, x1, y1))
            zoom.append(t.resize((t.width * 2, t.height * 2), Image.LANCZOS))
        row(zoom).save(args.out / f"{name}_2x.jpg", quality=85)
    on(shots[("unphotographed_web", "thumb", "RHT")]).save(
        args.out / "thumb_unphotographed_web.jpg", quality=88)
    # each source frame beside the contrast render, same height
    src = []
    for v in ("thumb", "pinky"):
        photo = Image.open(HERE / f"images/store-2026-09/rainbow-{v}.png").convert("RGB")
        src += [photo, on(shots[("contrast", v, "RHT")])]
    row(src, height=1100).save(args.out / "source_vs_contrast.jpg", quality=85)
    print(f"review sheets in {args.out}")
    embroidery_sheets(args.out)


if __name__ == "__main__":
    main()
