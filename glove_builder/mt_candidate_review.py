"""Before/after sheets for the Modified Trapeze candidate, rendered by the
configurator itself.

Copies glove_builder/customiser to a temporary folder, installs the
candidate there (make_mt_candidate.py --install), serves both the untouched
customiser ("before") and the copy ("after"), and renders every colourway in
both hands through the page's own engine. Nothing in customiser/ is changed.

    python glove_builder/make_mt_candidate.py
    python glove_builder/mt_candidate_review.py [--out DIR]

Writes, per colourway, <name>_1x.jpg (before | after, right hand then left,
at the canvas's own size) and <name>_2x.jpg (the web at 200%), each on the
page's light background, plus <name>_1x_black.jpg on black, which is where a
pale fringe or a dark rim round a lace shows.
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
import shutil
import tempfile
import threading

from PIL import Image

HERE = pathlib.Path(__file__).parent
WEB = "Modified Trapeze-Web"
# (name, leather, lace): the three the review asked for, and the colours
# the source glove was actually photographed in
WAYS = [("white_black", "10", "90"), ("dark_light", "90", "10"),
        ("natural_tan", "44", "44"), ("as_shot_black_yellowtan", "90", "45")]
LEATHER = ["web", "back2", "back3", "back4", "back5", "back6", "back7",
           "belt", "lining", "thumb_loops", "pinky_loops", "palm"]
PAGE = (244, 243, 239)
CHROMIUM = os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium")
CROP_R = (380, 0, 929, 820)          # the web side of a right-hand glove
WEB_R = (540, 0, 880, 760)           # the web itself, for 200%


def state(shell, lace, hand):
    c = {f: shell for f in LEATHER}
    c.update(binding=lace, welting=lace, laces=lace, stitching="10",
             ring_emb="10")
    return {"lang": "en", "part": "web", "bullet": 7, "colors": c,
            "hand": hand, "size": '12"', "pad": "None", "webType": WEB,
            "thumbText": "", "thumbFont": None, "thumbMain": None,
            "thumbOutline": None, "thumbNumber": "", "circle": None,
            "numberColor": None, "flag": None, "name": "", "phone": ""}


def serve(root):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(root))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def render(ports):
    from playwright.async_api import async_playwright
    out = {}
    async with async_playwright() as p:
        try:
            b = await p.chromium.launch(args=["--no-sandbox"])
        except Exception:
            # a pinned Playwright whose own browser is not installed: use the
            # system Chromium instead of downloading one
            b = await p.chromium.launch(args=["--no-sandbox"],
                                        executable_path=CHROMIUM)
        pg = await b.new_page(viewport={"width": 1500, "height": 1000})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for side, port in ports.items():
            await pg.goto(f"http://127.0.0.1:{port}/index.html")
            await pg.wait_for_timeout(1500)
            for name, shell, lace in WAYS:
                for hand in ("RHT", "LHT"):
                    await pg.evaluate("([k,v])=>localStorage.setItem(k,v)",
                                      ["ssk-glove-v1",
                                       json.dumps(state(shell, lace, hand))])
                    await pg.reload()
                    await pg.wait_for_timeout(2200)
                    u = await pg.evaluate(
                        "()=>document.querySelector('#glove').toDataURL('image/png')")
                    out[(side, name, hand)] = Image.open(io.BytesIO(
                        base64.b64decode(u.split(",", 1)[1]))).convert("RGBA")
        await b.close()
    if errs:
        raise SystemExit(f"page errors: {errs[:3]}")
    return out


def on(bg, im):
    base = Image.new("RGBA", im.size, bg + (255,))
    base.alpha_composite(im)
    return base.convert("RGB")


def mirror_box(box, w=929):
    x0, y0, x1, y1 = box
    return (w - x1, y0, w - x0, y1)


def sheets(shots, out):
    out.mkdir(parents=True, exist_ok=True)
    for name, _, _ in WAYS:
        for bg, tag in ((PAGE, ""), ((0, 0, 0), "_black")):
            tiles = []
            for hand in ("RHT", "LHT"):
                box = CROP_R if hand == "RHT" else mirror_box(CROP_R)
                for side in ("before", "after"):
                    tiles.append(on(bg, shots[(side, name, hand)]).crop(box))
            w, h = tiles[0].size
            sheet = Image.new("RGB", (w * 4, h), bg)
            for i, t in enumerate(tiles):
                sheet.paste(t, (i * w, 0))
            sheet.save(out / f"{name}_1x{tag}.jpg", quality=88)
        tiles = []
        for hand in ("RHT", "LHT"):
            box = WEB_R if hand == "RHT" else mirror_box(WEB_R)
            for side in ("before", "after"):
                t = on(PAGE, shots[(side, name, hand)]).crop(box)
                tiles.append(t.resize((t.width * 2, t.height * 2),
                                      Image.LANCZOS))
        w, h = tiles[0].size
        sheet = Image.new("RGB", (w * 2, h * 2), PAGE)
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % 2) * w, (i // 2) * h))
        sheet.save(out / f"{name}_2x.jpg", quality=85)
    print(f"sheets in {out}: before | after, right hand then left")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=pathlib.Path,
                    default=HERE / "runs/mt-candidate/review")
    args = ap.parse_args()
    import make_mt_candidate as cand
    with tempfile.TemporaryDirectory() as tmp:
        after = pathlib.Path(tmp) / "customiser"
        shutil.copytree(HERE / "customiser", after,
                        ignore=shutil.ignore_patterns("dist"))
        cand.install(after / "assets")
        a, b = serve(HERE / "customiser"), serve(after)
        try:
            shots = asyncio.run(render({"before": a.server_address[1],
                                        "after": b.server_address[1]}))
        finally:
            a.shutdown()
            b.shutdown()
    sheets(shots, args.out)


if __name__ == "__main__":
    main()
