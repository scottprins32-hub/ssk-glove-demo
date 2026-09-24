"""Page assets for the thumb-side and pinky-side views, from the zone layers
make_side_views.py cuts.

Same recipe as the palm view (customiser/build_palm.py), read-only reuse of
its tint_base / spec_base / match_sheen and of sheen.py, so a colour renders
the same on every side of the glove. Written into customiser/assets, beside the
palm view's, where the configurator loads them as two more views.

    python glove_builder/build_side_views.py

Writes customiser/assets/side/{thumb,pinky}/*.webp and customiser/assets/
{thumb,pinky}-data.json in the shape GloveRenderer reads for a view (w, h, zones, bbox,
assets, sheen), plus which order field each zone answers and which web the
thumb view photographed.
"""

import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE / "customiser"))
sys.path.insert(0, str(HERE))
from build_assets import match_sheen, sheen_p95, spec_base, tint_base  # noqa: E402
import sheen  # noqa: E402

# Beside the palm view's assets, in the shape the engine loads for a view.
OUT = HERE / "customiser" / "assets"
HEIGHT = 1100
MAX_SPREAD = 2.6      # p95 / p5 of a zone's luminance, at most

# zone id (as the renderer knows it) -> order field, palette group, label.
# The ids are the order fields themselves, except the embroidery, which the
# back view already calls 'embroidery' for the ring_emb field.
ZONES = {
    "web":        ("web", "leather", "Web"),
    "back1":      ("back1", "leather", "Back 1 - thumb wingtip"),
    "back2":      ("back2", "leather", "Back 2 - thumb"),
    "back3":      ("back3", "leather", "Back 3 - index, 1st part"),
    "back4":      ("back4", "leather", "Back 4 - index, 2nd part"),
    "back5":      ("back5", "leather", "Back 5 - middle, 1st part"),
    "back6":      ("back6", "leather", "Back 6 - middle, 2nd part"),
    "back7":      ("back7", "leather", "Back 7 - ring"),
    "back8":      ("back8", "leather", "Back 8 - pinky"),
    "back9":      ("back9", "leather", "Back 9 - pinky wingtip"),
    "palm":       ("palm", "leather", "Palm (seen inside the pocket)"),
    "belt":       ("belt", "leather", "Belt"),
    "binding":    ("binding", "lace", "Binding"),
    "welting":    ("welting", "lace", "Welting"),
    "laces":      ("laces", "lace", "Laces"),
    "embroidery": ("ring_emb", "embroidery", "SSK embroidery"),
    "stitching":  ("stitching", "stitching", "Stitching"),
}
# The order form's colour fields, as customiser/glove-catalog.js COLOUR_ORDER
# lists them (read at build time so the two cannot drift apart).
def order_colour_fields():
    import re
    js = (HERE / "customiser/glove-catalog.js").read_text()
    body = re.search(r"COLOUR_ORDER\s*=\s*\[(.*?)\]", js, re.S).group(1)
    return re.findall(r"'([a-z0-9_]+)'", body)


ORDER_COLOUR_FIELDS = order_colour_fields()
# The web the thumb view was photographed with: the calibration glove's own.
PHOTOGRAPHED_WEB = "H-Web"

# Where the form's embroidered text goes on each side: the panel it is
# stitched on, the order field, and which way the back of the hand lies
# (+1 to the right of the panel on the canvas, -1 to the left). Embroidery
# reads the right way up when the back of the hand is up, which is what the
# photographed SSK mark on the pinky side does: it reads along the finger
# with the tops of its letters toward the back of the hand.
# Then how far the text's centre sits from the panel's centroid toward the
# fingertip (as a share of the panel's length), how much of that length the
# text may use, and the cap height as a share of the panel's width. The thumb
# carries its circle at the heel end, so its text sits higher and shorter.
TEXT_PANELS = {"pinky": ("back9", "pinkyText", +1, 0.00, 0.82, 0.30),
               "thumb": ("back1", "thumbText", -1, 0.10, 0.64, 0.24)}


def text_mount(view, layer):
    """The line the text is laid along, from the panel's own shape.

    The panel's long axis is its first principal direction. The text runs
    along it through the centroid, `length` is most of the panel's extent
    along the axis, and `height` (cap height) is a share of the panel's width
    where the text sits, so a name fills the panel the way an embroidered
    one does without touching its seams.
    """
    zone, field, back_side, shift, use, share = TEXT_PANELS[view]
    a = np.asarray(layer)[..., 3] > 127
    ys, xs = np.nonzero(a)
    c = np.array([xs.mean(), ys.mean()])
    pts = np.c_[xs, ys] - c
    _, _, vt = np.linalg.svd(pts[::5], full_matrices=False)
    axis = vt[0] / np.linalg.norm(vt[0])
    if axis[1] < 0:
        axis = -axis                       # tip to heel, down the canvas
    up = np.array([-axis[1], axis[0]])     # across the finger
    if np.sign(up[0]) != back_side:
        up = -up                           # toward the back of the hand
    along = pts @ axis
    across = pts @ up
    lo, hi = np.percentile(along, [6, 94])
    band = np.abs(along) < 0.1 * (hi - lo)
    w_lo, w_hi = np.percentile(across[band], [3, 97])
    width = float(w_hi - w_lo)
    height = float(min(share * width, 60.0))
    # centred across the panel where the text sits, toward the tip if asked
    mid = c + up * float((w_lo + w_hi) / 2.0) - axis * float(shift * (hi - lo))
    return {"field": field, "zone": zone,
            "cx": round(float(mid[0]), 1), "cy": round(float(mid[1]), 1),
            "ux": round(float(up[0]), 4), "uy": round(float(up[1]), 4),
            "length": round(float(use * (hi - lo)), 1),
            "height": round(height, 1)}


THREAD = {"stitching", "embroidery"}   # matte: no sheen, a narrow range


def settle(img, flatten=0.65, sigma=30.0, max_spread=None):
    """Take most of the window's broad fall-off out of a zone's shading, and
    hold what is left to MAX_SPREAD between its p5 and p95.

    These frames were lit from one side. Tinted, that side-to-side fall-off
    reads as grey blotches on a white or tan glove: the page makes every
    pixel above the zone's median full colour and everything below it
    darker. Dividing out `flatten` of the light averaged over `sigma` px
    keeps creases, seams and the roll of an edge, which are what say the
    leather has a shape, and drops most of which way the window was.
    """
    a = np.asarray(img).astype(np.float32)
    m = a[..., 3] > 200
    if m.sum() < 200:
        return img
    lum = a[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
    own = (a[..., 3] > 40).astype(np.float32)
    log = np.log(np.maximum(lum, 1.0))
    low = (ndimage.gaussian_filter(log * own, sigma)
           / np.maximum(ndimage.gaussian_filter(own, sigma), 1e-3))
    r = log - flatten * (low - float(np.median(low[m])))
    med = float(np.median(r[m]))
    lo, hi = np.percentile(r[m], [5, 95])
    k = min(1.0, np.log(max_spread or MAX_SPREAD) / max(hi - lo, 1e-3))
    new = np.exp(med + k * (r - med))
    a[..., :3] *= (new / np.maximum(lum, 1.0))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def reflect_across_text(img):
    """The lettering reflected across the line it runs along.

    A left-handed glove is the right-handed one mirrored, but its embroidery
    is stitched to read. Mirrored and then reflected across its own text
    line, a word is rotated rather than reversed: it reads, in the same
    order, along the mirrored finger at the mirrored slant."""
    import cv2
    a = np.asarray(img)
    ys, xs = np.nonzero(a[..., 3] > 60)
    c = np.array([xs.mean(), ys.mean()])
    pts = np.c_[xs, ys] - c
    _, _, vt = np.linalg.svd(pts, full_matrices=False)
    d = vt[0] / np.linalg.norm(vt[0])
    R = 2 * np.outer(d, d) - np.eye(2)            # reflection across d
    M = np.c_[R, c - R @ c].astype(np.float32)
    h, w = a.shape[:2]
    pm = a.astype(np.float32)
    pm[..., :3] *= pm[..., 3:4] / 255.0
    out = cv2.warpAffine(pm, M, (w, h), flags=cv2.INTER_LINEAR)
    al = out[..., 3:4] / 255.0
    out[..., :3] = np.where(al > 1e-3, out[..., :3] / np.maximum(al, 1e-3), 0)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def build(view):
    src = HERE / f"layers/side-{view}"
    if not (src / "glove.png").exists():
        raise SystemExit(f"{src}: run make_side_views.py first")
    g = Image.open(src / "glove.png").convert("RGBA")
    W = round(g.width * HEIGHT / g.height)

    glove_src = np.asarray(Image.open(src / "glove.png").convert("RGBA"))[..., 3] > 127

    def load(name):
        a = np.asarray(Image.open(src / f"{name}.png").convert("RGBA")).copy()
        # The layers store no colour outside their zone. Resampled like that,
        # the black outside bleeds into every soft edge and draws a dark
        # hairline along each seam once tinted, so the zone's own edge
        # colour is carried outward first.
        solid = a[..., 3] > 0
        if name in ZONES and ZONES[name][1] == "leather" and solid.any():
            # Leather draws first and runs 2 px on under its neighbours
            # (inside the glove only). Two soft edges meeting at half
            # alpha each cover three quarters of a pixel, and the neutral
            # base showed through that last quarter as a tan hairline down
            # every seam; now whatever draws on top covers the seam fully.
            grown = ndimage.binary_dilation(solid, iterations=2) & glove_src
            a[..., 3] = np.where(grown & ~solid, 255, a[..., 3])
            solid = a[..., 3] > 0
        if solid.any() and not solid.all():
            iy, ix = ndimage.distance_transform_edt(~solid, return_indices=True,
                                                    return_distances=False)
            a[..., :3] = a[..., :3][iy, ix]
        return Image.fromarray(a, "RGBA").resize((W, HEIGHT), Image.LANCZOS)

    out = OUT / "side" / view
    out.mkdir(parents=True, exist_ok=True)
    assets, zones, bbox = {}, [], {}

    def put(name, img, **kw):
        p = out / f"{name}.webp"
        img.save(p, "WEBP", **kw)
        assets[name] = f"assets/side/{view}/{name}.webp"
        a = np.asarray(Image.open(p).convert("RGBA"))[..., 3]
        ys, xs = np.nonzero(a > 8)
        if len(ys):
            bbox[name] = [int(xs.min()), int(ys.min()),
                          int(xs.max()) + 1, int(ys.max()) + 1]

    glove = load("glove")
    fixed = load("fixed")
    # The neutral base, as the back and palm views do it: the glove tinted to
    # its own midtone and multiplied by tan, so a pixel no zone covers reads
    # as leather. The fixed parts (thumb circle, piping, the bullet's edge)
    # are pasted over it in their photographed colours: nothing on the form
    # recolours them.
    gb = np.asarray(tint_base(glove)).astype(np.float32)
    gb[..., :3] *= np.array([200, 160, 106], np.float32) / 255.0
    fa = np.asarray(fixed).astype(np.float32)
    w = (fa[..., 3:4] / 255.0)
    gb[..., :3] = gb[..., :3] * (1 - w) + fa[..., :3] * w
    put("glove", Image.fromarray(gb.astype(np.uint8), "RGBA"), quality=88, method=4)

    layers = {}
    for zid in ZONES:
        f = src / f"{zid}.png"
        if f.exists():
            im = load(zid)
            if (np.asarray(im)[..., 3] > 90).sum() >= 150:
                layers[zid] = settle(im, max_spread=1.8 if zid in THREAD else None)
    if "embroidery" in layers:
        # The left-handed lettering is not in the same place as the mirrored
        # holes it leaves (see reflect_across_text), so the leather it is
        # stitched on carries on underneath, filled from the leather round
        # each letter, and the letters draw on top.
        import cv2
        em = np.asarray(layers["embroidery"])[..., 3] > 20
        hole = ndimage.binary_dilation(em, iterations=3)
        ring = ndimage.binary_dilation(hole, iterations=4) & ~hole
        host = max((z for z in layers if z != "embroidery"),
                   key=lambda z: (np.asarray(layers[z])[..., 3][ring] > 127).sum())
        a = np.asarray(layers[host]).copy()
        a[..., :3] = cv2.inpaint(np.ascontiguousarray(a[..., :3]),
                                 (hole & (a[..., 3] < 128)).astype(np.uint8) * 255,
                                 5, cv2.INPAINT_TELEA)
        a[..., 3] = np.maximum(a[..., 3], (hole * 255).astype(np.uint8))
        layers[host] = Image.fromarray(a, "RGBA")
        print(f"  embroidery over {host}; left-hand lettering reflected across its line")
    seen = [sheen_p95(spec_base(im)) for im in layers.values()
            if spec_base(im) is not None]
    seen = [t for t in seen if t]
    target = (float(np.median([t[0] for t in seen])),
              float(np.median([t[1] for t in seen]))) if seen else None
    idmap = np.zeros((HEIGHT, W), np.uint8)
    for i, (zid, im) in enumerate(layers.items(), 1):
        field, group, label = ZONES[zid]
        put(zid, tint_base(im), quality=85, method=4)
        # Thread is matte. Given a sheen layer, the bright thread against its
        # own dark stitch holes came out as white specks on a tan glove.
        sp = None if zid in THREAD else match_sheen(spec_base(im), target)
        if sp is not None:
            put(zid + "_hi", sp, quality=80, method=4)
        zones.append({"id": zid, "n": i, "group": group, "label": label,
                      "field": field})
        idmap[np.asarray(im)[..., 3] > 127] = i
    if "embroidery" in layers:
        # the letters own their pixels, not the leather beneath them
        k = [z["id"] for z in zones].index("embroidery") + 1
        idmap[np.asarray(layers["embroidery"])[..., 3] > 127] = k
    if "embroidery" in layers:
        lht = reflect_across_text(layers["embroidery"])
        put("embroidery_lht", tint_base(lht), quality=85, method=4)
    Image.fromarray(idmap, "L").save(out / "idmap.png")
    assets["_idmap"] = f"assets/side/{view}/idmap.png"

    fields = {z["field"] for z in zones}
    data = {
        "view": view, "w": W, "h": HEIGHT, "zones": zones, "bbox": bbox,
        "assets": assets, "sheen": sheen.scales(out),
        "source": json.loads((HERE / "runs/side-views/zones.json").read_text())[view]["source"],
        "fieldsShown": sorted(fields),
        "fieldsNotShown": [f for f in ORDER_COLOUR_FIELDS if f not in fields],
    }
    if "embroidery" in layers:
        data["embroideryLHT"] = "embroidery_lht"
    if view in TEXT_PANELS and TEXT_PANELS[view][0] in layers:
        data["textMount"] = text_mount(view, layers[TEXT_PANELS[view][0]])
        print(f"  {data['textMount']['field']} on {data['textMount']['zone']}: "
              f"{data['textMount']}")
    if "web" in layers:
        # What a different web would replace: the web and the lacing that
        # runs through and round it (the rim loops, the knot that holds it),
        # not the glove it is laced to. Used only to mark an unphotographed
        # web; it owns no colour.
        wa = np.asarray(layers["web"])[..., 3] > 127
        region = ndimage.binary_fill_holes(ndimage.binary_closing(
            wa, np.ones((25, 25), bool)))
        region = ndimage.binary_dilation(region, iterations=10)
        mark = wa.copy()
        for part in ("laces", "stitching"):
            if part in layers:
                la = np.asarray(layers[part])[..., 3] > 60
                mark |= la & region
        m = np.zeros((HEIGHT, W, 4), np.uint8)
        m[..., 3] = mark * 255
        put("web_marker", Image.fromarray(m, "RGBA"), lossless=True)
        data["webMarker"] = "web_marker"
        data["webZone"] = "web"
        data["photographedWeb"] = PHOTOGRAPHED_WEB
    (OUT / f"{view}-data.json").write_text(json.dumps(data, indent=1))
    print(f"{view}: {W}x{HEIGHT}, zones {', '.join(z['id'] for z in zones)}")
    return data


def main():
    for view in ("thumb", "pinky"):
        build(view)


if __name__ == "__main__":
    main()
