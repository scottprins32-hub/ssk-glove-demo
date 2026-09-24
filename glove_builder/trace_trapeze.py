"""Trace the Trapeze and Modified Trapeze webs, pixel by pixel, off the store
shoot's own camera frames.

Both are lattices of lace. An outline and one colour rule, which is all the
closed webs from the same shoot needed, cannot tell a window between two laces
from a lace in shadow, and every window a lattice has is part of what the web
looks like. So each pixel is classified on its own, in the camera's original
JPEG at twice the resolution make_web.py works at, and only then brought down
to the committed photograph's grid:

- lace is the lace's own colour: purple on the Trapeze (a* well above b*),
  gold on the Modified Trapeze (warm, measured as (R-B)/(R+G+B) so a lace in
  shadow counts as much as one in light)
- window is the backdrop showing through: neutral or cool, and bright
- leather is everything else inside the web: warm cream on one glove, black on
  the other

Two things are drawn by hand, both answering which part of the glove a pixel
belongs to, which colour cannot. `roi` is the boundary between the web and
the panels it is sewn to: the index finger on one side, the thumb and the
heel of the web on the other. `lace_only` outlines the web's strap where it
runs out of the web over the next panel; inside it only lace is taken. (The
strip of index finger carried with the web is outlined in make_web.py, as
`finger_poly`, like every other web's.) Nothing inside any of them is drawn:
every lace, every window and every piece of leather is what the camera
recorded, and a window is only a window if it is enclosed by the glove.

The originals live in Scott's Drive folder and stay there, read-only. Each is
checked against its SHA-256 and against the committed photograph (the same
pixels cropped at `crop`, halved, then relit by flatten_light.py) before
anything is cut. The masks are committed, so make_web.py re-runs without the
Drive.

    python glove_builder/trace_trapeze.py --web trapeze [--shoot <folder>]
    python glove_builder/make_web.py --web trapeze
    python glove_builder/customiser/build_assets.py \\
        --layers glove_builder/layers/rainbow-back-4x --out /tmp/assets
    python glove_builder/trace_trapeze.py --web trapeze --install /tmp/assets

The first writes runs/store-<slug>/masks/web_{leather,lace,window,roi,
extent,strap}.png and lace_anywhere.png, trace.json, and trace_check.jpg —
the overlay to look at before believing any of it. The last copies only this
web's layers into customiser/assets and adds only their entries to
glove-data.json (see install()).
"""

import argparse
import datetime
import hashlib
import json
import pathlib

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
SHOOT = pathlib.Path.home() / ("Library/CloudStorage/GoogleDrive-scottprins32@gmail.com/"
                               "My Drive/SSK Europe/Pictures of gloves/SSK fotoshoot")

# Scott named the gloves on the stand in shooting order, by voice, on 23
# September 2026: 1 Trapeze, 2 Spiral I, 3 Standard I, 4 Closed Diamond Net,
# 5 Modified Trapeze, 6 and 7 the left-handed glove, 8 SMLEE (commit 3d71e50).
# The stand frames run DSC05716 to DSC05723 in that order, and the two here
# are the only frames of either glove that show its web: DSC05728-05731 are
# close-ups of the Trapeze glove's heel and palm, and no other frame shows the
# black/gold glove at all.
SOURCES = {
    "trapeze": {
        "glove": "1 of 8 on the stand: white leather, purple lacing",
        "frame": "DSC05716.jpeg",
        "sha256": "3b9c799354aff843f4c49a15a199725ceb6ca882235fb6a2075bb8f198aa150e",
        "raw": "DSC05716.ARW",
        "raw_sha256": "9f14a294ecea04d97998dd66aef8800e8a5a478687d0a4020301b6fff82c8b65",
        "photo": "images/store-2026-09/trapeze.jpg",
        "rule": "purple",
        # The web, from where its top rim leaves the index finger's tip, round
        # the outer rim to where the lacing turns down the thumb, and back up
        # along the edge of the index finger. The lace tail hanging off the top
        # of the finger and the one off the rim below the post are left out:
        # they hang in air on this glove and on the calibration glove alike.
        "roi": [(1060, 170), (1085, 160), (1140, 178), (1195, 222),
                (1240, 272), (1276, 328), (1306, 388), (1326, 448),
                (1341, 508), (1353, 568), (1359, 628), (1356, 688),
                (1351, 748), (1346, 808), (1336, 868), (1323, 918),
                (1308, 958), (1304, 1010), (1298, 1060), (1285, 1120),
                (1270, 1180), (1255, 1225), (1200, 1222), (1150, 1212),
                (1100, 1200), (1062, 1178), (1040, 1125), (1025, 1065),
                (1005, 1000), (992, 940), (996, 880), (1015, 840),
                (1035, 790), (1045, 745), (1053, 700), (1059, 650),
                (1064, 600), (1076, 550), (1084, 500), (1093, 450),
                (1105, 400), (1107, 350), (1110, 300), (1112, 260),
                (1106, 230), (1085, 205), (1068, 185)],
        # The web's own strap: the flat lace that leaves the knot at the heel
        # of the web and runs up across the next panel to its cut end at
        # (895, 890), where it goes through the welt. It lies over the glove
        # rather than in the opening, exactly where the calibration glove's
        # knot strap lies, so it is taken as lace only — whatever leather is
        # inside this outline belongs to the panel under the strap.
        "lace_only": [[(886, 880), (906, 864), (1012, 922), (1015, 1015),
                       (990, 1008), (884, 934)]],
    },
    "modified-trapeze": {
        "glove": "5 of 8 on the stand: black leather, gold lacing",
        "frame": "DSC05720.jpeg",
        "sha256": "7585cf7090b52ee174f2310aebf889770c1f5acae59d637250e83b152ecb9e15",
        "raw": "DSC05720.ARW",
        "raw_sha256": "b4ae9967c20c8894f4e9c8d3108dd0018bc7892c001cc76a1edd82da9fb40314",
        "photo": "images/store-2026-09/modified-trapeze.jpg",
        "rule": "gold",
        # the relit brightness a gold lace is lit to and the gold reflected
        # on the post is not: 45 took the reflection patches, 60 follows the
        # hooks' own edges (compared side by side on the lifted frame)
        "lit_floor": 60,
        # Out to the rim's loops, which stand 15-20 px proud of its leather.
        # The rim lace's end pointing off to (1500, 720) and the tail hanging
        # from (1460, 770) to (1460, 1020) are in air, and stay out.
        "roi": [(1140, 185), (1165, 158), (1215, 188), (1252, 212),
                (1300, 252), (1346, 298), (1377, 343), (1402, 390),
                (1426, 440), (1446, 490), (1459, 540), (1467, 590),
                (1467, 640), (1453, 690), (1449, 740), (1441, 790),
                (1429, 840), (1416, 890), (1403, 940), (1393, 990),
                (1383, 1040), (1370, 1080), (1340, 1098), (1290, 1102),
                (1240, 1085),
                (1200, 1040), (1170, 980), (1152, 920), (1146, 860),
                (1140, 800), (1140, 740), (1142, 680), (1143, 620),
                (1144, 560), (1144, 500), (1143, 440), (1142, 380),
                (1141, 320), (1140, 260)],
        # its strap, from the heel of the web up to the cut end at (1060, 815)
        "lace_only": [[(1042, 824), (1082, 798), (1196, 960), (1252, 1040),
                       (1250, 1092), (1196, 1062)]],
    },
}

# Where the committed photographs were cut from their frames: the camera
# JPEG's pixels from (1650, 150) to (5100, 3860), halved. Found by template
# matching the photographs as first committed (3d71e50, before relighting)
# against the frames at half size — normalised correlation 0.999 on both.
CROP = (1650, 150, 5100, 3860)

LACE, LEATHER, WINDOW = 0, 1, 2


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def lighting(full, photo):
    """How much flatten_light.py brightened each pixel of the frame.

    The committed photograph is these pixels halved and relit; the ratio of
    the two, smoothed well past a lace's width, is the relight's gain. It
    lets a brightness threshold mean the same thing on the lit left of the
    glove and on its shaded right, which the raw frame does not.
    """
    ph, pw = photo.shape[:2]
    lum = lambda a: a.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    half = cv2.resize(full, (pw, ph), interpolation=cv2.INTER_AREA)
    g = (cv2.GaussianBlur(lum(photo), (0, 0), 8)
         / np.maximum(cv2.GaussianBlur(lum(half), (0, 0), 8), 2.0))
    return cv2.resize(np.clip(g, 0.5, 6.0), (full.shape[1], full.shape[0]),
                      interpolation=cv2.INTER_CUBIC)


def classify(rgb, rule, gain=None, lit_floor=None, open_reach=24):
    """Lace, leather or window for every pixel of the full-resolution crop."""
    s = cv2.GaussianBlur(rgb.astype(np.float32), (0, 0), 1.2 if rule == "purple" else 1.6)
    lab = cv2.cvtColor(np.clip(s, 0, 255).astype(np.uint8),
                       cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[..., 0] * 100 / 255
    a, b = lab[..., 1] - 128, lab[..., 2] - 128
    if rule == "purple":
        # Purple lace sits at a* 3-20, b* -12-9 on this frame; the cream
        # leather at b* 7-11 with a* near 1; the backdrop neutral above the
        # table line and slightly blue below it (b* to -7), which is why the
        # rule asks for a* as well as a* - b*. Lace deep in the lattice's
        # shadow is nearly black; so is the crease where the web's leather
        # folds under the finger, but that stays warm and the lace does not.
        lace = ((a >= 4) & (a - b >= 7)) | ((L < 14) & (a - b >= 1))
        window = ~lace & (b < 3.0) & (L > 40)
    else:
        # Gold lace in shadow keeps its hue and loses its brightness, so its
        # warmth is measured as a proportion. Black leather in the same shadow
        # is neutral to cool. The backdrop is neutral grey at L* 64-71.
        R, G, B = s[..., 0], s[..., 1], s[..., 2]
        warm = (R - B) / (R + G + B + 6)
        lace = (warm >= 0.22) & ((R - B) >= 8)
        window = ~lace & (L > 42) & (np.abs(b) < 9) & (np.abs(a) < 6)
        if lit_floor is not None and gain is not None:
            # Warmth alone was wrong over the post. Between the right
            # ladder's hooks the black post lies in the laces' shadow and
            # takes their gold as reflected light: warm, dark, and as warm
            # in proportion as a lace in shadow, so it came out as broad
            # scalloped patches of "lace" on the post (Astra, reviewing the
            # overlay against the frame). Hue, value and G/R of the two
            # overlap in the raw frame — measured, not assumed — so colour
            # cannot part them there; brightness under even light can. Lit
            # gold lace stays above `lit_floor` on the relit scale, the
            # reflection on leather stays below it, and the patch between
            # is what the frame itself cannot decide, left as the leather it
            # lies on. Where the ground behind a lace is open backdrop there
            # is no leather to reflect anything and warmth is enough, so
            # within `open_reach` px of backdrop the rule is unchanged.
            V = np.maximum(np.maximum(R, G), B) * gain
            near_open = ndimage.distance_transform_edt(~window) <= open_reach
            lace &= near_open | (V >= lit_floor)
            window = ~lace & window
    cls = np.full(L.shape, LEATHER, np.uint8)
    cls[lace] = LACE
    cls[window] = WINDOW
    return cls


def tidy(cls, rule):
    """Take out what is one pixel's noise rather than a piece of the web.

    Three kinds of speck, each handed to whichever real piece lies nearest:
    - lace fragments too small to be a lace (sensor noise that lands in the
      lace's colour range),
    - window specks too small to be daylight: on the Modified Trapeze that is
      the white stitching along the black post, on both it is the neutral
      blend at the edge of a lace,
    - leather thinner than leather is: the one-to-two pixel blend between a
      dark lace and a bright window reads as neither, and so as leather — a
      fringe down the lit side of every lace.
    """
    lace, win, lea = cls == LACE, cls == WINDOW, cls == LEATHER
    drop = np.zeros_like(lace)

    def small(m, n):
        lbl, k = ndimage.label(m)
        if not k:
            return np.zeros_like(m)
        sizes = ndimage.sum(m, lbl, range(1, k + 1))
        return np.isin(lbl, np.nonzero(sizes < n)[0] + 1)

    drop |= small(lace, 220)
    w_open = ndimage.binary_opening(win, np.ones((5, 5), bool))
    drop |= win & ~w_open
    drop |= small(w_open, 160)
    drop |= lea & ~ndimage.binary_opening(lea, np.ones((5, 5), bool))
    # The same blend is wider where a lace's edge is out of focus, up to
    # four pixels here, so anything that thin lying against a window goes
    # too. Leather that thin against a lace alone stays: that is the edge of
    # the post, and it is real.
    near_win = ndimage.binary_dilation(win, np.ones((3, 3), bool), iterations=4)
    drop |= lea & ~ndimage.binary_opening(lea, np.ones((9, 9), bool)) & near_win
    keep = ~drop
    _, (iy, ix) = ndimage.distance_transform_edt(~keep, return_indices=True)
    out = cls[iy, ix]
    return out, int(drop.sum())


def smooth(cls, sigma=1.5):
    """Each pixel takes the class most of its neighbourhood has.

    A per-pixel colour rule decides every pixel alone, so along a lace's edge
    where the colour is a blend it flips back and forth, and that flicker is
    the ragged, speckled edge every lace had on the page. Weighing each class
    over a Gaussian of 1.5 px (at full resolution, so under one pixel of the
    photograph make_web reads) moves no edge that is there and removes the
    ones that are only noise.
    """
    votes = np.stack([cv2.GaussianBlur((cls == k).astype(np.float32), (0, 0), sigma)
                      for k in (LACE, LEATHER, WINDOW)], -1)
    return np.argmax(votes, -1).astype(np.uint8)


def islands(grid, roi, min_px):
    """Hand every piece smaller than the page can draw to what surrounds it.

    The web is drawn at about 0.4 of this scale, so a 40 px speck of cream
    between two laces lands as a few pixels of web colour, which on the page
    is a coloured dot in the lace rather than a glimpse of the post. Each class
    has its own floor (`min_px`); what is dropped goes to the nearest piece
    that stays.
    """
    keep = np.ones(grid.shape, bool)
    for k, n in min_px.items():
        m = roi & (grid == k)
        lbl, c = ndimage.label(m)
        if not c:
            continue
        sizes = ndimage.sum(m, lbl, range(1, c + 1))
        keep &= ~np.isin(lbl, np.nonzero(sizes < n)[0] + 1)
    keep |= ~roi
    _, (iy, ix) = ndimage.distance_transform_edt(~keep, return_indices=True)
    return grid[iy, ix], int((~keep).sum())


def to_grid(cls, shape):
    """Majority vote of each 2x2 block of the full-resolution labels."""
    h, w = shape
    votes = np.stack([cv2.resize((cls == k).astype(np.float32), (w, h),
                                 interpolation=cv2.INTER_AREA)
                      for k in (LACE, LEATHER, WINDOW)], -1)
    # a tie goes to lace, then leather: a half-lace pixel at a window's edge
    # is lace in the photograph, and the window should not grow into it
    votes += np.array([0.02, 0.01, 0.0], np.float32)
    return np.argmax(votes, -1).astype(np.uint8)


def trace(slug, shoot):
    src = SOURCES[slug]
    frame = shoot / src["frame"]
    digest = sha256(frame)
    if digest != src["sha256"]:
        raise SystemExit(f"{frame} is not the frame this was traced from "
                         f"(sha256 {digest})")
    full = np.asarray(Image.open(frame).convert("RGB"))[CROP[1]:CROP[3],
                                                        CROP[0]:CROP[2]]
    photo = np.asarray(Image.open(HERE / src["photo"]).convert("RGB"))
    ph, pw = photo.shape[:2]
    if full.shape[:2] != (2 * ph, 2 * pw):
        raise SystemExit(f"crop {full.shape[:2]} is not twice {photo.shape[:2]}")
    # Same pixels? The committed photograph has been relit, which is a smooth
    # gain, so compare structure rather than level: the high-pass of both.
    half = cv2.resize(full, (pw, ph), interpolation=cv2.INTER_AREA)
    hp = lambda im: (lambda g: g - cv2.GaussianBlur(g, (0, 0), 6))(
        cv2.cvtColor(im, cv2.COLOR_RGB2GRAY).astype(np.float32))
    x, y = hp(half).ravel(), hp(photo).ravel()
    ncc = float(np.dot(x - x.mean(), y - y.mean())
                / (np.linalg.norm(x - x.mean()) * np.linalg.norm(y - y.mean())))
    print(f"{src['frame']}: sha256 ok, high-pass correlation with "
          f"{src['photo']} {ncc:.3f}")
    if ncc < 0.9:
        raise SystemExit("the frame does not line up with the committed photograph")

    cls = classify(full, src["rule"], gain=lighting(full, photo),
                   lit_floor=src.get("lit_floor"))
    cls, moved = tidy(cls, src["rule"])
    cls = smooth(cls)
    grid = to_grid(cls, (ph, pw))

    roi = np.zeros((ph, pw), np.uint8)
    cv2.fillPoly(roi, [np.array(src["roi"], np.int32)], 1)
    roi = roi.astype(bool)
    grid, dropped = islands(grid, roi, {LEATHER: 60, LACE: 30, WINDOW: 12})
    print(f"{dropped} px in pieces too small to draw handed to their neighbours")
    lace = roi & (grid == LACE)
    leather = roi & (grid == LEATHER)
    # A window is daylight seen THROUGH the web, so it is enclosed by the
    # glove. Backdrop that runs on out to the open background beyond the rim
    # is outside the web, whatever side of the boundary it falls: counting it
    # as a window kept a band of "window" round the rim that the glove's own
    # rim lacing and finger tip rightly cover, and let empty air into the
    # shape the web is fitted by.
    back = grid == WINDOW
    lbl, k = ndimage.label(back)
    edge = np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]]))
    outside = np.isin(lbl, edge[edge > 0])
    window = roi & back & ~outside
    print(f"{int((roi & back & outside).sum())} px of backdrop inside the "
          f"boundary are open air beyond the rim, not windows")
    # A lace or a piece of leather cut off from the rest of the web by the
    # boundary is a sliver of the next panel, not part of this web.
    body = lace | leather
    lbl, k = ndimage.label(body)
    if k:
        sizes = ndimage.sum(body, lbl, range(1, k + 1))
        stray = np.isin(lbl, np.nonzero(sizes < 40)[0] + 1)
        lace &= ~stray
        leather &= ~stray

    # What the web is, for fitting it to the opening: its leather, lace and
    # windows inside the boundary. The strap below is not in it — it lies
    # over the next panel, and letting it into the fit would stretch the web
    # towards the heel of the glove to cover it.
    extent = lace | leather | window
    strap = np.zeros((ph, pw), np.uint8)
    for poly in src.get("lace_only", ()):
        cv2.fillPoly(strap, [np.array(poly, np.int32)], 1)
    strap = strap.astype(bool) & ~roi & (grid == LACE)
    lbl, k = ndimage.label(strap)
    if k:
        # the strap is one piece of lace; anything else the outline caught is
        # the edge of another lace, and not this web's
        sizes = ndimage.sum(strap, lbl, range(1, k + 1))
        strap = lbl == 1 + int(np.argmax(sizes))
    lace = lace | strap
    print(f"strap over the next panel: {int(strap.sum())} px of lace")

    out = HERE / "runs" / f"store-{slug}"
    (out / "masks").mkdir(parents=True, exist_ok=True)
    for name, m in (("web_lace", lace), ("web_leather", leather),
                    ("web_window", window), ("web_roi", roi),
                    ("web_extent", extent), ("web_strap", strap),
                    # the lace rule over the whole frame, so the strip of
                    # index finger carried with the web can leave lace out
                    ("lace_anywhere", grid == LACE)):
        Image.fromarray((m * 255).astype(np.uint8)).save(out / "masks" / f"{name}.png")

    ov = photo.astype(np.float32).copy()
    for m, c in ((leather, (255, 60, 60)), (lace, (60, 230, 90)),
                 (window, (60, 120, 255))):
        ov[m] = 0.4 * ov[m] + 0.6 * np.array(c, np.float32)
    edge = roi & ~ndimage.binary_erosion(roi)
    ov[edge] = (255, 255, 0)
    ys, xs = np.nonzero(roi)
    x0, y0 = max(int(xs.min()) - 40, 0), max(int(ys.min()) - 40, 0)
    x1, y1 = min(int(xs.max()) + 40, pw), min(int(ys.max()) + 40, ph)
    side = np.concatenate([photo[y0:y1, x0:x1], ov[y0:y1, x0:x1].astype(np.uint8)], 1)
    Image.fromarray(side).save(out / "trace_check.jpg", quality=90)

    report = {
        "web": slug, "traced": datetime.date.today().isoformat(),
        "source": {k: src[k] for k in ("glove", "frame", "sha256", "raw",
                                       "raw_sha256", "photo")},
        "crop_in_frame": list(CROP), "scale": 0.5,
        "photo_highpass_correlation": round(ncc, 4),
        "rule": src["rule"], "lit_floor": src.get("lit_floor"), "roi": src["roi"],
        "lace_only": src.get("lace_only", []),
        "px": {"lace": int(lace.sum()), "strap": int(strap.sum()),
               "leather": int(leather.sum()),
               "window": int(window.sum()), "roi": int(roi.sum())},
        "full_res_px_reassigned_as_noise": moved,
        "px_in_islands_too_small_to_draw": dropped,
        "windows": int(ndimage.label(window)[1]),
    }
    (out / "trace.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report["px"]), f"{report['windows']} windows")
    print(f"wrote {out}/masks/web_*.png — look at trace_check.jpg first")


def install(slug, build, assets=HERE / "customiser" / "assets"):
    """Copy one web's layers out of a scratch build_assets.py run into the
    configurator's assets, and add their entries to glove-data.json.

    Only this web's. A full rebuild re-encodes every asset on the page, and
    with a different Pillow or libwebp that changes bytes nobody asked to
    change — the id map and the Spiral I's sheen among them. Nothing already
    in glove-data.json is altered; the file round-trips byte for byte, so
    the diff is the new web and nothing else.
    """
    import shutil
    src = json.loads((build / "glove-data.json").read_text())
    path = assets / "glove-data.json"
    text = path.read_text()
    data = json.loads(text)
    if json.dumps(data, separators=(",", ":")) != text:
        raise SystemExit(f"{path} does not round-trip; not touching it")
    pair = src["webs"].get(slug)
    if not pair:
        raise SystemExit(f"{build} has no web '{slug}': run make_web.py first")
    keys = [pair[k] for k in ("web", "laceweb", "webfinger") if k in pair]
    keys += [k + "_hi" for k in keys if k + "_hi" in src["assets"]]
    for k in keys:
        name = pathlib.Path(src["assets"][k]).name
        shutil.copyfile(build / name, assets / name)
        data["assets"][k] = f"{assets.name}/{name}"
        data["bbox"][k] = src["bbox"][k]
        if k in src["sheen"]:
            data["sheen"][k] = src["sheen"][k]
    data["webs"][slug] = pair
    path.write_text(json.dumps(data, separators=(",", ":")))
    print(f"installed '{slug}': {', '.join(sorted(keys))}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", required=True, choices=sorted(SOURCES))
    ap.add_argument("--shoot", type=pathlib.Path, default=SHOOT,
                    help="folder holding the store shoot's DSC057xx frames")
    ap.add_argument("--install", type=pathlib.Path, metavar="BUILD",
                    help="instead of tracing, copy this web's layers from a "
                         "scratch build_assets.py --out BUILD into the "
                         "configurator's assets")
    args = ap.parse_args()
    if args.install:
        install(args.web, args.install)
    else:
        trace(args.web, args.shoot)


if __name__ == "__main__":
    main()
