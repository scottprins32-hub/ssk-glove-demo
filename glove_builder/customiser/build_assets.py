"""Build the self-contained SSK glove customiser page.

Reads the final zone layers, produces luminance-normalized tint bases,
a click hit-test map and the SSK palettes, and writes a single
`index.html` with everything inlined as data URIs.

    python glove_builder/customiser/build_assets.py \
        --layers glove_builder/layers/rainbow-back-4x \
        --out glove_builder/customiser/index.html
"""

import argparse
import base64
import io
import json
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

# SSK color chart (hand-curated hex; the phone photo of the chart has a
# screen cast, so values are tuned to the named colors)
LEATHER = [
    ("10", "White", "#F2F0EA"), ("12", "Camel", "#D9B97A"),
    ("20", "Cardinal", "#A31E31"), ("25", "Pink", "#E17FC0"),
    ("32", "Red", "#C8102E"), ("33", "Red Orange", "#E03C31"),
    ("35", "Orange", "#F05A28"), ("37", "Pumpkin", "#F2A900"),
    ("40", "Chocolate", "#4E2A23"), ("41", "Orange Tan", "#E8A33D"),
    ("43", "Cork Tan", "#D78F3C"), ("44", "Tan", "#C98C3F"),
    ("45", "Yellow Tan", "#E8B84C"), ("46", "Brown", "#6B3B25"),
    ("48", "Maroon", "#7B2A2F"), ("49", "Salmon", "#F0A099"),
    ("50", "Kelly Green", "#279B48"), ("51", "Forest Green", "#1C4E2C"),
    ("52", "Mint", "#B9E0CE"), ("55", "Turquoise", "#16C0DE"),
    ("60", "Royal", "#2145D6"), ("65", "Columbia", "#6C9BC9"),
    ("70", "Navy", "#1D3A8F"), ("71", "Dark Navy", "#131C3E"),
    ("75", "Electric Blue", "#0AB5C8"), ("80", "Purple", "#B12FA0"),
    ("90", "Black", "#17161A"), ("93", "Grey", "#7E8288"),
]
GOLD_FOIL = ("GF", "Gold Foil", "#C9A227")
STITCH_NUMS = {"10", "12", "20", "25", "35", "40", "45", "51", "60", "70",
               "75", "80", "90", "93"}
EMB_EXTRA = [("34", "Edge Gold", "#B8912F"), ("39", "Gold", "#D4AF37"),
             ("42", "Lime Yellow", "#CBDB2A"), ("95", "Silver", "#B9BCC1")]
EMB_NUMS = {"10", "12", "20", "25", "33", "35", "37", "40", "43", "44", "45",
            "48", "49", "50", "51", "52", "60", "70", "75", "80", "90"}

# bottom -> top; (zone, palette_group, label). glove is the base photo.
STACK = [
    ("back9",       "leather",  "Back 9 - pinky wingtip"),
    ("back2",       "leather",  "Back 2 - thumb"),
    ("back78",      "leather",  "Back 7+8 - ring & pinky"),
    ("back6",       "leather",  "Back 6 - middle, 2nd part"),
    ("back5",       "leather",  "Back 5 - middle, 1st part"),
    ("back4",       "leather",  "Back 4 - index, 2nd part"),
    ("back3",       "leather",  "Back 3 - index, 1st part"),
    ("back1",       "leather",  "Back 1 - thumb wingtip"),
    ("web",         "leather",  "Web"),
    ("belt",        "leather",  "Belt"),
    ("lining",      "leather",  "Lining"),
    ("binding",     "lace",     "Binding"),
    ("welting",     "lace",     "Welting"),
    ("thumb_loops", "leather",  "Thumb loops"),
    ("pinky_loops", "leather",  "Pinky loops"),
    ("laces",       "lace",     "Laces"),
    ("embroidery",  "embroidery", "SSK embroidery"),
    ("stitching",   "stitching", "Stitching"),
]
# bullet logo catalog: (name, article number, thumbnail file, on-glove tint;
# None tint = show the original logo cutout untinted)
BULLET_OPTIONS = [
    ("Edge Gold", "", "Edge_Gold.jpg", "#C9A227"),
    ("Edge Silver", "", "Edge_Silver.jpg", "#C0C4CC"),
    ("Edge Gun Metal", "", "Edge_Gun_Metal.jpg", "#5A6068"),
    ("Silicone Gold", "", "Silicone_Gold.jpg", "#D4AF37"),
    ("Silicone Silver", "", "Silicone_Silver.jpg", "#C8CCD2"),
    ("Red/Green", "", "Red_Green.jpg", "#B01E2E"),
    ("Rainbow", "", "Rainbow.jpg", None),
    ("Black/Gold", "", "Black_Gold.jpg", "#A8862A"),
    ("Black/Pink", "", "Black_Pink.jpg", "#E17FC0"),
    ("Black/Purple", "", "Black_Purple.jpg", "#8A3FBF"),
    ("Black/Silver", "", None, "#9AA0A8"),
    ("Green/Gold", "", "Green_Gold.jpg", "#1F7A47"),
    ("Winered/Gold", "", "Winered_Gold.jpg", "#7B2A2F"),
    ("Blue/Gold", "", "Blue_Gold.jpg", "#2145D6"),
    ("Navy/Gold", "", "Navy_Gold.jpg", "#1D3A8F"),
]

# Webs photographed without the knotted lace across the lower web. Scott,
# reading his own glove: "on the yellow pad one, that goes for the regular
# I-web, there's not that big knot of laces."
NO_KNOT = {"standard-i"}

# The corner the knotted lace occupies, in canvas pixels. Every lace piece
# centred in here goes with it.
KNOT_REGION = (480, 500, 860, 820)

PRESETS = {
    "Navy & Orange": {"_panels": "70", "welting": "35", "laces": "35",
                      "binding": "35", "lining": "35", "thumb_loops": "35",
                      "pinky_loops": "35", "embroidery": "35",
                      "stitching": "35"},
    "Classic Tan": {"_panels": "44", "welting": "10", "laces": "12",
                    "binding": "44", "lining": "45", "thumb_loops": "44",
                    "pinky_loops": "44", "embroidery": "90",
                    "stitching": "90"},
    "Black & Pink": {"_panels": "90", "welting": "25", "laces": "25",
                     "binding": "25", "lining": "90", "thumb_loops": "25",
                     "pinky_loops": "25", "embroidery": "25",
                     "stitching": "25"},
}


def to_data_uri(img, fmt="WEBP", **kw):
    buf = io.BytesIO()
    img.save(buf, fmt, **kw)
    return f"data:image/{fmt.lower()};base64," + \
        base64.b64encode(buf.getvalue()).decode()


LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def _luma(img):
    """Luminance, alpha, and the zone's own midtone."""
    a = np.asarray(img).astype(np.float32)
    lum, alpha = a[..., :3] @ LUMA, a[..., 3]
    vis = alpha > 40
    return lum, alpha, (np.median(lum[vis]) if vis.any() else 128.0)


def tint_base(img, flatten=0.0):
    """The diffuse half of the photograph: its shading, normalised so the
    zone's midtone sits at full strength.

    The browser tints by multiplying the chosen colour over this, and a
    multiply can only ever darken. Normalising to anything below 1.0 —
    this used to be 0.74 — therefore made every colour render that much
    darker than the swatch beside it, which is why 10. White came out grey.
    Putting the midtone at 1.0 makes the midtone reproduce the swatch
    exactly; everything the leather throws back above that is carried by
    spec_base() and added on top instead.

    flatten=1.0 collapses all shading to a solid tone.
    """
    lum, alpha, med = _luma(img)
    base = np.clip(lum / max(med, 1.0), 0, 1) * 255.0
    if flatten > 0:
        base = 255.0 + (base - 255.0) * (1.0 - flatten)
    out = np.dstack([base, base, base, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def spec_base(img, gain=0.55):
    """The specular half: how much brighter than its own midtone the leather
    photographs, kept as a white highlight the page adds after tinting.

    This is the shading a multiply cannot express. Without it the midtone
    fix would flatten every highlight, and dark colourways would stay the
    silhouettes they are today — multiplying by near-black leaves nothing
    to see. Returns None when a zone has no meaningful highlight.
    """
    lum, alpha, med = _luma(img)
    hi = np.clip((lum / max(med, 1.0) - 1.0) * gain, 0, 1) * 255.0
    if hi.max() < 4:
        return None
    out = np.dstack([hi, hi, hi, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def ssk_logo_layer(back78_layer, embroidery_layer):
    """Warp the real SSK logo glyph onto the ring finger: the baseline bends
    with the finger's lengthwise curve (centerline fit) and the glyph
    compresses toward the silhouette edges (cylindrical wrap)."""
    import cv2

    glyph_p = pathlib.Path(__file__).parent / "ssk_logo_mask.png"
    if not glyph_p.exists() or back78_layer is None:
        return None
    glyph = np.asarray(Image.open(glyph_p).convert("RGBA")).astype(np.float32)
    gh, gw = glyph.shape[:2]

    pm = np.asarray(back78_layer)[..., 3] > 60
    old = np.asarray(embroidery_layer)[..., 3] > 60
    H, W = pm.shape
    ys, xs = np.nonzero(old)
    if xs.size < 50:
        return None
    ecx, ecy = xs.mean(), ys.mean()
    span = (ys.max() - ys.min()) * 1.30
    y0, y1 = int(max(ecy - span / 2, 0)), int(min(ecy + span / 2, H - 1))

    # finger centerline + half width from the panel mask, windowed around
    # the embroidery column so the red pinky fragments don't pull it away
    win = int(W * 0.16)
    yy_fit, xc_fit, w_fit = [], [], []
    for y in range(max(y0 - 40, 0), min(y1 + 40, H)):
        row = np.nonzero(pm[y, max(int(ecx - win), 0):int(ecx + win)])[0]
        if row.size < 8:
            continue
        row = row + max(int(ecx - win), 0)
        yy_fit.append(y)
        xc_fit.append(row.mean())
        w_fit.append((row.max() - row.min()) / 2)
    if len(yy_fit) < 20:
        return None
    yy_fit = np.array(yy_fit)
    pc = np.polyfit(yy_fit, np.array(xc_fit), 2)
    pw = np.polyfit(yy_fit, np.array(w_fit), 1)

    yr = np.arange(y0, y1 + 1)
    xc = np.polyval(pc, yr)
    wv = np.clip(np.polyval(pw, yr), 12, None)
    dx = np.gradient(xc)
    seg = np.sqrt(1 + dx * dx)
    u = np.concatenate([[0], np.cumsum(seg[:-1])])
    L = u[-1]
    B = L * gh / gw  # unwrapped band height preserving glyph aspect

    xg = np.arange(W)
    vmat = xg[None, :] - xc[:, None]
    Rmat = wv[:, None] * 1.06
    ratio = np.clip(vmat / Rmat, -1, 1)
    v_un = Rmat * np.arcsin(ratio)
    gx = (u[:, None] / L) * (gw - 1) * np.ones((1, W))
    gy = (0.5 - v_un / B) * (gh - 1)
    inside = (np.abs(vmat) < Rmat * 0.985) & (gy >= 0) & (gy <= gh - 1)

    map_x = gx.astype(np.float32)
    map_y = np.clip(gy, 0, gh - 1).astype(np.float32)
    warped = cv2.remap(glyph, map_x, map_y, cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    warped[~inside] = 0

    out = np.zeros((H, W, 4), np.float32)
    out[y0:y1 + 1] = warped
    out[..., 3] = np.minimum(out[..., 3], 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def ssk_wordmark(embroidery_layer, height):
    """Clean 'SSK' wordmark fitted to the footprint of the photo-derived
    embroidery mask (angle + bbox), with a thread-ridge texture."""
    import cv2
    import matplotlib
    from PIL import ImageDraw, ImageFont

    a = np.asarray(embroidery_layer)[..., 3]
    ys, xs = np.nonzero(a > 60)
    if xs.size < 50:
        return None
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bh, bw = y1 - y0, x1 - x0
    # principal angle of the letter run
    pts = np.stack([xs - xs.mean(), ys - ys.mean()], 1).astype(np.float32)
    cov = np.cov(pts.T)
    evals, evecs = np.linalg.eigh(cov)
    v = evecs[:, np.argmax(evals)]
    angle = np.degrees(np.arctan2(v[1], v[0]))  # letters run along this

    font_path = (pathlib.Path(matplotlib.get_data_path()) / "fonts" / "ttf"
                 / "DejaVuSans-BoldOblique.ttf")
    fs = int(max(bh, bw) * 0.42)
    font = ImageFont.truetype(str(font_path), fs)
    pad = fs
    tw = int(fs * 2.6) + 2 * pad
    th = fs + 2 * pad
    txt = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(txt).text((pad, pad), "SSK", font=font, fill=255)
    txt = txt.rotate(angle + 180 if abs(angle) > 90 else angle,
                     expand=True, resample=Image.BICUBIC)
    tm = np.asarray(txt)
    tys, txs = np.nonzero(tm > 60)
    tcrop = tm[tys.min():tys.max() + 1, txs.min():txs.max() + 1]
    # scale to fit the embroidery bbox (90%)
    sc = min(bw * 0.9 / tcrop.shape[1], bh * 0.9 / tcrop.shape[0])
    tcrop = cv2.resize(tcrop, (max(int(tcrop.shape[1] * sc), 1),
                               max(int(tcrop.shape[0] * sc), 1)))
    H, W = a.shape
    canvas = np.zeros((H, W), np.float32)
    cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
    oy, ox = cy - tcrop.shape[0] // 2, cx - tcrop.shape[1] // 2
    canvas[oy:oy + tcrop.shape[0], ox:ox + tcrop.shape[1]] = tcrop
    alpha_new = cv2.GaussianBlur(canvas, (0, 0), 1.2)
    # thread ridges perpendicular to the letter run
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ph = (xx * np.cos(np.radians(angle + 90)) +
          yy * np.sin(np.radians(angle + 90)))
    ridges = 0.74 * 255 * (1.0 + 0.10 * np.sin(ph * 2 * np.pi / 6.0))
    base = np.clip(ridges, 0, 255)
    out = np.dstack([base, base, base,
                     np.clip(alpha_new, 0, 255)]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def sheen_p95(img):
    """How strong a specular layer is, as its 95th percentile brightness."""
    if img is None:
        return None
    a = np.asarray(img).astype(np.float32)
    m = a[..., 3] > 0
    if not m.any():
        return None
    return float(np.percentile((a[..., :3] @ LUMA)[m], 95))


def match_sheen(sp, target):
    """Scale a specular layer to the sheen of the layer it replaces.

    The calibration glove was shot in flat light; the web photographs were
    shot with a phone flash, so their highlights sit far above their own
    midtone and the specular pass comes out four times as strong. Added with
    `lighter`, that is what reads as wet-looking plastic rather than leather.
    Matching the 95th percentile keeps whatever sheen the photograph has in
    the right proportion to the rest of the glove.
    """
    have = sheen_p95(sp)
    if sp is None or not target or not have or have <= 1:
        return sp
    a = np.asarray(sp).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] * (target / have), 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def mount_from_panel(mask, top=0.14, bot=0.42, fill=0.79, ratio=1.5):
    """Where the flag patch sits on a finger panel.

    Measured off the orange glove Scott photographed: the patch starts 14%
    down the finger, ends at 42%, and covers 79% of the finger's width
    there. `ratio` is the patch's length along the finger over its width —
    a 3:2 flag turned a quarter turn, stripes running lengthwise.

    Returns {cx, cy, w, h, angle} in canvas pixels, angle in radians
    clockwise, or None if the panel is missing.
    """
    ys, xs = np.nonzero(mask)
    if len(ys) < 500:
        return None
    y0, y1 = int(ys.min()), int(ys.max())
    span = y1 - y0

    def centre(y):
        row = np.nonzero(mask[y])[0]
        return (float(row.mean()), len(row)) if len(row) else (None, 0)

    band = range(y0 + int(span * top), y0 + int(span * bot) + 1)
    pts = [(y, *centre(y)) for y in band]
    pts = [(y, c, n) for y, c, n in pts if c is not None]
    if len(pts) < 20:
        return None
    yy = np.array([p[0] for p in pts], float)
    cc = np.array([p[1] for p in pts], float)
    # x = a*y + b: the finger leans, so the patch leans with it
    a = np.polyfit(yy, cc, 1)[0]
    cy = float(yy.mean())
    cx = float(cc.mean())
    width = float(np.median([p[2] for p in pts])) * fill
    return {"cx": round(cx, 1), "cy": round(cy, 1),
            "w": round(width, 1), "h": round(width * ratio, 1),
            "angle": round(float(np.arctan(-a)), 4)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--layers", required=True)
    ap.add_argument("--out", required=True,
                    help="asset directory to write (e.g. .../customiser/assets)")
    ap.add_argument("--height", type=int, default=1100)
    args = ap.parse_args()
    layers = pathlib.Path(args.layers)

    def load(name):
        p = layers / f"{name}.png"
        if not p.exists():
            return None
        im = Image.open(p).convert("RGBA")
        w = int(im.width * args.height / im.height)
        return im.resize((w, args.height), Image.LANCZOS)

    glove = load("glove")
    W, H = glove.size
    # neutral-leather base: any pixel not covered by a zone shows as plain
    # leather instead of leaking the calibration glove's rainbow colors
    gb = np.asarray(tint_base(glove)).astype(np.float32)
    neutral = np.array([200, 160, 106], np.float32) / 255.0
    gb[..., :3] = gb[..., :3] * neutral
    glove_neutral = Image.fromarray(gb.astype(np.uint8), "RGBA")
    assets = {"glove": to_data_uri(glove_neutral, quality=88, method=4)}
    zones = []
    idmap = np.zeros((H, W), np.uint8)
    for i, (name, group, label) in enumerate(STACK, 1):
        im = load(name)
        if im is None:
            continue
        alpha = np.asarray(im)[..., 3]
        if (alpha > 40).sum() < 50:
            continue  # empty at this angle (back9)
        if name == "embroidery":
            clean_mark = (ssk_logo_layer(load("back78"), im)
                          or ssk_wordmark(im, args.height))
            tb = clean_mark if clean_mark is not None else tint_base(im)
        elif name == "lining":
            tb = tint_base(im, flatten=0.85)
        else:
            tb = tint_base(im)
        assets[name] = to_data_uri(tb, quality=85, method=4)
        # the highlight the tint cannot reproduce, added back over the colour
        if name not in ("embroidery", "lining"):
            sp = spec_base(im)
            if sp is not None:
                assets[name + "_hi"] = to_data_uri(sp, quality=80, method=4)
        idmap[alpha > 90] = i
        zones.append({"id": name, "n": i, "group": group, "label": label})

    # How the lace runs through the web is part of the web type, not a fixed
    # feature of the glove — pick a different web and that lacing changes with
    # it. So the lace inside the web has to come off the general laces layer,
    # or a swapped-in web would sit under the old web's lacing.
    #
    # Both halves are normalised against the whole layer, not against
    # themselves, or the split would show as a step in brightness.
    lac = load("laces")
    web_im = load("web")
    web_lace_mask = None
    if lac is not None and web_im is not None:
        webm = np.asarray(web_im)[..., 3] > 90
        hull = ndimage.binary_fill_holes(
            ndimage.binary_closing(webm, np.ones((25, 25), bool)))
        la = np.asarray(lac)[..., 3] > 40
        # Whole pieces, not the part inside the outline: the lace that wraps
        # the top of the web crosses its edge, so clipping left the outer half
        # behind on the general laces layer, where it survived the swap and
        # sat on top of the new web.
        #
        # But "touches the web" is too generous — the knotted lace touches it
        # too, and that one belongs to the glove and has to stay. How much of
        # a piece lies inside tells them apart cleanly: the loops around the
        # rim are a third to two thirds in, the knot is a seventh.
        # Overlap alone still is not enough. Two loops on the outer rim sit
        # further into the web than the ones on the finger side do, but they
        # belong to the glove's edge, not the web — they are part of the same
        # run as the rim lacing above and below them. Which side of the web a
        # piece sits on settles it: the web's own loops are on the finger
        # side, the rim's are on the outer side.
        lbl, n = ndimage.label(la)
        sizes = ndimage.sum(la, lbl, range(1, n + 1))
        within = ndimage.sum(la & hull, lbl, range(1, n + 1))
        frac = np.divide(within, sizes, out=np.zeros_like(within),
                         where=sizes > 0)
        cx = np.array(ndimage.center_of_mass(la, lbl, range(1, n + 1)))[:, 1] \
            if n else np.zeros(0)
        web_cx = np.nonzero(webm)[1].mean()
        inside = np.isin(lbl, np.nonzero((frac >= 0.35) & (cx < web_cx))[0] + 1)
        if inside.sum() > 500:
            def half(src, keep):
                a = np.asarray(src).copy()
                a[..., 3] = np.where(keep, a[..., 3], 0)
                return Image.fromarray(a, "RGBA")
            tb, sp = tint_base(lac), spec_base(lac)
            assets["laces"] = to_data_uri(half(tb, ~inside), quality=85, method=4)
            assets["laces_web"] = to_data_uri(half(tb, inside), quality=85, method=4)
            if sp is not None:
                assets["laces_hi"] = to_data_uri(half(sp, ~inside), quality=80, method=4)
                assets["laces_web_hi"] = to_data_uri(half(sp, inside), quality=80,
                                                     method=4)
            web_lace_mask = inside

            # The knotted lace is not glove furniture either — the Standard I
            # glove has no knot at all, so a web has to be able to decline it.
            # It is the big piece that reaches into the web but mostly lies
            # outside it: 10,809 px at 0.14 in, three times any other.
            # Everything blue in that corner, not just the biggest piece of it:
            # Scott, looking at the render, "all the blue parts of the lace that
            # is in that area needs to be gone". So take every lace piece whose
            # centre of mass falls in the knot's corner, which still leaves the
            # tails hanging off the rim above it.
            kx0, ky0, kx1, ky1 = KNOT_REGION
            cm = (np.array(ndimage.center_of_mass(la, lbl, range(1, n + 1)))
                  if n else np.zeros((0, 2)))
            cand = (np.nonzero((cm[:, 1] >= kx0) & (cm[:, 1] <= kx1)
                               & (cm[:, 0] >= ky0) & (cm[:, 0] <= ky1)
                               & (sizes > 200))[0] if n else np.zeros(0, int))
            if len(cand):
                knot = np.isin(lbl, cand + 1)
                rest = la & ~inside & ~knot
                assets["laces"] = to_data_uri(half(tb, rest), quality=85,
                                              method=4)
                assets["laces_knot"] = to_data_uri(half(tb, knot), quality=85,
                                                   method=4)
                if sp is not None:
                    assets["laces_hi"] = to_data_uri(half(sp, rest),
                                                     quality=80, method=4)
                    assets["laces_knot_hi"] = to_data_uri(half(sp, knot),
                                                          quality=80, method=4)
                print(f"knotted lace: {knot.sum()} px -> laces_knot")

                # Removing the knot leaves the neutral base showing through
                # in the shape of the knot — a tan ghost that still reads as
                # a knot. Nothing lies behind it in a flat photograph, so the
                # panels around it have to grow into its footprint: each of
                # its pixels goes to whichever zone is nearest, at that
                # zone's own midtone, and those panels then paint over the
                # ghost in their own colours. With the knot drawn it is
                # hidden underneath, so this costs nothing.
                zmask, zname = {}, {}
                occupied = np.zeros(knot.shape, np.int32)
                for zi, (zn, _g, _l) in enumerate(STACK, 1):
                    # Leather panels only. Not the web — it is cut out when
                    # another is swapped in, and anything grown into it goes
                    # with it, leaving the same hole in a different colour.
                    # Not stitching, welting or binding either: those are thin
                    # lines, and a slab of one reads as a stripe of paint, not
                    # as leather.
                    if zn == "web" or _g != "leather":
                        continue
                    zim = load(zn)
                    if zim is None:
                        continue
                    za = np.asarray(zim)[..., 3] > 90
                    zmask[zn] = za
                    zname[zi] = zn
                    occupied[za & ~knot] = zi
                iy, ix = ndimage.distance_transform_edt(
                    occupied == 0, return_indices=True,
                    return_distances=False)
                owner = occupied[iy, ix]
                grew = []
                for zi, zn in zname.items():
                    add = knot & (owner == zi)
                    if add.sum() < 200:
                        continue
                    zim = load(zn)
                    arr = np.asarray(zim).copy()
                    lum, _al, med = _luma(zim)
                    arr[..., :3][add] = np.uint8(round(med))
                    arr[..., 3][add] = 255
                    filled = Image.fromarray(arr, "RGBA")
                    assets[zn] = to_data_uri(tint_base(filled), quality=85,
                                             method=4)
                    fsp = spec_base(filled)
                    if fsp is not None:
                        assets[zn + "_hi"] = to_data_uri(fsp, quality=80,
                                                         method=4)
                    grew.append(f"{zn}+{int(add.sum())}")
                if grew:
                    print("  panels grown into its footprint: "
                          + ", ".join(grew))
            print(f"web lacing: {inside.sum()} px split off laces -> laces_web")

    # The index finger is a single piece when it carries a flag, so the welt
    # that splits back3 from back4 has to disappear. Export just that seam;
    # the page paints it in the panel colour to close it up. It also gives us
    # the patch mount: centre, size and tilt of the flag on that finger.
    import cv2 as _cv2
    flag_mount = None
    w3, w4, wl = load("back3"), load("back4"), load("welting")
    if w3 is not None and w4 is not None and wl is not None:
        A = lambda im: np.asarray(im)[..., 3] > 90
        big, small = np.ones((41, 41), np.uint8), np.ones((15, 15), np.uint8)
        seed = (A(wl)
                & _cv2.dilate(A(w3).astype(np.uint8), big).astype(bool)
                & _cv2.dilate(A(w4).astype(np.uint8), big).astype(bool))
        seam = A(wl) & _cv2.dilate(seed.astype(np.uint8), small).astype(bool)
        if seam.sum() > 500:
            sa = np.asarray(wl).copy()
            sa[..., 3] = np.where(seam, sa[..., 3], 0)
            assets["welt_index"] = to_data_uri(
                tint_base(Image.fromarray(sa, "RGBA")), quality=85, method=4)
            print(f"index-finger seam: {seam.sum()} px -> welt_index")
        flag_mount = mount_from_panel(A(w3) | A(w4))

    # Alternative webs, cut from photographs by make_web.py and already warped
    # onto this glove's web opening. Each is a pair: the leather, which takes
    # the web colour, and its lacing, which takes the lace colour — how the
    # lace runs through a web is part of the web, so the two travel together.
    webs = {}
    web_dir = pathlib.Path(__file__).parent.parent / "layers" / "webs"
    # The sheen each layer has to match is the sheen of the layer it stands
    # in for — the web's for the web and its lacing, back 3's for the strip of
    # index finger. Matching the finger strip to the web made it twice as
    # glossy as the finger it continues, which is what read as two pieces.
    sheen_for = {}
    for part, zone in (("web", "web"), ("laceweb", "web"),
                       ("webfinger", "back3")):
        im0 = load(zone)
        sheen_for[part] = sheen_p95(spec_base(im0)) if im0 is not None else None
    # A cut-out web never covers the stock web's opening exactly. Backing it
    # with the opening filled solid means the leftover shows as leather in the
    # web's own colour rather than as a hole punched through the glove.
    web_im = load("web")
    if web_im is not None and any(p.is_dir() for p in web_dir.glob("*")):
        wa = np.asarray(tint_base(web_im)).copy()
        # The backing has to cover everything the swap removes — the web and
        # its lacing both — or the neutral base shows through as bare tan
        # where a lace used to be.
        gone = wa[..., 3] > 90
        if web_lace_mask is not None:
            gone = gone | web_lace_mask
        solid = ndimage.binary_fill_holes(
            ndimage.binary_closing(gone, np.ones((25, 25), bool)))
        gap = solid & (wa[..., 3] <= 90)
        if gap.any():
            iy, ix = ndimage.distance_transform_edt(
                wa[..., 3] <= 90, return_indices=True, return_distances=False)
            wa[..., :3][gap] = wa[..., :3][iy[gap], ix[gap]]   # nearest leather
        wa[..., 3] = np.where(solid, 255, 0)
        assets["web_fill"] = to_data_uri(Image.fromarray(wa, "RGBA"),
                                         quality=85, method=4)
        print(f"web backing: {solid.sum()} px -> web_fill")
    for d in sorted(p for p in web_dir.glob("*") if p.is_dir()):
        pair = {}
        for part, key in (("leather", "web"), ("lace", "laceweb"),
                          ("finger", "webfinger")):
            f = d / f"{part}.png"
            if not f.exists():
                continue
            im = Image.open(f).convert("RGBA").resize((W, H), Image.LANCZOS)
            name = f"{key}_{d.name}"
            if key == "webfinger":
                # Soften the edge where the strip meets the glove's own finger.
                # Two photographs will never grain-match exactly, and a hard
                # cut between them reads as a join however well the tone is
                # matched. The web draws over the other side, so a feather all
                # round costs nothing.
                a = np.asarray(im).astype(np.float32)
                a[..., 3] = ndimage.gaussian_filter(a[..., 3], 3.0)
                im = Image.fromarray(a.astype(np.uint8), "RGBA")
            assets[name] = to_data_uri(tint_base(im), quality=85, method=4)
            sp = match_sheen(spec_base(im), sheen_for.get(key))
            if sp is not None:
                assets[name + "_hi"] = to_data_uri(sp, quality=80, method=4)
            pair[key] = name
        if pair:
            print(f"web '{d.name}': {' + '.join(pair.values())}"
                  + ("" if d.name not in NO_KNOT else "  (no knotted lace)"))
            pair["knot"] = d.name not in NO_KNOT
            webs[d.name] = pair

    # The finger pad, cut from SSK's own and fitted to the index finger by
    # make_pad.py. It is an option on the form, so it only renders when it is
    # ordered, and it takes the pad colour.
    pad_f = pathlib.Path(__file__).parent.parent / "layers" / "pad" / "pad.png"
    if pad_f.exists():
        pim = Image.open(pad_f).convert("RGBA").resize((W, H), Image.LANCZOS)
        assets["pad"] = to_data_uri(tint_base(pim), quality=85, method=4)
        psp = match_sheen(spec_base(pim), sheen_for.get("webfinger"))
        if psp is not None:
            assets["pad_hi"] = to_data_uri(psp, quality=80, method=4)
        print(f"finger pad: {(np.asarray(pim)[..., 3] > 90).sum()} px -> pad")

    bullet = load("bullet_logo")
    bullets = []
    if bullet is not None:
        assets["bullet_logo"] = to_data_uri(bullet, quality=88, method=4)
        assets["bullet_logo_tb"] = to_data_uri(tint_base(bullet),
                                               quality=85, method=4)
        thumb_dir = (pathlib.Path(__file__).parent.parent
                     / "form_assets" / "bullet_logos")
        ba = np.asarray(bullet)[..., 3]
        bys, bxs = np.nonzero(ba > 60)
        bullet_box = [int(bxs.min()), int(bys.min()),
                      int(bxs.max()), int(bys.max())]
        # Edge badges: the real photo-derived patch, rotated to the wrist
        # logo's angle, scaled to its footprint, with a soft drop shadow
        import cv2 as _cv
        cnts, _ = _cv.findContours((ba > 60).astype(np.uint8),
                                   _cv.RETR_EXTERNAL, _cv.CHAIN_APPROX_SIMPLE)
        rect = _cv.minAreaRect(np.vstack([c.reshape(-1, 2) for c in cnts]))
        (rcx, rcy), (rw, rh), rtheta = rect
        if rw < rh:  # normalize so rw = long side, rtheta = long-axis angle
            rw, rh = rh, rw
            rtheta += 90
        while rtheta > 90:
            rtheta -= 180
        while rtheta < -90:
            rtheta += 180
        bw_px = rw
        COMBO_SLUGS = {"Black/Gold": "blackgold",
                       "Black/Pink": "blackpink", "Black/Purple": "blackpurple",
                       "Black/Silver": "blacksilver", "Red/Green": "redgreen",
                       "Green/Gold": "greengold", "Winered/Gold": "wineredgold",
                       "Blue/Gold": "bluegold", "Navy/Gold": "navygold"}
        badge_files = {"edge_gold": "edge_gold_badge.png",
                       "edge_silver": "edge_silver_badge.png",
                       "edge_gunmetal": "edge_gunmetal_badge.png"}
        for slug in COMBO_SLUGS.values():
            badge_files[f"bullet_{slug}"] = f"bullet_{slug}_badge.png"
        for akey, fname in badge_files.items():
            bp = pathlib.Path(__file__).parent / fname
            if not bp.exists():
                continue
            badge = Image.open(bp).convert("RGBA")
            # same size, shape and angle as the embroidered logo footprint
            badge = badge.resize((max(int(rw), 1), max(int(rh), 1)),
                                 Image.LANCZOS)
            badge = badge.rotate(-rtheta, expand=True, resample=Image.BICUBIC)
            canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            cxp = int(rcx) - badge.width // 2
            cyp = int(rcy) - badge.height // 2
            import cv2 as _cv2
            sh = np.zeros((H, W), np.float32)
            am = np.asarray(badge)[..., 3] / 255.0
            y0s, x0s = cyp + 4, cxp + 3
            sh[max(y0s, 0):y0s + badge.height,
               max(x0s, 0):x0s + badge.width] = am[:min(badge.height, H - y0s),
                                                   :min(badge.width, W - x0s)]
            sh = _cv2.GaussianBlur(sh, (0, 0), 4) * 0.45
            shadow = np.zeros((H, W, 4), np.uint8)
            shadow[..., 3] = (sh * 255).astype(np.uint8)
            canvas = Image.alpha_composite(canvas,
                                           Image.fromarray(shadow, "RGBA"))
            canvas.paste(badge, (cxp, cyp), badge)
            assets[akey] = to_data_uri(canvas, quality=85, method=4)
        for name, art, thumb, tint in BULLET_OPTIONS:
            material = ("rubber" if name.startswith("Edge")
                        else "plastic" if name.startswith("Silicone")
                        else "embroidered")
            entry = {"name": name, "art": art, "tint": tint, "thumb": None,
                     "material": material,
                     "active": material != "plastic"}
            if material == "rubber":
                entry["asset"] = "edge_" + name.split()[-1].lower().replace(
                    "metal", "gunmetal")
            slug = COMBO_SLUGS.get(name)
            if slug and f"bullet_{slug}" in assets:
                entry["asset"] = f"bullet_{slug}"
            # generated straight-on thumbnails win over form thumbnails
            gt = pathlib.Path(__file__).parent / f"thumb_{slug}.png" if slug \
                else None
            if gt is not None and gt.exists():
                t = Image.open(gt).convert("RGBA")
                bgc = Image.new("RGB", t.size, (238, 238, 238))
                bgc.paste(t, (0, 0), t)
                entry["thumb"] = to_data_uri(bgc, quality=80, method=4)
            elif thumb and (thumb_dir / thumb).exists():
                t = Image.open(thumb_dir / thumb).convert("RGB")
                t.thumbnail((140, 140))
                entry["thumb"] = to_data_uri(t, quality=80, method=4)
            bullets.append(entry)

    idmap_img = Image.fromarray(idmap, "L")
    assets["_idmap"] = to_data_uri(idmap_img, fmt="PNG")

    pal = {"leather": [list(c) for c in LEATHER],
           "lace": [list(c) for c in LEATHER] + [list(GOLD_FOIL)],
           "stitching": [list(c) for c in LEATHER if c[0] in STITCH_NUMS],
           "embroidery": sorted(
               [list(c) for c in LEATHER if c[0] in EMB_NUMS] +
               [list(c) for c in EMB_EXTRA], key=lambda c: c[0])}

    # Write every asset as its own file and record where it landed. The page
    # loads these individually so a colour change re-tints one bounding box
    # instead of decoding an 850 KB inlined blob on every visit.
    out = pathlib.Path(args.out)
    (out / "thumbs").mkdir(parents=True, exist_ok=True)
    bbox = {}

    def spill(uri, rel):
        """data URI -> file on disk; returns the path the page should use."""
        head, b64 = uri.split(",", 1)
        raw = base64.b64decode(b64)
        (out / rel).write_bytes(raw)
        return f"{out.name}/{rel}"

    for key in list(assets):
        ext = "png" if assets[key].startswith("data:image/png") else "webp"
        rel = ("idmap.png" if key == "_idmap" else f"{key}.{ext}")
        assets[key] = spill(assets[key], rel)
        if key in ("_idmap", "glove"):
            continue
        a = np.asarray(Image.open(out / rel).convert("RGBA"))[..., 3]
        ys, xs = np.nonzero(a > 8)
        if len(ys):
            bbox[key] = [int(xs.min()), int(ys.min()),
                         int(xs.max()) + 1, int(ys.max()) + 1]

    for b in bullets:
        if b.get("thumb", "").startswith("data:"):
            slug = b["name"].lower().replace("/", "").replace(" ", "")
            b["thumb"] = spill(b["thumb"], f"thumbs/{slug}.webp")

    data = {"w": W, "h": H, "zones": zones, "palettes": pal,
            "presets": PRESETS, "bullets": bullets,
            "bulletBox": bullet_box if bullets else None,
            "flagMount": flag_mount, "webs": webs,
            "assets": assets, "bbox": bbox}
    (out / "glove-data.json").write_text(json.dumps(data, separators=(",", ":")))
    total = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    print(f"wrote {out}/ — {len(assets)} assets + glove-data.json "
          f"({total/1e6:.1f} MB), {len(zones)} recolorable zones, canvas {W}x{H}")


if __name__ == "__main__":
    main()
