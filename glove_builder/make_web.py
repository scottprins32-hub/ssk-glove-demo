"""Cut a web out of a photograph, split into leather, lacing and finger edge.

SAM3's text prompts are no help here — "web of the baseball glove" scores 0.00
on these photographs, the same as on the rainbow calibration glove. Nor is
colour on its own: on the Columbia glove the web's leather runs from V 0.29 in
shadow to 0.60 in light and the shell in shadow reaches 0.60 too, so any
threshold either loses half the web or swallows half the glove.

What works is tracing the web's outline off the photograph and taking what is
inside it. Within the outline the split really is two-way — the only bright
thing in there is lace — so Otsu finds it per photograph with nothing to tune.

`finger_poly` carries the index finger's own right-hand edge along with the
web, so the join between the two comes from a single photograph instead of
being butted against a different glove's finger. It stays a separate layer and
takes the finger's colour, because that is what it is.

    python glove_builder/make_web.py --web spiral-i

Writes runs/web-<slug>/{leather,lace,finger}.png and check.jpg — the last
being the overlay to look at before believing any of it.
"""

import argparse
import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent

# One entry per photographed web. `seam` is (y, x) waypoints down the welt
# that bounds the web on the finger side; everything left of it is another
# panel. `dark` splits leather from lace by luminance — which of the two is
# darker is what `leather_is_dark` says.
WEBS = {
    "closed-diamond-net": {
        "photo": "images/drive-2026-07/Blue_web1.jpg",
        "glove_mask": "runs/blue-web1/masks/glove.png",
        "dark": 100,
        "leather_is_dark": True,
        "seam": [(0, 686), (700, 700), (750, 712), (800, 740),
                 (850, 790), (900, 855), (950, 925), (1000, 1000)],
        # the leather loops the lace passes through: web, but the seam cuts
        # them off because they sit on the finger side of it. The low one sits
        # beside back 2, penned in by the welt on its left and the lace on its
        # right, which is what keeps the box off back 2's leather.
        "loops": [(655, 130, 755, 480), (630, 560, 715, 760)],
        # The knot of lacing down the thumb side is one 22,604 px piece, over
        # the 20,000 default, so it was being thrown out with the shell —
        # Scott: "it's also missing some of the laces that need to be green."
        "lace_max": 30000,
        # It is a closed web — the name says so, and Scott says so: "the web
        # is fully closed so there shouldn't be any open parts left." Every
        # gap in the opening is the cutout falling short, none of them are
        # windows.
        "closed": True,
    },
    # The Japan glove has this web too, but its navy web is the same navy as
    # its fingers and half of it sits in shadow against a black background —
    # 47k px of fragments and no lace at all. The Columbia glove is the same
    # case as the Closed Diamond Net: light shell, dark web, shot on white.
    "spiral-i": {
        "photo": "images/drive-2026-07/Blue1.jpg",
        "glove_mask": "runs/spiral-i-blue/masks/glove.png",

        # traced off the photograph: down the outer rim, across the bottom,
        # back up the edge against the index finger
        "outline": [(895, 45), (985, 35), (1065, 70), (1120, 150), (1150, 280),
                    (1150, 400), (1120, 530), (1080, 650), (1030, 760),
                    (975, 860), (930, 940), (880, 1010), (800, 1025),
                    (730, 1010), (692, 975), (676, 915), (674, 862),
                    (686, 818), (712, 784), (762, 764), (800, 700),
                    (830, 640), (845, 560), (838, 480), (848, 400),
                    (862, 300), (878, 200), (890, 110)],
        # Scott's idea: carry the index finger's own right-hand edge in the
        # cutout, so the join between finger and web comes from one photograph
        # rather than being butted up against a different glove's finger. It
        # is kept as its own layer and takes the index finger's colour, not
        # the web's — it is finger leather, and the order form asks for it
        # separately.
        "finger_poly": [(890, 45), (890, 110), (878, 200), (862, 300),
                        (848, 400), (838, 480), (845, 560), (830, 640),
                        (800, 700), (762, 764), (712, 784), (686, 818),
                        (674, 862), (676, 915), (692, 975), (730, 1010),
                        (652, 998), (600, 958), (582, 900), (584, 850),
                        (598, 802), (632, 770), (686, 744), (716, 686),
                        (742, 628), (752, 552), (742, 474), (752, 394),
                        (764, 294), (778, 194), (786, 104), (788, 45)],
        # Traced by Scott on the photograph itself, with the tracer: the
        # crossing lace, the knot across the bottom, the spiral's own lacing
        # and every loop round the rim. Only the bright pixels inside each
        # polygon are taken, so the shell the lace passes over stays out.
        "lace_polys": [
            [(604, 726), (668, 716), (770, 762), (752, 800), (648, 772),
             (600, 752)],
            [(754, 725), (733, 751), (868, 887), (861, 888), (909, 882),
             (905, 880)],
            [(906, 878), (922, 867), (939, 870), (946, 879), (954, 890),
             (958, 897), (958, 904), (1029, 981), (1027, 1010), (1019, 1010),
             (935, 926), (910, 928), (906, 919), (880, 919), (870, 914),
             (865, 907), (862, 890)],
            [(835, 769), (830, 783), (847, 807), (881, 791), (898, 797),
             (939, 804), (955, 776), (951, 766), (971, 739), (1005, 672),
             (1005, 651), (990, 636), (972, 642), (976, 618), (969, 605),
             (962, 597), (955, 591), (929, 625), (939, 642), (921, 670),
             (905, 706), (884, 740), (872, 747), (836, 769)],
            [(898, 797), (877, 849), (885, 857), (897, 860), (907, 855),
             (913, 847), (931, 802)],
            [(828, 487), (815, 511), (865, 541), (871, 532), (881, 504)],
            [(856, 369), (918, 388), (919, 399), (912, 420), (856, 408),
             (850, 401), (846, 382)],
            [(892, 485), (883, 516), (1076, 566), (1094, 536), (974, 502),
             (897, 483)],
            [(1092, 535), (1099, 524), (1123, 532), (1124, 546), (1131, 543),
             (1133, 562), (1126, 569), (1126, 585), (1128, 596), (1138, 627),
             (1183, 812), (1161, 819), (1131, 712), (1126, 719), (1118, 723),
             (1109, 704), (1107, 598), (1073, 611), (1069, 595), (1056, 588),
             (1055, 576), (1050, 570), (1056, 562)],
            [(1027, 715), (1049, 746), (1049, 753), (1062, 761), (1063, 782),
             (1070, 810), (1060, 823), (1048, 860), (1028, 890), (1015, 894),
             (1013, 907), (990, 935), (986, 905), (964, 910), (958, 894),
             (978, 888), (969, 877), (983, 851), (993, 820), (1007, 789),
             (1018, 761), (1024, 765), (1025, 739), (1011, 728)],
            [(1065, 784), (1138, 727), (1145, 756), (1069, 811)],
            [(1133, 545), (1140, 466), (1134, 390), (1146, 384), (1146, 346),
             (1117, 340), (1111, 347), (1095, 337), (1066, 313), (1040, 284),
             (1017, 241), (1003, 243), (1007, 272), (1021, 300), (1043, 333),
             (1083, 366), (1096, 377), (1078, 387), (1081, 408), (1091, 432),
             (1116, 420), (1119, 445), (1118, 485), (1112, 529), (1120, 553)],
            [(882, 165), (894, 165), (910, 170), (934, 180), (934, 203),
             (927, 209), (912, 209), (905, 200), (894, 201), (881, 188),
             (876, 183), (881, 166)],
            [(851, 41), (850, 64), (864, 69), (873, 65), (884, 63), (899, 67),
             (906, 74), (922, 88), (924, 71), (921, 54), (907, 46), (893, 39),
             (878, 35), (870, 35), (861, 39)],
            [(955, 70), (968, 69), (976, 75), (984, 83), (988, 86), (994, 85),
             (1016, 99), (1010, 112), (1005, 120), (995, 127), (983, 121),
             (979, 111), (972, 102), (965, 89), (965, 83)],
            [(1027, 117), (1049, 131), (1043, 147), (1030, 160), (1022, 157),
             (1015, 152), (1014, 140), (1014, 129)],
            [(1060, 163), (1071, 161), (1088, 182), (1076, 200), (1063, 204),
             (1055, 195), (1054, 185), (1056, 175)],
            [(1082, 210), (1084, 219), (1079, 230), (1079, 248), (1085, 256),
             (1094, 248), (1103, 239), (1092, 213)],
            [(1091, 261), (1101, 264), (1102, 268), (1107, 290), (1087, 303),
             (1080, 291), (1089, 276), (1092, 268)],
            [(1097, 305), (1107, 309), (1111, 337), (1103, 344), (1086, 334)],
        ],
        # The low loop beside back 2 is a strap running diagonally down to the
        # heel, not a blob, so a box round it takes back 2's leather with it —
        # three tries proved that. Traced as a polygon off Scott's reading of
        # the photograph instead.
        "loop_polys": [[(760, 840), (899, 935), (780, 935), (730, 890)]],
        # Solid panel with the spiral laced across it — the photograph shows
        # no daylight through the middle of it. Marking it so keeps the gaps
        # the traced lacing leaves behind from being read as windows.
        "closed": True,
    },
    # Columbia shell with yellow lacing. The web's leather is the same leather
    # as the shell, so value cannot split it from anything — Otsu finds no
    # edge at all. Hue does: the leather sits at 202 degrees and the lace at 45.
    "standard-i": {
        "photo": "images/drive-2026-07/YellowPad1.jpg",
        "glove_mask": "runs/standard-i/masks/glove.png",
        "lace_hue": (20, 70),
        "outline": [(800, 40), (880, 30), (980, 60), (1060, 130), (1120, 260),
                    (1145, 420), (1130, 560), (1090, 690), (1020, 820),
                    (955, 920), (890, 985), (825, 1005), (778, 985),
                    (762, 930), (764, 860), (772, 790), (782, 700),
                    (790, 580), (795, 450), (797, 320), (798, 180)],
        # The band stops at 752: any further left and it takes in the finger
        # pad, and the calibration glove has no pad fitted — that is a separate
        # question on the form, so pasting one on would answer it for the
        # customer.
        "finger_poly": [(800, 40), (798, 180), (797, 320), (795, 450),
                        (790, 580), (782, 700), (772, 790), (764, 860),
                        (762, 930), (778, 985),
                        (752, 975), (752, 900), (754, 830), (760, 740),
                        (764, 620), (766, 480), (767, 340), (768, 190),
                        (768, 40)],
    },
    # Pink shell with light-blue lacing, and the same story: the web's leather
    # is the shell's leather. Two clean peaks in the hue histogram, blue lacing
    # at 200-230 degrees and pink leather at 310-330.
    "smk": {
        "photo": "images/drive-2026-07/SMK-Web-righty1.jpg",
        "glove_mask": "runs/smk/masks/glove.png",
        "lace_hue": (170, 250),
        "outline": [(760, 40), (850, 25), (960, 55), (1050, 130), (1110, 250),
                    (1140, 400), (1130, 540), (1090, 670), (1030, 800),
                    (965, 910), (900, 985), (830, 1015), (770, 995),
                    (735, 940), (725, 860), (730, 780), (740, 700),
                    (748, 600), (755, 480), (758, 360), (759, 240),
                    (759, 130)],
        "finger_poly": [(760, 40), (759, 130), (759, 240), (758, 360),
                        (755, 480), (748, 600), (740, 700), (730, 780),
                        (725, 860), (735, 940), (770, 995),
                        (700, 980), (660, 925), (650, 850), (658, 770),
                        (668, 690), (676, 590), (682, 470), (686, 350),
                        (687, 230), (688, 120), (688, 40)],
    },
}


def cut(spec):
    im = Image.open(HERE / spec["photo"]).convert("RGB")
    a = np.asarray(im).astype(float)
    lum = a @ [0.299, 0.587, 0.114]
    glove = np.asarray(Image.open(HERE / spec["glove_mask"]).convert("L")) > 127

    if "outline" in spec:
        # Trace the web's boundary and take everything inside it.
        #
        # Hunting for the web by colour does not work on every glove. On the
        # Columbia Spiral I the web's leather runs from V 0.29 in shadow to
        # 0.60 in light, while the shell in shadow drops to 0.60 too — they
        # overlap in every channel, so any threshold either loses half the web
        # or swallows half the glove. Inside a traced outline the problem goes
        # away: the only bright thing in there is lace.
        import cv2
        poly = np.zeros(glove.shape, np.uint8)
        cv2.fillPoly(poly, [np.array(spec["outline"], np.int32)], 1)
        region = glove & poly.astype(bool)
        hsv = np.asarray(im.convert("HSV")).astype(float)
        val = hsv[..., 2] / 255
        # Inside the outline the split is a clean two-way one, so let Otsu
        # find it rather than carrying a hand-tuned number per photograph.
        # Guessing 0.68 here put the shaded laces on the leather side; Otsu
        # says 0.451 for this glove.
        if "lace_hue" in spec:
            # Brightness cannot split these two. On the Standard I and the SMK
            # the web's leather is the same leather as the shell — Columbia
            # blue, pink — and only the lacing differs, so the two sit at the
            # same value and Otsu finds nothing. Hue separates them outright:
            # 205 degrees against 45 on one glove, 340 against 205 on the other.
            hue = np.asarray(im.convert("HSV")).astype(float)[..., 0] * 360 / 255
            lo, hi = spec["lace_hue"]
            islace = ((hue >= lo) & (hue <= hi) if lo <= hi
                      else (hue >= lo) | (hue <= hi))
            web = region & ~islace
            cutv = None
        else:
            cutv = spec.get("lace_v")
            if cutv is None:
                cutv = cv2.threshold((val[region] * 255).astype(np.uint8), 0,
                                     255,
                                     cv2.THRESH_BINARY + cv2.THRESH_OTSU)[0] / 255
                print(f"leather/lace split at V = {cutv:.3f} (Otsu)")
            web = region & (val < cutv)
        web = ndimage.binary_closing(web, np.ones((7, 7), bool))
        web = ndimage.binary_opening(web, np.ones((3, 3), bool))
        lace = region & ~web
        lace = ndimage.binary_opening(lace, np.ones((3, 3), bool))
        lbl, n = ndimage.label(lace)
        sizes = ndimage.sum(lace, lbl, range(1, n + 1))
        lace = np.isin(lbl, np.nonzero(sizes > 120)[0] + 1)
        for poly in spec.get("lace_polys", ()):
            extra = np.zeros(glove.shape, np.uint8)
            cv2.fillPoly(extra, [np.array(poly, np.int32)], 1)
            bright = islace if cutv is None else (val >= cutv)
            lace |= glove & extra.astype(bool) & bright
        finger = None
        if "finger_poly" in spec:
            fp = np.zeros(glove.shape, np.uint8)
            cv2.fillPoly(fp, [np.array(spec["finger_poly"], np.int32)], 1)
            finger = glove & fp.astype(bool) & ~region & ~lace
            finger = ndimage.binary_opening(finger, np.ones((5, 5), bool))
        return im, web, lace, finger


    if "leather_hue" in spec:
        # Brightness alone cannot always tell leather from lace: on the Japan
        # glove the red thumb sits at the same luminance as the navy web, so
        # a threshold hands the thumb to the web. Hue keeps them apart —
        # navy 212 degrees, tan lace 40, red thumb 356.
        hsv = np.asarray(im.convert("HSV")).astype(float)
        hue, sat = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
        lo, hi = spec["leather_hue"]
        band = (hue >= lo) & (hue <= hi) if lo <= hi else (hue >= lo) | (hue <= hi)
        body = glove & band & (sat >= spec.get("leather_sat", 0.10))
    else:
        dark = glove & (lum < spec["dark"])
        body = dark if spec["leather_is_dark"] else (glove & ~dark)

    lbl, n = ndimage.label(body)
    sizes = ndimage.sum(body, lbl, range(1, n + 1))
    web = lbl == (int(np.argmax(sizes)) + 1)

    # everything on the far side of the welt belongs to the next panel
    pts = spec["seam"]
    bound = np.interp(np.arange(web.shape[0]),
                      [p[0] for p in pts], [p[1] for p in pts])
    cols = np.arange(web.shape[1])[None, :]
    keep = cols >= bound[:, None]
    web &= keep

    lbl, n = ndimage.label(web)
    sizes = ndimage.sum(web, lbl, range(1, n + 1))
    web = lbl == (int(np.argmax(sizes)) + 1)
    web = ndimage.binary_closing(web, np.ones((7, 7), bool))

    for x0, y0, x1, y1 in spec.get("loops", ()):
        box = np.zeros_like(web)
        box[y0:y1, x0:x1] = True
        web |= body & box
    for poly in spec.get("loop_polys", ()):
        import cv2
        region = np.zeros(web.shape, np.uint8)
        cv2.fillPoly(region, [np.array(poly, np.int32)], 1)
        web |= body & region.astype(bool)

    # The lacing is whatever sits in the web's outline and is not leather —
    # but taken as whole pieces, not clipped to the outline. The loops round
    # the rim straddle it, and half a loop rendered is worse than none: the
    # outer half would stay the old web's colour while the inner half changed.
    hull = ndimage.binary_fill_holes(
        ndimage.binary_closing(web, np.ones((45, 45), bool))) & keep
    light = glove & ~body
    light = ndimage.binary_opening(light, np.ones((3, 3), bool))
    lbl, n = ndimage.label(light)
    sizes = ndimage.sum(light, lbl, range(1, n + 1))
    inside = ndimage.sum(light & hull, lbl, range(1, n + 1))
    # a piece is web lacing if it reaches into the outline and is lace-sized:
    # the shell beside the web touches it too, and is twenty times bigger
    cap = spec.get("lace_max", 20000)
    take = np.nonzero((inside > 60) & (sizes > 120) & (sizes < cap))[0] + 1
    lace = np.isin(lbl, take)
    return im, web, lace, None


def rgba(im, mask):
    a = np.dstack([np.asarray(im), (mask * 255).astype(np.uint8)])
    return Image.fromarray(a, "RGBA")


def quad(mask):
    """Corners of the mask's minimum-area rectangle, top-left first, clockwise.

    Ordering by angle alone is not enough: two quads of different shape can
    start their loop at different corners, and then the homography pairs
    top-left with bottom-left and quietly rotates everything. Anchoring the
    start at the corner nearest the origin makes the correspondence between
    any two quads well defined.
    """
    import cv2
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL,
                             cv2.CHAIN_APPROX_SIMPLE)
    box = cv2.boxPoints(cv2.minAreaRect(max(cs, key=cv2.contourArea)))
    ctr = box.mean(0)
    box = box[np.argsort(np.arctan2(box[:, 1] - ctr[1], box[:, 0] - ctr[0]))]
    start = int(np.argmin(box.sum(1)))
    return np.roll(box, -start, axis=0).astype(np.float32)


def aperture(height=1100):
    """The opening a web has to fill on the reference glove.

    Everything inside the glove's outline that no other part of it occupies:
    the stock web's leather and, just as importantly, the gaps in the stock
    web, which are background showing through and so belong to the opening
    rather than to the glove. Taken as the largest such region, which leaves
    the hairline gaps between panels out of it.
    """
    lay = HERE / "layers/rainbow-back-4x"

    def α(name):
        im = Image.open(lay / f"{name}.png").convert("RGBA")
        w = int(im.width * height / im.height)
        return np.asarray(im.resize((w, height), Image.LANCZOS))[..., 3] > 40

    outer = ndimage.binary_fill_holes(α("glove"))
    other = np.zeros_like(outer)
    for p in sorted(lay.glob("*.png")):
        # not the lacing: it runs straight across the opening, and counting it
        # as glove chops the opening into fragments — the largest of which is
        # a seventh of the real thing. Where a lace crosses a panel the panel
        # already claims that ground, so leaving it out costs nothing.
        # `*_cutout` are the same panels again, before trimming, and web_cutout
        # covers the whole opening — leaving them in shrinks the aperture to a
        # twentieth of itself.
        if p.stem.endswith("_cutout") or p.stem in ("glove", "web", "laces",
                                                    "bullet_logo"):
            continue
        other |= α(p.stem)
    free = outer & ~ndimage.binary_dilation(other, np.ones((3, 3), bool))
    lbl, n = ndimage.label(free)
    if not n:
        return free
    big = 1 + int(np.argmax(ndimage.sum(free, lbl, range(1, n + 1))))
    return ndimage.binary_fill_holes(lbl == big)


def complete(leather, have, ap, finger=None, min_window=1200):
    """Fill the web out to the edges of the opening it sits in.

    A cutout warped into the opening never quite reaches its corners, and what
    it leaves behind is background: black holes between the web and the finger
    it is stitched to. Scott, looking at all four: "there's still a lot of web
    missing from all of the webs... the webs are way more visible than how
    they are right now."

    A web's own windows have to survive it, so the only gaps kept open are the
    ones a web actually has: enclosed by the web on every side, big enough to
    be a window rather than a ragged edge, and away from the index finger. A
    gap against the finger is the cutout falling short of the seam it is sewn
    to, never a window — no web is open where it is stitched on.

    Everything else in the opening becomes leather, carried in from the
    nearest real pixel the web has.
    """
    a = np.asarray(leather).copy()
    closed = ndimage.binary_closing(have, np.ones((9, 9), bool))
    hole = ndimage.binary_fill_holes(closed) & ~closed
    lbl, n = ndimage.label(hole)
    sizes = ndimage.sum(hole, lbl, range(1, n + 1)) if n else np.zeros(0)
    keep = set(1 + np.nonzero(sizes >= min_window)[0])
    if finger is not None and finger.any():
        seam = ndimage.binary_dilation(finger, np.ones((3, 3), bool),
                                       iterations=3)
        keep -= set(np.unique(lbl[hole & seam]).tolist())
    window = np.isin(lbl, sorted(keep))
    add = ap & ~have & ~window
    if not add.any():
        return leather, 0
    have = a[..., 3] > 90          # leather only, to copy leather in
    iy, ix = ndimage.distance_transform_edt(~have, return_indices=True,
                                            return_distances=False)
    a[..., :3][add] = a[..., :3][iy[add], ix[add]]
    a[..., 3][add] = 255
    soft = ndimage.uniform_filter(a[..., :3].astype(np.float32), size=(5, 5, 1))
    inner = ndimage.binary_erosion(add, np.ones((3, 3), bool))
    a[..., :3][inner] = soft[inner].astype(np.uint8)
    return Image.fromarray(a, "RGBA"), int(add.sum())


def straighten(img):
    """Trim a layer's left edge back to the straight line through its ends.

    The finger strip is traced by hand, so its outer edge wanders, and on the
    glove that wander is the only thing marking where one photograph stops and
    the other starts. A homography maps straight lines to straight lines, so
    cutting it straight here leaves it straight on the glove.

    This only ever removes pixels — the edge is pulled in to the line, never
    invented out to it.
    """
    a = np.asarray(img).copy()
    m = a[..., 3] > 90
    rows = np.nonzero(m.any(1))[0]
    if len(rows) < 20:
        return img
    y0, y1 = int(rows[0]), int(rows[-1])
    x0 = float(np.nonzero(m[y0])[0].min())
    x1 = float(np.nonzero(m[y1])[0].min())
    ys = np.arange(a.shape[0], dtype=np.float32)
    bound = x0 + (x1 - x0) * (ys - y0) / max(y1 - y0, 1)
    cols = np.arange(a.shape[1])[None, :]
    a[..., 3] = np.where(cols >= bound[:, None], a[..., 3], 0)
    return Image.fromarray(a, "RGBA")


def fit(layers, web_mask, height=1100, extend=0.06, finger=None,
        lean=0.55):
    """Warp a cutout onto the reference glove's web aperture.

    Not a stretch — a perspective transform. The reference glove is
    photographed at more of an angle than these webs are, so its web is
    foreshortened; the same foreshortening has to be applied to anything
    dropped into that opening or it sits there too wide.
    """
    import cv2
    ref_im = Image.open(HERE / "layers/rainbow-back-4x/web.png").convert("RGBA")
    w = int(ref_im.width * height / ref_im.height)
    ref = np.asarray(ref_im.resize((w, height), Image.LANCZOS))[..., 3] > 90
    dst = quad(ref)
    # Run the bottom of the web on past the opening so it disappears under the
    # knotted lace instead of stopping just short of it. That lace is on the
    # outside of the glove and draws over the web, so the overshoot is hidden.
    if extend:
        ctr = dst.mean(0)
        low = np.argsort(dst[:, 1])[-2:]
        dst[low] += (dst[low] - ctr) * extend
    # With a finger edge in the cutout, the destination is not the web
    # opening any more — it is the opening plus the strip of index finger the
    # cutout carries. Building it that way keeps both quads' right-hand edges
    # on the same thing, the outer rim, so the web cannot be dragged off it.
    #
    # Pinning the finger edge to back 3 with a solver did align that edge, but
    # it sheared the whole quad and pulled the bottom-right 50 px in off the
    # rim. The band's width is taken from the photograph instead: however wide
    # the finger is relative to the web there, it is that wide here.
    src = web_mask
    if finger is not None and finger.any():
        src = web_mask | finger
        b3_im = Image.open(HERE / "layers/rainbow-back-4x/back3.png").convert("RGBA")
        b3 = np.asarray(b3_im.resize((w, height), Image.LANCZOS))[..., 3] > 90
        # how thick the finger band is in the photograph, as a fraction of
        # the web's width there — measured row by row, because the lace runs
        # out past both and would swamp a bounding-box measurement
        rows = [r for r in range(finger.shape[0]) if finger[r].any()]
        thick = float(np.median([np.count_nonzero(finger[r]) for r in rows]))
        wrows = [r for r in range(web_mask.shape[0]) if web_mask[r].any()]
        wwide = float(np.median([np.ptp(np.nonzero(web_mask[r])[0])
                                 for r in wrows]))
        span = lambda m: float(np.ptp(np.nonzero(m)[1]))
        band = span(ref) * thick / max(wwide, 1.0)
        edge = np.nonzero(b3)[1].max()
        cols = np.arange(w)[None, :]
        dst = quad(ref | (b3 & (cols > edge - band)))
        print(f"finger band {band:.0f} px of back 3 joins the opening")
    M = cv2.getPerspectiveTransform(quad(src), dst)

    # Nothing out of a cutout may render outside the glove. Warped freely, the
    # finger strip put 4,500 px past the silhouette — a bulge down the side of
    # the index finger where every other finger has a clean edge. Clipping to
    # the glove's own outline tucks it under the finger instead of hanging off
    # it, and the finger keeps the shape it always had.
    sil_im = Image.open(HERE / "layers/rainbow-back-4x/glove.png").convert("RGBA")
    sil = np.asarray(sil_im.resize((w, height), Image.LANCZOS))[..., 3]
    sil = (ndimage.binary_erosion(sil > 40, np.ones((3, 3), bool))
           * 255).astype(np.uint8)

    out = {}
    for n, im in layers.items():
        a = cv2.warpPerspective(np.asarray(im), M, (w, height),
                                flags=cv2.INTER_LANCZOS4)
        a[..., 3] = np.minimum(a[..., 3], sil)
        out[n] = Image.fromarray(a, "RGBA")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", required=True, choices=sorted(WEBS))
    args = ap.parse_args()
    spec = WEBS[args.web]
    im, web, lace, finger = cut(spec)

    out = HERE / "runs" / f"web-{args.web}"
    out.mkdir(parents=True, exist_ok=True)
    layers = {"leather": rgba(im, web), "lace": rgba(im, lace)}
    if finger is not None and finger.sum() > 500:
        layers["finger"] = rgba(im, finger)
    for n, layer in layers.items():
        layer.save(out / f"{n}.png")

    aligned = fit(layers, web | lace, finger=finger)
    have = np.zeros((0,), bool)
    for layer in aligned.values():
        a = np.asarray(layer)[..., 3] > 90
        have = a if have.shape != a.shape else (have | a)
    fing = (np.asarray(aligned["finger"])[..., 3] > 90
            if "finger" in aligned else None)
    aligned["leather"], added = complete(
        aligned["leather"], have, aperture(), finger=fing,
        min_window=np.inf if spec.get("closed") else 1200)
    print(f"web completed out to the opening: {added} px added")
    if "finger" in aligned:
        aligned["finger"] = straighten(aligned["finger"])
    # where build_assets.py picks them up, alongside the glove's own layers
    lay = HERE / "layers" / "webs" / args.web
    lay.mkdir(parents=True, exist_ok=True)
    base = Image.open(HERE / "customiser/assets/glove.webp").convert("RGBA")
    for n, layer in aligned.items():
        layer.save(out / f"{n}_aligned.png")
        layer.save(lay / f"{n}.png")
        base.alpha_composite(layer)
    base.convert("RGB").save(out / "fit.jpg", quality=92)

    ov = np.asarray(im).copy()
    if finger is not None:
        ov[finger] = (0.35 * ov[finger]
                      + 0.65 * np.array([250, 200, 40])).astype(np.uint8)
    ov[web] = (0.35 * ov[web] + 0.65 * np.array([255, 60, 60])).astype(np.uint8)
    ov[lace] = (0.35 * ov[lace] + 0.65 * np.array([60, 230, 90])).astype(np.uint8)
    Image.fromarray(ov).save(out / "check.jpg", quality=92)

    ys, xs = np.nonzero(web)
    report = {"web": args.web, "photo": spec["photo"],
              "leather_px": int(web.sum()), "lace_px": int(lace.sum()),
              "finger_px": int(finger.sum()) if finger is not None else 0,
              "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    (out / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print(f"wrote {out}/ — look at check.jpg before trusting it")


if __name__ == "__main__":
    main()
