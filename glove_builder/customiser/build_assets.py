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
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# The build tools live one level up, beside the layers they read.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import sheen                                                  # noqa: E402

# SSK color chart. The hex is ours and always will be: Pim, asked for a list
# of hex codes, says there is none -- "die codes die ervoor staan van 10-90
# gebruiken zij, want bij elke stof is het een beetje anders." The number is
# the colour; the same number on a different leather is a slightly different
# colour, so no single hex can be right for all of them. That settles what
# there is to ask for. Not a list -- a photograph, of the swatch card, flat
# and lit, with a white sheet in the frame to key the white balance off.
#
# What is here now is hand-curated from a phone photo of the chart that has a
# screen cast in it, so the values are tuned to the named colours. Where
# photographs of finished gloves overrule the chart, colour-evidence.json
# says so and leather_chart() applies it -- see
# glove_builder/colour_evidence.py. Without that overlay a rebuild would
# quietly put the eyeballed values back.
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

# Only leather and lace are photographed: a lace is leather, a stitch is
# thread and no photograph here resolves one.
EVIDENCE = pathlib.Path(__file__).resolve().parents[1] / "colour-evidence.json"


def leather_chart(photographed: bool):
    """The chart, with the photographed leathers substituted in."""
    if not photographed or not EVIDENCE.exists():
        return [list(c) for c in LEATHER]
    adopted = json.loads(EVIDENCE.read_text()).get("adopted", {})
    return [[n, name, adopted.get(n, hexv)] for n, name, hexv in LEATHER]
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
    # The reference code packs this index into four bits, so the list holds
    # sixteen. The two silicone patches that used to sit here were never
    # selectable ("not shown"); their slots now carry two patches SSK had on
    # the shelf at the store shoot, so every code issued so far still reads
    # the same. Tints are the median thread colour of the catalogue photos.
    ("White/Gold", "", None, "#E9E5DC"),
    ("Red/Gold", "", None, "#BC2628"),
    ("Red/Green", "", "Red_Green.jpg", "#BC2628"),
    ("Rainbow", "", "Rainbow.jpg", None),
    ("Black/Gold", "", "Black_Gold.jpg", "#A38350"),
    ("Black/Pink", "", "Black_Pink.jpg", "#E45F8E"),
    ("Black/Purple", "", "Black_Purple.jpg", "#533283"),
    ("Black/Silver", "", None, "#9AA0A8"),
    ("Green/Gold", "", "Green_Gold.jpg", "#14703F"),
    ("Winered/Gold", "", "Winered_Gold.jpg", "#86303A"),
    ("Blue/Gold", "", "Blue_Gold.jpg", "#1857A6"),
    ("Navy/Gold", "", "Navy_Gold.jpg", "#1B2545"),
]

# Webs photographed without the knotted lace across the lower web. Scott,
# reading his own glove: "on the yellow pad one, that goes for the regular
# I-web, there's not that big knot of laces."
NO_KNOT = {"standard-i"}

# The corner the knotted lace occupies, in canvas pixels. Every lace piece
# centred in here goes with it.
KNOT_REGION = (480, 500, 860, 820)

# Traced by hand where the region is not enough. A lace piece that touches one
# of these belongs to the knot however far it runs — the box rule works on
# where a piece is centred, and this lace carries on up past the web where its
# centre no longer lands in the corner, so the box was taking half of it and
# leaving the rest. Points are (x, y) in canvas pixels.
KNOT_POLYS = []

# Where the segmentation cut a lace into a leather panel. The knotted lace's
# lower tail went to the thumb loops, so it drew in the panel's colour and
# survived every attempt to take the knot off — Scott, third time of asking:
# "it's just a sliver of orange right now with blue a little bit wrapped
# around it." Whatever piece the traced quad touches moves whole, the way the
# knot's own pieces do. Scott, looking at the two bits left over: "the little
# green sliver on the top and the little green sliver on the bottom should be
# added, then you have the complete lace" — so the whole of it goes, and the
# back view is left with no thumb loops to colour, which is the truth of it.
REASSIGN = [
    {"polys": [[(690, 623), (828, 761), (828, 808), (690, 680)],
               [(785, 608), (812, 608), (812, 665), (785, 665)]],
     "from": "thumb_loops", "to": "laces"},
    # A 365 px scrap of the welt seam, where it runs down the index finger
    # into the binding, segmented as lacing. In the lace colour on top of the
    # welt in the same colour it is invisible — until a finger pad is fitted.
    # Then the pad covers the welt, the lacing draws after the pad, and it is
    # a floating blue dot in the middle of the leather. Scott: "it's also
    # showing like a little dot on the bottom of the finger pad... which looks
    # goofy."
    {"polys": [[(478, 735), (500, 735), (500, 782), (478, 782)]],
     "from": "laces", "to": "welting"},
]

# Colourways SSK has actually built, read off the photographs in their Drive
# folder rather than invented. Every one of them is the same shape: all the
# leather including the WEB takes the first colour, and the welting, laces,
# binding and loops take the second -- that is what SE-1175-NAV-COL,
# SE-1275-PIN-WHI, SE-1200-BLA-GRE and SE-1250-SAL-MIN all do.
#
# Where the order form does not offer the colour the glove has, the nearest
# one it does offer is used and only there: SSK stitches in 14 colours and
# embroiders in 25, so Columbia stitching and Grey embroidery cannot be
# ordered even though those gloves wear them.
PRESETS = {
    "Navy / Columbia": {"_panels": "70", "welting": "65", "laces": "65",
                        "binding": "65", "lining": "70", "thumb_loops": "65",
                        "pinky_loops": "65", "embroidery": "95",
                        "stitching": "10"},
    "Pink / White": {"_panels": "25", "welting": "10", "laces": "10",
                     "binding": "10", "lining": "25", "thumb_loops": "10",
                     "pinky_loops": "10", "embroidery": "10",
                     "stitching": "10"},
    "Black / Grey": {"_panels": "90", "welting": "93", "laces": "93",
                     "binding": "93", "lining": "90", "thumb_loops": "93",
                     "pinky_loops": "93", "embroidery": "95",
                     "stitching": "93"},
    "Salmon / Mint": {"_panels": "49", "welting": "52", "laces": "52",
                      "binding": "52", "lining": "49", "thumb_loops": "52",
                      "pinky_loops": "52", "embroidery": "52",
                      "stitching": "10"},
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


# Zones that are not a panel facing the light. The hand opening is a hole you
# look through into a shadowed cavity, and normalising it to its own midtone —
# which is what every panel wants — clips the whole thing to white and paints a
# flat oval. Its real luminance is 0.35x the glove's; `depth` is how much of
# that darkness to keep, traded against being able to read the colour you
# picked. 1.0 is the photograph, 0.0 is the flat oval it used to be.
CAVITY = {"lining": 0.62}


def tint_base(img, flatten=0.0, ref=None, depth=1.0):
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
    if ref:
        # Measure against the glove instead of against itself, so a cavity
        # stays dark relative to the leather around it rather than being
        # renormalised up to full strength.
        k = med / max(ref, 1.0)
        med = med / max(1.0 - depth + depth * k, 1e-3)
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


def wrist_patch(belt, logo):
    """The wrist patch's real footprint, read off the belt photograph.

    The bullet_logo layer that came out of the cut is clipped along its
    bottom edge: it holds the upper arm of the S and loses the lower one.
    Fitting every badge to that footprint put it 8 degrees too steep and a
    quarter too short, and the part of the photographed patch it did not
    cover stayed behind in the belt as a pale shape beside every colourway.
    The patch on the master glove has a blue border, and the belt's leather
    is nowhere near that hue, so the border closed and filled is the whole
    patch. Returns None when there is no such border to read.
    """
    if belt is None or logo is None:
        return None
    import cv2 as _cv
    a = np.asarray(belt)
    vis = a[..., 3] > 40
    hsv = _cv.cvtColor(np.ascontiguousarray(a[..., :3]), _cv.COLOR_RGB2HSV)
    h, sat, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    blue = (h >= 95) & (h <= 125) & (sat > 80) & (v > 50) & vis
    if blue.sum() < 300:
        return None
    k = _cv.getStructuringElement(_cv.MORPH_ELLIPSE, (9, 9))
    closed = _cv.morphologyEx(blue.astype(np.uint8), _cv.MORPH_CLOSE, k) > 0
    filled = ndimage.binary_fill_holes(closed)
    la = np.asarray(logo)[..., 3] > 40
    lab, n = ndimage.label(filled)
    if n == 0:
        return None
    best = max(range(1, n + 1), key=lambda i: int((lab == i)[la].sum()))
    mask = lab == best
    if (la & mask).sum() < 0.5 * la.sum():
        return None
    # the patch as a layer of its own: the belt's pixels under a feathered
    # copy of the outline, standing in for the clipped cut
    out = a.copy()
    soft = ndimage.gaussian_filter(mask.astype(np.float32), 0.8)
    out[..., 3] = (np.clip(soft, 0, 1) * 255).astype(np.uint8)
    # and the leather healed under it, so a badge that does not cover the
    # photographed patch to the pixel has plain leather beside it
    hole = ndimage.binary_dilation(mask, iterations=5) & vis
    healed = a.copy()
    healed[..., :3] = _cv.inpaint(np.ascontiguousarray(a[..., :3]),
                                  hole.astype(np.uint8) * 255, 6,
                                  _cv.INPAINT_TELEA)
    print(f"wrist patch: {int(la.sum())} px in the cut -> "
          f"{int(mask.sum())} px read off the belt; leather healed under it")
    return {"mask": mask, "logo": Image.fromarray(out, "RGBA"),
            "belt": Image.fromarray(healed, "RGBA")}


def fit_badge(badge, mask):
    """Rotation, uniform scale and position that lay a photographed badge
    over the patch footprint. Each badge was shot at its own tilt, and the
    footprint's min-area rectangle is not the badge's bounding box, so
    resizing one into the other stretched every badge and turned it too
    far. This searches the angle and the scale for the best overlap and
    keeps the badge's own aspect.
    """
    ys, xs = np.nonzero(mask)
    tcy, tcx = ys.mean(), xs.mean()
    area = float(mask.size and mask.sum())
    H, W = mask.shape
    small = badge.resize((max(badge.width // 4, 1), max(badge.height // 4, 1)),
                         Image.LANCZOS).split()[3]

    def place(theta, s, dx=0, dy=0, src=small):
        rot = src.rotate(theta, expand=True, resample=Image.BILINEAR)
        ra = np.asarray(rot) > 127
        if not ra.any():
            return None, 0.0
        k = np.sqrt(area / ra.sum()) * s
        sz = (max(int(round(rot.width * k)), 1), max(int(round(rot.height * k)), 1))
        sc = np.asarray(rot.resize(sz, Image.BILINEAR)) > 127
        cy, cx = [c.mean() for c in np.nonzero(sc)]
        x0, y0 = int(round(tcx + dx - cx)), int(round(tcy + dy - cy))
        canvas = np.zeros((H, W), bool)
        sy0, sx0 = max(-y0, 0), max(-x0, 0)
        ey, ex = min(sz[1], H - y0), min(sz[0], W - x0)
        if ey <= sy0 or ex <= sx0:
            return None, 0.0
        canvas[y0 + sy0:y0 + ey, x0 + sx0:x0 + ex] = sc[sy0:ey, sx0:ex]
        iou = (canvas & mask).sum() / max((canvas | mask).sum(), 1)
        return (theta, s, dx, dy), iou

    best, biou = None, -1.0
    for theta in np.arange(-60, 31, 2.0):
        for s in (0.94, 0.97, 1.0, 1.03, 1.06):
            cand, iou = place(theta, s)
            if iou > biou:
                best, biou = cand, iou
    th0, s0 = best[0], best[1]
    for theta in np.arange(th0 - 3, th0 + 3.01, 0.5):
        for s in np.arange(s0 - 0.03, s0 + 0.031, 0.01):
            cand, iou = place(theta, s)
            if iou > biou:
                best, biou = cand, iou
    th0, s0 = best[0], best[1]
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            cand, iou = place(th0, s0, dx, dy)
            if iou > biou:
                best, biou = cand, iou
    return best, biou


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
    """How strong a specular layer is: its 75th and 95th percentiles.

    Two numbers, not one. The peak alone does not describe a sheen — the
    calibration glove's highlights are small and fierce (median 1, p95 49,
    p99 158) while a flash-lit web photograph is lifted evenly all over
    (median 3, p75 40 against the glove's 14) for the same p95. Matching the
    peak leaves the second one looking varnished, which is the shine Scott
    kept seeing on the Closed Diamond Net after the first fix.
    """
    if img is None:
        return None
    a = np.asarray(img).astype(np.float32)
    m = a[..., 3] > 0
    if not m.any():
        return None
    v = (a[..., :3] @ LUMA)[m]
    return (float(np.percentile(v, 75)), float(np.percentile(v, 95)))


def match_sheen(sp, target):
    """Scale a specular layer to the sheen of the layer it replaces.

    The calibration glove was shot in flat light; the web photographs were
    shot with a phone flash, so their highlights sit far above their own
    midtone and the specular pass comes out four times as strong. Added with
    `lighter`, that is what reads as wet-looking plastic rather than leather.
    Whichever of the broad level and the peak is further out sets the scale,
    so neither ends up above the glove's own.
    """
    have = sheen_p95(sp)
    if sp is None or not target or not have:
        return sp
    ks = [t / h for t, h in zip(target, have) if h > 1]
    if not ks:
        return sp
    a = np.asarray(sp).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] * min(ks), 0, 255)
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

    _raw = {}

    def raw(name):
        p = layers / f"{name}.png"
        if not p.exists():
            return None
        if name not in _raw:
            im = Image.open(p).convert("RGBA")
            w = int(im.width * args.height / im.height)
            _raw[name] = im.resize((w, args.height), Image.LANCZOS)
        return _raw[name]

    def _moves():
        """Pieces to hand from one zone to another: see REASSIGN."""
        import cv2 as _c
        out = []
        for r in REASSIGN:
            src = raw(r["from"])
            if src is None:
                continue
            a = np.asarray(src)[..., 3] > 90
            m = np.zeros(a.shape, np.uint8)
            for poly in r["polys"]:
                _c.fillPoly(m, [np.array(poly, np.int32)], 1)
            lbl, n = ndimage.label(a)
            hit = np.unique(lbl[a & m.astype(bool)])
            hit = hit[hit > 0]
            if not len(hit):
                continue
            take = np.isin(lbl, hit)
            out.append((r["from"], r["to"], take))
            print(f"reassigned: {int(take.sum())} px "
                  f"{r['from']} -> {r['to']}")
        return out

    MOVES = _moves()

    def load(name):
        im = raw(name)
        if im is None or not MOVES:
            return im
        arr = None
        for frm, to, take in MOVES:
            if name == frm:
                arr = np.asarray(im).copy() if arr is None else arr
                arr[..., 3][take] = 0
            elif name == to:
                donor = raw(frm)
                if donor is None:
                    continue
                arr = np.asarray(im).copy() if arr is None else arr
                arr[take] = np.asarray(donor)[take]
        return im if arr is None else Image.fromarray(arr, "RGBA")

    glove = load("glove")
    W, H = glove.size
    patch = wrist_patch(load("belt"), raw("bullet_logo"))
    # neutral-leather base: any pixel not covered by a zone shows as plain
    # leather instead of leaking the calibration glove's rainbow colors
    # the whole glove's midtone, so a cavity can be measured against the
    # leather around it rather than against itself
    glove_med = _luma(glove)[2]
    gb = np.asarray(tint_base(glove)).astype(np.float32)
    neutral = np.array([200, 160, 106], np.float32) / 255.0
    gb[..., :3] = gb[..., :3] * neutral
    glove_neutral = Image.fromarray(gb.astype(np.uint8), "RGBA")
    assets = {"glove": to_data_uri(glove_neutral, quality=88, method=4)}
    zones = []
    swap_zones = {}     # zone -> its knot-footprint heal, for swapped webs
    emb_mark = None
    idmap = np.zeros((H, W), np.uint8)
    for i, (name, group, label) in enumerate(STACK, 1):
        im = load(name)
        if name == "belt" and patch:
            im = patch["belt"]
        if im is None:
            continue
        alpha = np.asarray(im)[..., 3]
        # empty at this angle (back9), or emptied by REASSIGN (thumb_loops).
        # Judged on solid pixels: a zone handed away leaves a fringe of soft
        # ones behind, and a zone that is only fringe paints nothing while
        # still offering a colour to change.
        if (alpha > 90).sum() < 200:
            continue
        spec_src = im
        if name == "embroidery":
            clean_mark = (ssk_logo_layer(load("back78"), im)
                          or ssk_wordmark(im, args.height))
            # The synthesised mark carries its own thread-ridge shading, and
            # it went out unnormalised: its midtone sat at 196, so a multiply
            # rendered every embroidery colour 23% dark -- #1D3A8F came out
            # #162C6D. That is the same trap tint_base() was written for, so
            # the mark goes through it too, and the ridges it clips off come
            # back through spec_base like every other layer's highlight.
            spec_src = clean_mark if clean_mark is not None else im
            tb = tint_base(spec_src)
            emb_mark = tb
        elif name in CAVITY:
            # Not a panel: a hole into the glove. Flattening it (which is what
            # this used to do, at 0.85) is what made the hand opening read as
            # a flat oval — the last of the three gaps the README listed.
            tb = tint_base(im, ref=glove_med, depth=CAVITY[name])
        else:
            tb = tint_base(im)
        assets[name] = to_data_uri(tb, quality=85, method=4)
        # the highlight the tint cannot reproduce, added back over the colour.
        # A cavity has none to add back; the embroidery does, and getting it
        # was the point of running the mark through tint_base above.
        if name not in CAVITY:
            sp = spec_base(spec_src)
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
        # And anything lying inside the opening itself, whatever it scored on
        # those two tests. 6,507 px of rim lacing was being kept as the
        # glove's, and it drew straight over every swapped web — Scott: "the
        # other web is still showing below the new webs." Punching it was not
        # enough, because the punch runs before the zones and `laces` simply
        # painted it back.
        import sys as _s
        _s.path.insert(0, str(pathlib.Path(__file__).parent.parent))
        from make_web import aperture as _apf
        _ap = _apf(height=args.height)
        # But a piece the web claims is only the web's WHERE IT CROSSES THE
        # OPENING. The lace loops over the index finger's tip scored well
        # enough on both tests to be taken whole, and they are not web lacing
        # at all — they are the finger's, common to every web. Taken away and
        # never put back, they left 289 px of bare page at the top of the
        # finger on all four webs. The stretch that runs out onto the glove
        # goes back to `laces`; both halves take the lace colour, so a piece
        # split between them is invisible unless a web declines its lacing,
        # which is exactly when the split is wanted.
        # Whole pieces, not fragments. A lace that only clips the edge of the
        # opening is the glove's; one that runs through it is the web's. The
        # two tails that hang off the rim beside the little finger clip it by
        # a few hundred pixels each, and taking just that much of them left a
        # lace-shaped hole in the middle of a tail on every swapped web.
        _keep = np.zeros_like(la)
        for _i in range(1, n + 1):
            _piece = lbl == _i
            _sz = _piece.sum()
            if _sz and (_piece & _ap).sum() / _sz >= 0.5:
                _keep |= _piece
        inside = (inside & ndimage.binary_dilation(
            _ap, np.ones((3, 3), bool), iterations=12)) | _keep
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
            if KNOT_POLYS:
                import cv2 as _cv
                traced = np.zeros(la.shape, np.uint8)
                for poly in KNOT_POLYS:
                    _cv.fillPoly(traced, [np.array(poly, np.int32)], 1)
                hit = np.unique(lbl[la & traced.astype(bool)])
                cand = np.unique(np.concatenate([cand, hit[hit > 0] - 1]))
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
                #
                # Only where it lies over the glove, though. The knot hangs
                # off the rim into open air, and a panel grown out there is a
                # lace-shaped tongue of leather floating beside the glove —
                # the same ghost in a different colour, which is what Scott
                # kept seeing after the first fix. Those pixels have nothing
                # behind them, so they are cut away instead: see knot_cut.
                zmask, zname = {}, {}
                occupied = np.zeros(knot.shape, np.int32)
                zu = np.zeros(knot.shape, bool)
                for _zn, _g2, _l2 in STACK:
                    _zim = load(_zn)
                    if _zim is not None:
                        zu |= np.asarray(_zim)[..., 3] > 90
                # Is there glove behind this bit of knot? Ask it the way the
                # eye does: look along a line and see whether leather lies on
                # both sides. A closing with a long line finds exactly that,
                # and four directions is enough — where the knot crosses the
                # middle of the glove it is bridged every way, and where it
                # hangs off the rim it is bridged none. Filling holes cannot
                # be used for this: it worked only while the knot's footprint
                # was fully enclosed, and the tail down to the heel opens it
                # to the background, which turned the whole knot into air.
                L = 71
                lines = [np.ones((1, L), bool), np.ones((L, 1), bool),
                         np.eye(L, dtype=bool), np.fliplr(np.eye(L, dtype=bool))]
                free = zu & ~knot
                body = np.zeros_like(free)
                for se in lines:
                    body |= ndimage.binary_closing(free, se)
                core = knot & ~body
                # plus the soft edge the knot has in the neutral base, which
                # belongs to no zone and would otherwise stay behind as a
                # pencil outline of the knot that was removed
                over = knot & body
                # ...and the collar must not reach into it: the panels are
                # about to grow there, and cutting what they grow leaves the
                # hole the growing was for.
                air = core | (ndimage.binary_dilation(
                    core, np.ones((3, 3), bool), iterations=8) & ~zu & ~over)
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
                native_med = {}     # the midtone each shipped panel was cut at
                for zi, zn in zname.items():
                    add = over & (owner == zi)
                    if add.sum() < 200:
                        continue
                    zim = load(zn)
                    arr = np.asarray(zim).copy()
                    # Carry the panel's own leather in rather than painting
                    # the patch flat: every new pixel takes the nearest real
                    # one, then the seam is softened. A slab at the zone's
                    # median reads as paint next to grain, and the knot's
                    # footprint is wide enough to see.
                    jy, jx = ndimage.distance_transform_edt(
                        ~zmask[zn], return_indices=True,
                        return_distances=False)
                    arr[..., :3][add] = arr[..., :3][jy[add], jx[add]]
                    arr[..., 3][add] = 255
                    soft = ndimage.uniform_filter(
                        arr[..., :3].astype(np.float32), size=(5, 5, 1))
                    inner = ndimage.binary_erosion(add, np.ones((3, 3), bool))
                    arr[..., :3][inner] = soft[inner].astype(np.uint8)
                    filled = Image.fromarray(arr, "RGBA")
                    native_med[zn] = _luma(filled)[2]
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

                # The heal above copies each footprint pixel from the nearest
                # pixel the panel owns — and where the segmentation had
                # already given the panel the lace's own pixels, that is the
                # pixel itself. Back 3 claims the strap where it crosses the
                # index finger and back 2 the tail below the knot, so under a
                # swapped web, with the knot no longer drawn over them, both
                # showed the calibration glove's strap in the body colour: a
                # diagonal bar on the finger and a strap-shaped piece by the
                # heel. On the native H-web the knot covers it, which is why
                # it went unseen.
                #
                # So each panel the footprint touches gets a patch, laid over
                # it only when a web is swapped: every footprint pixel the
                # panel owns — and the strap's soft edge two pixels round it —
                # filled from the panel's own leather outside the footprint.
                # Nothing outside the panel's outline, and the native layers
                # are left byte for byte as they were.
                #
                # The strap also casts a shadow on the leather below it, a few
                # pixels wide and outside the lace's own outline; left in, the
                # fill copied it into half the footprint and a grey bar stayed
                # where the strap had been. A cast shadow is leather darker
                # than the panel round it, with the panel's own hue, joined to
                # the lace and within a few pixels of it — which a stitched
                # seam, farther off and its own colour, is not.
                import cv2 as _cv2
                ring = ndimage.binary_dilation(knot, np.ones((3, 3), bool),
                                               iterations=2)
                near = ndimage.binary_dilation(knot, np.ones((3, 3), bool),
                                               iterations=8)
                far = ndimage.binary_dilation(knot, np.ones((3, 3), bool),
                                              iterations=12)
                for zi, zn in zname.items():
                    za = zmask[zn]
                    zim = load(zn)
                    arr = np.asarray(zim).copy()
                    rgb = arr[..., :3].astype(np.float32)
                    ref = (za & ~far).astype(np.float32)

                    def local(v, s=10.0):
                        return (_cv2.GaussianBlur(v * ref, (0, 0), s)
                                / np.maximum(_cv2.GaussianBlur(ref, (0, 0), s),
                                             1e-3))
                    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
                    chroma = rgb / np.maximum(rgb.sum(-1, keepdims=True), 1.0)
                    same_hue = np.linalg.norm(
                        chroma - np.dstack([local(chroma[..., c])
                                            for c in range(3)]), axis=-1) < 0.06
                    edge = za & ring & ~knot
                    dark = za & near & ~knot & (lum < 0.75 * local(lum)) & same_hue
                    lbl, _n = ndimage.label(dark | edge)
                    shadow = dark & np.isin(
                        lbl, np.setdiff1d(np.unique(lbl[edge]), [0]))
                    # and its fainter outer edge, only where it continues
                    # that shadow: a 1-2 px line of it otherwise stayed
                    # behind along the strap's old lower edge
                    dim = za & near & ~knot & (lum < 0.90 * local(lum)) & same_hue
                    lbl, _n = ndimage.label(dim | shadow | edge)
                    shadow |= dim & np.isin(
                        lbl, np.setdiff1d(np.unique(lbl[shadow | edge]), [0]))
                    fix = (over & (owner == zi)) | ((edge | shadow) & body)
                    fix |= ndimage.binary_dilation(fix, np.ones((3, 3), bool)) \
                        & za & body & near
                    if fix.sum() < 200:
                        continue
                    # Filled from both sides at once, from the panel's own
                    # leather only: everything that is not real leather is
                    # first given its nearest real pixel, so the fill cannot
                    # pull in the black of a transparent edge, then the
                    # footprint is inpainted from what surrounds it.
                    real = za & ~fix & ~knot
                    jy, jx = ndimage.distance_transform_edt(
                        ~real, return_indices=True, return_distances=False)
                    ext = np.ascontiguousarray(arr[..., :3][jy, jx])
                    hole = ndimage.binary_dilation(fix, np.ones((3, 3), bool))
                    filled_rgb = _cv2.inpaint(ext, hole.astype(np.uint8) * 255, 7,
                                              _cv2.INPAINT_TELEA)
                    arr[..., :3][hole & (za | fix)] = filled_rgb[hole & (za | fix)]
                    arr[..., 3][fix] = 255
                    # Only the footprint, over the shipped panel: everywhere
                    # else the panel is drawn exactly as it always was. Its
                    # tone is cut at the shipped panel's own midtone, so the
                    # patch and the leather round it are one tint, and its
                    # highlight is scaled with the panel's (glove-engine.js).
                    lum_h, _a, _m = _luma(Image.fromarray(arr, "RGBA"))
                    med = native_med.get(zn, _luma(zim)[2])
                    pa = np.where(fix, 255, 0).astype(np.uint8)
                    tb_h = (np.clip(lum_h / max(med, 1.0), 0, 1) * 255.0)
                    key = f"{zn}_knotheal"
                    assets[key] = to_data_uri(Image.fromarray(np.dstack(
                        [tb_h, tb_h, tb_h, pa]).astype(np.uint8), "RGBA"),
                        quality=85, method=4)
                    hi_h = np.clip((lum_h / max(med, 1.0) - 1.0) * 0.55, 0, 1) * 255.0
                    if hi_h[fix].max() >= 4:
                        assets[key + "_hi"] = to_data_uri(Image.fromarray(
                            np.dstack([hi_h, hi_h, hi_h, pa]).astype(np.uint8),
                            "RGBA"), quality=80, method=4)
                    swap_zones[zn] = key
                    print(f"  {zn}: {int(fix.sum())} px of the knot's "
                          f"footprint healed -> {key} (swapped webs only)")
                if air.any():
                    cut = np.zeros(knot.shape + (4,), np.uint8)
                    cut[..., 3] = np.where(air, 255, 0)
                    # lossless: this one is a stencil, and a lossy edge on it
                    # leaves a half-erased fringe of knot behind
                    assets["knot_cut"] = to_data_uri(
                        Image.fromarray(cut, "RGBA"), lossless=True, method=4)
                    print(f"  hanging off the rim: {int(air.sum())} px "
                          "-> knot_cut")
            print(f"web lacing: {inside.sum()} px split off laces -> laces_web")

    # The web's stitching belongs to the web. It is one zone with the glove's,
    # so it was drawn after the punch and put 15,475 px of the old web's
    # seams straight back over the new one — the most visible part of "the
    # other web is still showing". Split on the same rule as the lacing.
    st_im = load("stitching")
    if st_im is not None:
        import sys as _s2
        _s2.path.insert(0, str(pathlib.Path(__file__).parent.parent))
        from make_web import aperture as _apf2
        _ap2 = _apf2(height=args.height)
        sa = np.asarray(st_im)[..., 3] > 90
        in_web = sa & _ap2
        if in_web.sum() > 500:
            def _half(src, keep):
                arr = np.asarray(src).copy()
                arr[..., 3] = np.where(keep, arr[..., 3], 0)
                return Image.fromarray(arr, "RGBA")
            stb, stsp = tint_base(st_im), spec_base(st_im)
            assets["stitching"] = to_data_uri(_half(stb, ~in_web), quality=85,
                                              method=4)
            assets["stitching_web"] = to_data_uri(_half(stb, in_web),
                                                  quality=85, method=4)
            if stsp is not None:
                assets["stitching_hi"] = to_data_uri(_half(stsp, ~in_web),
                                                     quality=80, method=4)
                assets["stitching_web_hi"] = to_data_uri(_half(stsp, in_web),
                                                         quality=80, method=4)
            print(f"web stitching: {int(in_web.sum())} px split off "
                  "stitching -> stitching_web")

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
    # There is no backing layer behind a swapped web, and there should not be.
    # One was built and tried: it hid the ragged edge of a cutout, but it also
    # filled the gaps a web is supposed to have, and an open web that shows no
    # daylight is not an open web. The edges are not ragged any more either —
    # every web is completed out to the opening and clipped to it, and its
    # windows are read off its own photograph. The asset it produced was dead
    # weight in the bundle: nothing had referenced it since.
    web_im = load("web")
    if web_im is not None and any(p.is_dir() for p in web_dir.glob("*")):
        wa = np.asarray(tint_base(web_im)).copy()
        # The punch that removes the stock web has to be a HARD stencil. Drawing
        # the web layer itself into destination-out removes it in proportion to
        # its own alpha, so every antialiased edge pixel is only partly taken
        # away — and what survives is dark web leather, which reads as a black
        # rim round the whole opening on every swapped web. The stock H-web
        # never shows it because nothing is punched. Hardened and grown a
        # couple of pixels, the edge goes cleanly.
        # Everything the stock web assembly occupies, not just its leather.
        # Scott, looking at a swapped web: "the other web is still showing
        # below the new webs... the web from the rainbow glove is absolutely
        # 100 percent perfect so you can completely remove that part." The
        # 6,507 px that kept showing through were the rim lacing, which had
        # been split off as general `laces` rather than as web lacing, so the
        # punch never saw it. Anything laced inside the opening belongs to the
        # web that is being replaced. The knotted lace is unaffected: it draws
        # after the punch, on top, which is where it sits on the glove.
        import sys as _sys
        _sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
        from make_web import aperture as _aperture
        _ap = _aperture(height=args.height)
        _lace_all = np.asarray(lac)[..., 3] > 90 if lac is not None else \
            np.zeros(wa.shape[:2], bool)
        # Grown, but only inwards. The two pixels of growth are there to take
        # the stock web's antialiased edge with it; outside the opening there
        # is no new web to repaint what they remove, so they left a pale
        # hairline of page showing down the seam between the web and the index
        # finger — 2,500 to 3,400 px of it per web, which is the "background
        # between the pieces of leather". The stock assembly itself is punched
        # in full wherever it lies; only the ring is held to the opening.
        _stock = ((np.asarray(web_im)[..., 3] > 24)
                | (web_lace_mask if web_lace_mask is not None
                   else np.zeros(wa.shape[:2], bool))
                | (_lace_all & _ap))
        _ring = ndimage.binary_dilation(_stock, np.ones((3, 3), bool),
                                        iterations=2)
        hard = _stock | (_ring & ndimage.binary_dilation(
            _ap, np.ones((3, 3), bool), iterations=2))
        cut = np.zeros(wa.shape[:2] + (4,), np.uint8)
        cut[..., 3] = np.where(hard, 255, 0)
        assets["web_cut"] = to_data_uri(Image.fromarray(cut, "RGBA"),
                                        lossless=True, method=4)
        print(f"web punch stencil: {int(hard.sum())} px -> web_cut")
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
                # Feathering extends alpha into formerly transparent pixels.
                # Extend real strip colour there first, rather than revealing
                # black/background RGB as a dark seam between photographs.
                solid = a[..., 3] > 200
                if solid.any():
                    iy, ix = ndimage.distance_transform_edt(
                        ~solid, return_indices=True, return_distances=False)
                    a[..., :3] = a[..., :3][iy, ix]
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
    pad_under = None
    _pim = None
    for _part in ("pad", "hood"):
        _f = (pathlib.Path(__file__).parent.parent / "layers" / _part
              / f"{_part}.png")
        if not _f.exists():
            continue
        pim = Image.open(_f).convert("RGBA").resize((W, H), Image.LANCZOS)
        assets[_part] = to_data_uri(tint_base(pim), quality=85, method=4)
        psp = match_sheen(spec_base(pim), sheen_for.get("webfinger"))
        if psp is not None:
            assets[_part + "_hi"] = to_data_uri(psp, quality=80, method=4)
        print(f"finger {_part}: "
              f"{(np.asarray(pim)[..., 3] > 90).sum()} px -> {_part}")
        # the pad is the smaller of the two and sets where the binding is
        # redrawn; the hood reaches further down but tucks under the same band
        if _pim is None:
            _pim = pim
    if _pim is not None:
        pim = _pim
        # Where the pad's lower end genuinely disappears under the binding.
        #
        # The engine draws the binding and the lining back over the pad for
        # that, and drawing all of either brought a 2,158 px spur of welt seam
        # back with it — the segmentation put the last stretch of the welt,
        # where it runs down into the binding, on the binding's layer. On the
        # pad that reads as a detached blue dot poking up out of the leather.
        # Scott: "it's also showing like a little dot on the bottom of the
        # finger pad... which looks goofy."
        #
        # The band itself is 130 px wide across the pad's columns and the spur
        # is 11; taking the first row where the band is solid separates them
        # without a hand-picked number. The redraw is clipped to that row and
        # below.
        _padm = np.asarray(pim)[..., 3] > 90
        if _padm.any():
            _py, _px = np.nonzero(_padm)
            _band = np.zeros(_padm.shape, bool)
            for _n in ("binding", "lining"):
                _l = load(_n)
                if _l is not None:
                    _band |= np.asarray(_l)[..., 3] > 90
            _cols = _band[:, _px.min():_px.max() + 1]
            _solid = [int(y) for y in range(_py.min(), _py.max() + 1)
                      if _cols[y].sum() >= 60]
            pad_under = [int(_px.min()), _solid[0] if _solid else int(_py.max()),
                         int(_px.max()) + 1, H]
            print(f"pad tucks under the binding from y={pad_under[1]} "
                  f"(the band is solid there; the welt spur above it is not)")

    emb_parts = []
    # From the mark that is actually drawn, not the raw layer. The raw
    # segmentation has the four letters bridged into one blob; the warped
    # glyph that replaces it has them apart, which is the whole point here.
    _e = emb_mark if emb_mark is not None else load("embroidery")
    if _e is not None:
        _m = np.asarray(_e)[..., 3] > 90
        _l, _n = ndimage.label(_m, structure=np.ones((3, 3)))
        for _i in range(1, _n + 1):
            _ys, _xs = np.nonzero(_l == _i)
            if _ys.size < 200:
                continue
            emb_parts.append([int(_xs.min()), int(_ys.min()),
                              int(_xs.max()) + 1, int(_ys.max()) + 1])
        emb_parts.sort(key=lambda b: b[1])
        print(f"SSK wordmark: {len(emb_parts)} letters, "
              f"each mirrored about its own centre on a lefty")

    bullet = patch["logo"] if patch else load("bullet_logo")
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
        footprint = patch["mask"] if patch else ba > 60
        COMBO_SLUGS = {"Black/Gold": "blackgold",
                       "Black/Pink": "blackpink", "Black/Purple": "blackpurple",
                       "Black/Silver": "blacksilver", "Red/Green": "redgreen",
                       "Green/Gold": "greengold", "Winered/Gold": "wineredgold",
                       "Blue/Gold": "bluegold", "Navy/Gold": "navygold",
                       "White/Gold": "whitegold", "Red/Gold": "redgold",
                       # Photographed at the store, not recoloured: the rainbow
                       # patch is four threads and a blue border, and no tint
                       # of the black/gold patch could say that.
                       "Rainbow": "rainbow"}
        badge_files = {"edge_gold": "edge_gold_badge.png",
                       "edge_silver": "edge_silver_badge.png",
                       "edge_gunmetal": "edge_gunmetal_badge.png"}
        for slug in COMBO_SLUGS.values():
            badge_files[f"bullet_{slug}"] = f"bullet_{slug}_badge.png"
        # Every embroidered badge is the same patch shape photographed once
        # (the others are recolours of it), so it is fitted once and the
        # fit is shared; the rubber Edge patch is its own shape.
        fits = {}
        import cv2 as _cv2
        for akey, fname in badge_files.items():
            bp = pathlib.Path(__file__).parent / fname
            if not bp.exists():
                continue
            badge = Image.open(bp).convert("RGBA")
            key = ("edge" if akey.startswith("edge_") else "rainbow"
                   if akey == "bullet_rainbow" else "bullet")
            if key not in fits:
                fits[key] = fit_badge(badge, footprint)
                (th, sc, dx, dy), iou = fits[key]
                print(f"  {key} badge fitted: {th:+.1f} deg, scale {sc:.2f}, "
                      f"overlap {iou:.2f}")
            (th, sc, dx, dy), _ = fits[key]
            rot = badge.rotate(th, expand=True, resample=Image.BICUBIC)
            ra = np.asarray(rot)[..., 3] > 127
            k = np.sqrt(footprint.sum() / max(ra.sum(), 1)) * sc
            rot = rot.resize((max(int(round(rot.width * k)), 1),
                              max(int(round(rot.height * k)), 1)),
                             Image.LANCZOS)
            ra = np.asarray(rot)[..., 3] > 127
            cy, cx = [c.mean() for c in np.nonzero(ra)]
            tys, txs = np.nonzero(footprint)
            cxp = int(round(txs.mean() + dx - cx))
            cyp = int(round(tys.mean() + dy - cy))
            canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            sh = np.zeros((H, W), np.float32)
            am = np.asarray(rot)[..., 3] / 255.0
            y0s, x0s = cyp + 4, cxp + 3
            sy0, sx0 = max(-y0s, 0), max(-x0s, 0)
            ey, ex = min(rot.height, H - y0s), min(rot.width, W - x0s)
            if ey > sy0 and ex > sx0:
                sh[y0s + sy0:y0s + ey, x0s + sx0:x0s + ex] = am[sy0:ey, sx0:ex]
            sh = _cv2.GaussianBlur(sh, (0, 0), 4) * 0.45
            shadow = np.zeros((H, W, 4), np.uint8)
            shadow[..., 3] = (sh * 255).astype(np.uint8)
            canvas = Image.alpha_composite(canvas,
                                           Image.fromarray(shadow, "RGBA"))
            canvas.paste(rot, (cxp, cyp), rot)
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

    pal = {"leather": leather_chart(True),
           "lace": leather_chart(True) + [list(GOLD_FOIL)],
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

    # Every highlight layer carries the source photograph's own lighting, so
    # unscaled they disagree by a factor of seven and one chosen colour comes
    # out as several. Measured here rather than tuned: see glove_builder/sheen.py.
    data = {"w": W, "h": H, "zones": zones, "palettes": pal,
            "presets": PRESETS, "bullets": bullets,
            "bulletBox": bullet_box if bullets else None,
            "flagMount": flag_mount, "webs": webs, "sheen": sheen.scales(out),
            # A cavity is meant to come out darker than the colour chosen for
            # it -- it is a hole, not a panel. Recorded so the render check can
            # hold it to that depth instead of failing it for not matching.
            "cavity": CAVITY,
            # The rectangle the binding and lining are redrawn in, over the
            # pad. See "finger pad" above.
            "padUnder": pad_under,
            # One box per letter of the SSK wordmark. A left-handed glove is
            # the mirror of this one, and the mark has to do two things at
            # once on it: sit where the mirror puts it, and still read as
            # SSK. Flipping the mark as a whole about its own centre keeps it
            # readable but keeps its ARC right-handed too — the letters step
            # down the finger the wrong way, across the panel edge — and it
            # lands on top of the mark's own relief, which is baked into the
            # neutral base and does mirror, so a lefty showed two of them.
            # Flipping each letter about its own centre does both: the stack
            # follows the mirrored finger, every letter reads, and each one
            # lands back on its own relief.
            "embParts": emb_parts,
            # zone -> a patch healing the calibration knot's footprint on
            # that panel; the engine lays it over the panel only when a web
            # is swapped, with the panel's colour and sheen
            "knotHeal": swap_zones,
            "assets": assets, "bbox": bbox}
    (out / "glove-data.json").write_text(json.dumps(data, separators=(",", ":")))
    total = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    print(f"wrote {out}/ — {len(assets)} assets + glove-data.json "
          f"({total/1e6:.1f} MB), {len(zones)} recolorable zones, canvas {W}x{H}")


if __name__ == "__main__":
    main()
