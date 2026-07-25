"""Refine raw SAM3 zone masks into clean, disjoint, SSK-true layers.

Rules encoded here (from Scott's feedback + the SSK order form):
- Every pixel belongs to exactly one zone; higher-priority zones (laces,
  welting, loops, logos) are subtracted from panels beneath them.
- Finger panels with an internal welting line are split into two half-finger
  zones (back56 -> back5 + back6, back34 -> back3 + back4), assigned by
  position relative to the welting centerline (first part = web side).
- Small specks are dropped and small holes filled.
- An inpainted variant of each panel is written so the builder can show
  continuous leather under laces ("premium" option).

Usage:
    python glove_builder/refine_zones.py --run out/rainbow-back \
        --image glove_builder/images/.../01_2222198493.jpg \
        --zones glove_builder/zones_rainbow_back.json \
        --final glove_builder/layers/rainbow-back
"""

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import morphology

# distinct preview colors chosen to avoid the rainbow glove's own hues
PREVIEW = {
    "back1": (200, 30, 30), "back2": (250, 120, 40), "back3": (240, 200, 40),
    "back4": (150, 220, 60), "back5": (40, 200, 120), "back6": (40, 220, 220),
    "back7": (60, 120, 250), "back78": (60, 120, 250), "back8": (140, 70, 250), "back9": (240, 60, 200),
    "web": (0, 90, 170), "belt": (120, 90, 40), "lining": (90, 90, 90),
    "binding": (255, 160, 160), "bullet_logo": (255, 255, 255),
    "embroidery": (30, 30, 30), "welting": (255, 100, 30),
    "laces": (180, 255, 100), "thumb_loops": (100, 40, 120),
    "pinky_loops": (60, 60, 200), "stitching": (250, 250, 100),
}

# zones eligible for smoothing
SMOOTH_ZONES = {"glove", "back1", "back2", "back3", "back4", "back5", "back6",
                "back7", "back8", "back9", "web", "belt", "lining", "binding",
                "welting", "embroidery", "bullet_logo", "pinky_loops",
                "thumb_loops", "laces", "stitching"}
# thin structures get a gentle profile (a sigma-2 blur would erase 2-3 px
# lace strands and stitch lines) and are never gap-fill targets
THIN_ZONES = {"back1", "back9", "laces", "stitching", "welting",
              "thumb_loops", "pinky_loops"}


SCALE = 1.0  # set in main(); >1 when exporting at high resolution


def smooth_for(name):
    s = SCALE
    if name in THIN_ZONES:
        return dict(sigma=1.0 * s, close=max(3, int(3 * s) | 1),
                    min_size=int(30 * s * s), hole=int(150 * s * s))
    return dict(sigma=2.0 * s, close=max(5, int(5 * s) | 1),
                min_size=int(150 * s * s), hole=int(600 * s * s))


def box_region(box, shape, expand=1.0):
    H, W = shape
    cx, cy, bw, bh = box
    bw, bh = bw * expand, bh * expand
    r = np.zeros(shape, bool)
    r[max(int((cy - bh / 2) * H), 0):int((cy + bh / 2) * H),
      max(int((cx - bw / 2) * W), 0):int((cx + bw / 2) * W)] = True
    return r

SPLITS = {"back56": ("back5", "back6"), "back34": ("back3", "back4")}
# zones that are one physical piece in the customiser (Scott: #8+#9 fuse;
# the embroidery/lace layers stack on top)
MERGE = {"back78": ["back7", "back8"]}
# "first part" (lower SSK number) is the web-side half; on this back-view
# photo the web is to the RIGHT, so right component = first name below.
FIRST_IS_RIGHT = True


def load_masks(raw_dir):
    return {p.stem: np.array(Image.open(p)) > 127 for p in raw_dir.glob("*.png")}


def hsv_mask(hsv_img, rule, box=None, glove=None):
    """Binary mask from an HSV rule [[hmin,hmax],[smin,smax],[vmin,vmax]].
    A hue range with hmin > hmax wraps around 180 (red)."""
    (hmin, hmax), (smin, smax), (vmin, vmax) = rule
    h, s, v = hsv_img[..., 0], hsv_img[..., 1], hsv_img[..., 2]
    if hmin <= hmax:
        m = (h >= hmin) & (h <= hmax)
    else:
        m = (h >= hmin) | (h <= hmax)
    m &= (s >= smin) & (s <= smax) & (v >= vmin) & (v <= vmax)
    if box is not None:
        H, W = m.shape
        cx, cy, bw, bh = box
        bw, bh = bw * 1.25, bh * 1.25  # expand box a bit; hue does the fine work
        region = np.zeros_like(m)
        region[max(int((cy - bh / 2) * H), 0):int((cy + bh / 2) * H),
               max(int((cx - bw / 2) * W), 0):int((cx + bw / 2) * W)] = True
        m &= region
    if glove is not None:
        m &= glove
    return m


def clean(mask, min_size=40):
    m = morphology.remove_small_objects(mask, min_size=min_size)
    m = morphology.remove_small_holes(m, area_threshold=min_size * 4)
    return m


def edge_len(mask):
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_LIST,
                             cv2.CHAIN_APPROX_NONE)
    return int(sum(cv2.arcLength(c, True) for c in cs))


def smooth_mask(mask, sigma=2.0, close=5, min_size=150, hole=600):
    """Round jagged threshold edges: blur+rethreshold, close hairline notches,
    drop specks and pinholes."""
    f = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), sigma)
    m = f > 0.5
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close))
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, k).astype(bool)
    m = morphology.remove_small_objects(m, min_size)
    m = morphology.remove_small_holes(m, hole)
    return m


def fill_from_panel(image, panel, holes, blur_sigma=3.0):
    """Fill hole pixels with the color of the nearest pixel of the SAME panel
    (never neighbors), then blend — reads as continuous leather."""
    src = np.ones(panel.shape, np.uint8)
    src[panel & ~holes] = 0  # zeros = valid panel pixels
    _, labels = cv2.distanceTransformWithLabels(
        src, cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
    valid_idx = np.flatnonzero(src.ravel() == 0)
    # labels are 1-based indices into the list of zero pixels (row-major)
    lut = np.zeros(valid_idx.size + 1, np.int64)
    lut[1:] = valid_idx
    nearest_flat = lut[labels.ravel()]
    filled = image.reshape(-1, 3)[nearest_flat].reshape(image.shape)
    out = image.copy()
    out[holes] = filled[holes]
    sm = cv2.GaussianBlur(out, (0, 0), blur_sigma)
    grow = cv2.dilate(holes.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    out[grow] = sm[grow]
    return out


def export_layer(rgba, mask, path, soft=True):
    """Write an RGBA layer; soft=True gives a ~1px anti-aliased alpha edge."""
    layer = rgba.copy()
    if soft:
        a = np.clip(cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.0), 0, 1)
        hull = a > 0.02
        layer[~hull] = 0
        layer[..., 3] = (a * 255).astype(np.uint8)
    else:
        layer[~mask] = 0
        layer[..., 3] = np.where(mask, 255, 0).astype(np.uint8)
    Image.fromarray(layer, "RGBA").save(path)


def split_panel(panel, welting):
    """Split a finger panel into two halves along the welting that crosses it."""
    cut = panel & ~welting
    n, lab = cv2.connectedComponents(cut.astype(np.uint8))
    comps = [(lab == i) for i in range(1, n)]
    comps = [c for c in comps if c.sum() > 200]
    if len(comps) < 2:
        return None  # welting didn't split it; caller keeps panel whole
    comps.sort(key=lambda c: c.sum(), reverse=True)
    a, b = comps[0], comps[1]
    rest = comps[2:]
    # attach leftover fragments to the nearer big component (by centroid x)
    def cx(c):
        return np.argwhere(c)[:, 1].mean()
    for r in rest:
        if abs(cx(r) - cx(a)) <= abs(cx(r) - cx(b)):
            a = a | r
        else:
            b = b | r
    right, left = (a, b) if cx(a) > cx(b) else (b, a)
    return (right, left) if FIRST_IS_RIGHT else (left, right)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True, help="Run dir containing masks_raw/")
    ap.add_argument("--image", required=True)
    ap.add_argument("--zones", required=True, help="Zone config with priorities")
    ap.add_argument("--final", required=True, help="Output dir for final layers")
    ap.add_argument("--smooth", action="store_true",
                    help="Smooth approved zones and export soft-alpha edges")
    ap.add_argument("--image-hr", default=None,
                    help="High-res version of --image; masks are upsampled "
                         "and all processing/export happens at this size")
    args = ap.parse_args()

    run = Path(args.run)
    final = Path(args.final)
    final.mkdir(parents=True, exist_ok=True)
    cfg = {k: v for k, v in json.loads(Path(args.zones).read_text()).items()
           if not k.startswith("_")}
    masks = load_masks(run / "masks_raw")
    image = np.array(Image.open(args.image).convert("RGB"))
    if args.image_hr:
        lo_w = image.shape[1]
        image = np.array(Image.open(args.image_hr).convert("RGB"))
        H, W = image.shape[:2]
        global SCALE
        SCALE = W / lo_w
        masks = {k: cv2.resize(v.astype(np.uint8) * 255, (W, H),
                               interpolation=cv2.INTER_LINEAR) > 127
                 for k, v in masks.items()}
        print(f"high-res mode: {W}x{H} (scale {SCALE:.2f})")
    rgba = np.dstack([image, np.full(image.shape[:2], 255, np.uint8)])

    glove = masks.pop("glove", None)
    stitching = masks.pop("stitching", None)  # kept as decoration, not a zone

    # 0a. the SAM3 glove mask can spill onto the white studio background
    # (visible as tinted bars above/below the glove) — carve background out
    hsv_pre = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    if glove is not None:
        white_bg = (hsv_pre[..., 1] < 45) & (hsv_pre[..., 2] > 130)
        spill = int((glove & white_bg).sum())
        glove &= ~white_bg
        glove = morphology.remove_small_holes(
            morphology.remove_small_objects(glove, int(400 * SCALE * SCALE)),
            int(2500 * SCALE * SCALE))
        if spill:
            print(f"glove background carve: {spill} px removed")

    # 0. hue rescue: zones with an "hsv" rule are rebuilt from color + box +
    # glove — on this calibration glove every zone has a distinct color, and
    # the pink welts fall outside panel hue ranges so half-fingers separate
    # naturally.
    hsv_img = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    for name, zcfg in cfg.items():
        if "hsv" not in zcfg:
            continue
        box = zcfg.get("boxes", [None])[0]
        m = hsv_mask(hsv_img, zcfg["hsv"], box=box, glove=glove)
        for b in zcfg.get("include_boxes", []):
            m |= hsv_mask(hsv_img, zcfg["hsv"], box=b, glove=glove)
        for b in zcfg.get("exclude_boxes", []):
            m &= ~box_region(b, m.shape)
        # a neighbouring panel's hue can never belong to this zone; this keeps
        # the anti-aliased seam between two panels from bleeding either way
        for rule in zcfg.get("exclude_hsv", []):
            m &= ~hsv_mask(hsv_img, rule)
        m = clean(m, min_size=int(80 * SCALE * SCALE))
        if m.any():
            masks[name] = m
            print(f"hue rescue: {name} -> {m.mean()*100:.1f}%")
        else:
            print(f"hue rescue FAILED for {name}; keeping SAM3 mask")

    # 0b. lace crossings inside the wrist opening belong to the laces layer,
    # not the lining (Scott: two pink pieces visible in the opening)
    if "lining" in cfg and "laces" in masks:
        pink = [[160, 179], [35, 130], [140, 255]]
        lin_box = cfg["lining"]["boxes"][0]
        crossings = hsv_mask(hsv_img, pink, box=lin_box, glove=glove)
        crossings = clean(crossings, min_size=int(60 * SCALE * SCALE))
        if crossings.any():
            masks["laces"] |= crossings
            if "lining" in masks:
                masks["lining"] &= ~crossings
            print(f"lining lace carve: {int(crossings.sum())} px -> laces")

    # 1. split combined finger panels along the welting
    welting = masks.get("welting", np.zeros(image.shape[:2], bool))
    # welts SAM3 missed: pink pixels inside the finger-panel boxes
    panel_boxes = [cfg[z]["boxes"][0] for z in
                   ("back8", "back7", "back56", "back34") if z in cfg]
    pink = [[160, 179], [35, 130], [140, 255]]
    for box in panel_boxes:
        welting |= hsv_mask(hsv_img, pink, box=box, glove=glove)
    masks["welting"] = clean(welting, min_size=30)
    for combo, (first, second) in SPLITS.items():
        if combo not in masks:
            continue
        res = split_panel(masks[combo], welting)
        if res is None:
            print(f"WARN: welting did not split {combo}; keeping whole as {first}")
            masks[first] = masks.pop(combo)
        else:
            masks[first], masks[second] = res
            masks.pop(combo)
            print(f"split {combo} -> {first} (web side) + {second}")

    # 2. priority subtraction: higher priority owns the pixel
    prio = {}
    for name in masks:
        base = name[:-1] if name[:-1] in cfg else name
        prio[name] = cfg.get(name, cfg.get(base, {})).get("priority", 2)
    order = sorted(masks, key=lambda n: -prio[n])
    taken = np.zeros(image.shape[:2], bool)
    finals = {}
    for name in order:
        m = masks[name] & ~taken
        if glove is not None and name not in ("laces",):
            m &= glove  # zones live on the glove; laces may dangle outside
        m = clean(m)
        finals[name] = m
        taken |= m

    # 2b. smoothing pass for the approved zones
    edge_metrics = {}
    if args.smooth:
        if glove is not None:
            e0 = edge_len(glove)
            glove = smooth_mask(glove)
            edge_metrics["glove"] = (e0, edge_len(glove))
        for name in order:
            if name not in SMOOTH_ZONES:
                continue
            e0 = edge_len(finals[name])
            finals[name] = smooth_mask(finals[name], **smooth_for(name))
            edge_metrics[name] = (e0, edge_len(finals[name]))
        # smoothing may re-introduce overlaps: enforce the partition again
        taken = np.zeros(image.shape[:2], bool)
        for name in order:
            m = finals[name] & ~taken
            if glove is not None and name not in ("laces",):
                m &= glove
            finals[name] = m
            taken |= m
        # fill hairline gaps between smoothed zones: assign unclaimed glove
        # pixels to the nearest smoothed zone (within 12 px)
        smoothed = [n for n in order
                    if n in SMOOTH_ZONES - THIN_ZONES and finals[n].any()]
        if glove is not None and smoothed:
            gap = glove & ~taken
            dists = np.stack([
                cv2.distanceTransform((~finals[n]).astype(np.uint8),
                                      cv2.DIST_L2, 3) for n in smoothed])
            nearest, mind = np.argmin(dists, 0), np.min(dists, 0)
            fill = gap & (mind <= 20 * SCALE)
            for i, n in enumerate(smoothed):
                finals[n] |= fill & (nearest == i)
            print(f"gap-fill: {int(fill.sum())} px reassigned")

    # 2c. fuse zones that are one physical piece in the customiser; the welt
    # running between the fused parts belongs to the piece (only its short
    # lower section is real welting on the physical glove)
    merge_internal = {}
    merge_parts = {}
    for new, parts in MERGE.items():
        pieces = [finals.pop(p) for p in parts if p in finals]
        if pieces:
            m = np.zeros(image.shape[:2], bool)
            for x in pieces:
                m |= x
            if len(pieces) == 2 and "welting" in finals:
                kd = np.ones((int(10 * SCALE) | 1,) * 2, np.uint8)
                near_both = (cv2.dilate(pieces[0].astype(np.uint8), kd) &
                             cv2.dilate(pieces[1].astype(np.uint8), kd)) > 0
                internal = finals["welting"] & near_both
                merge_internal[new] = internal
                m |= internal
                finals["welting"] = finals["welting"] & ~internal
            merge_parts[new] = pieces
            finals[new] = m
            print(f"merged {'+'.join(parts)} -> {new}")

    # 3. verification
    inter_fail = []
    names = list(finals)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            if (finals[names[i]] & finals[names[j]]).any():
                inter_fail.append((names[i], names[j]))
    assert not inter_fail, f"overlapping zones: {inter_fail}"
    coverage = None
    if glove is not None:
        union = np.zeros_like(taken)
        for m in finals.values():
            union |= m
        coverage = float((union & glove).sum() / max(glove.sum(), 1))

    # 3c. a zone may not keep pixels carrying a neighbouring panel's hue.
    # This runs on the final masks (not on the hull at export time) so the
    # pixels are genuinely released: the neighbour's hull then closes over
    # them instead of leaving a bare seam.
    carved = {}
    for name in list(finals):
        for rule in cfg.get(name, {}).get("exclude_hsv", []):
            bad = finals[name] & hsv_mask(hsv_img, rule)
            if bad.any():
                finals[name] &= ~bad
                carved[name] = carved.get(
                    name, np.zeros_like(bad)) | bad
                print(f"hue carve: {name} released {bad.sum()} px")

    def _reclaim(pixels, skip=None):
        """Give each pixel to its nearest zone (never back to `skip`)."""
        names = [n for n in finals if n != skip]
        owner = np.zeros(pixels.shape, np.int32)
        for i, n in enumerate(names, 1):
            owner[finals[n]] = i
        todo = pixels & (owner == 0)
        if not todo.any():
            return 0
        iy, ix = ndimage.distance_transform_edt(
            owner == 0, return_indices=True, return_distances=False)
        owner[todo] = owner[iy[todo], ix[todo]]
        for i, n in enumerate(names, 1):
            finals[n] |= todo & (owner == i)
        return int(todo.sum())

    # carved pixels go to a *neighbour*, never back to the zone that released
    # them, or the carve would simply undo itself
    for name, bad in carved.items():
        n = _reclaim(bad, skip=name)
        print(f"hue carve: {name} -> {n} px reassigned to neighbours")

    # 3d. no bare pixels: anything on the glove that no zone claims is given
    # to its nearest zone, so a carve or a smoothing pass can never leave the
    # untinted base photo showing through as a seam.
    if glove is not None:
        union = np.zeros_like(glove)
        for fm in finals.values():
            union |= fm
        n = _reclaim(glove & ~union)
        if n:
            print(f"seam reclaim: {n} bare px given to nearest zone")

    # 4. export layers (+ inpainted variant for panels)
    report = {}
    preview = image.astype(np.float32).copy()
    panel_zones = ({f"back{i}" for i in range(1, 10)} | {"web", "belt"}
                   | set(MERGE))
    hue_ch = hsv_img[..., 0].astype(int)
    # a panel's inpainted hull may only absorb decoration pixels (laces,
    # welting, ...) — never a neighboring panel
    panel_union = {n: finals[n].copy() for n in finals if n in panel_zones}
    for name, m in finals.items():
        soft = (name in SMOOTH_ZONES or name in MERGE) and args.smooth
        if name in panel_zones:
            # PRIMARY layer = one natural piece: holes left by subtracted
            # laces/welting/embroidery are inpainted with matching leather
            # (Scott: overlapping layers stack on top in the builder).
            k = max(25, int(45 * SCALE)) | 1
            hull = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE,
                                    np.ones((k, k), np.uint8)).astype(bool)
            others = np.zeros_like(hull)
            for pn, pm in panel_union.items():
                if pn != name:
                    others |= pm
            # welting/binding define piece boundaries — never absorb them
            boundary = (finals.get("welting", np.zeros_like(hull))
                        | finals.get("binding", np.zeros_like(hull)))
            hull &= ~(others | boundary)
            if glove is not None:
                hull &= glove
            hull |= merge_internal.get(name, np.zeros_like(hull))
            hull = morphology.remove_small_objects(hull, int(200 * SCALE**2))
            holes = hull & ~m
            holes |= merge_internal.get(name, np.zeros_like(hull)) & hull
            # hue-outlier refill: pixels contaminated by neighboring colors
            # (e.g. gap-fill slivers) are treated as holes too
            cores = merge_parts.get(name, [m]) or [m]
            cores = [c & ~holes for c in cores]
            cores = [c for c in cores if c.any()]
            if cores:
                far = np.ones(m.shape, bool)
                for c in cores:
                    med = np.median(hue_ch[c])
                    d = np.abs(hue_ch - med)
                    far &= np.minimum(d, 180 - d) > 15
                holes |= m & far
            if holes.any():
                filled = fill_from_panel(image, hull, holes,
                                         blur_sigma=1.5 * SCALE)
                frgba = np.dstack([filled, np.full(m.shape, 255, np.uint8)])
                export_layer(frgba, hull, final / f"{name}.png", soft=soft)
                export_layer(rgba, m, final / f"{name}_cutout.png", soft=soft)
                m = hull  # the natural piece is the zone from here on
                finals[name] = m
            else:
                export_layer(rgba, m, final / f"{name}.png", soft=soft)
        else:
            export_layer(rgba, m, final / f"{name}.png", soft=soft)
        col = np.array(PREVIEW.get(name, (255, 255, 255)), np.float32)
        preview[m] = preview[m] * 0.35 + col * 0.65
        report[name] = {"pixels": int(m.sum()),
                        "coverage_pct": round(float(m.mean()) * 100, 2),
                        "smoothed": bool(name in edge_metrics)}
        if name in edge_metrics:
            e0, e1 = edge_metrics[name]
            report[name]["edge_px_before"] = e0
            report[name]["edge_px_after"] = e1

    if glove is not None:
        export_layer(rgba, glove, final / "glove.png",
                     soft=args.smooth)
        if "glove" in edge_metrics:
            e0, e1 = edge_metrics["glove"]
            report["glove"] = {"pixels": int(glove.sum()), "smoothed": True,
                               "edge_px_before": e0, "edge_px_after": e1}
    if stitching is not None:
        m = stitching & ~welting
        if args.smooth:
            e0 = edge_len(m)
            m = smooth_mask(m, **smooth_for("stitching"))
            report["stitching"] = {"pixels": int(m.sum()), "smoothed": True,
                                   "edge_px_before": e0,
                                   "edge_px_after": edge_len(m)}
        export_layer(rgba, m, final / "stitching.png", soft=args.smooth)

    Image.fromarray(preview.astype(np.uint8)).save(final / "preview.jpg", quality=92)
    report["_glove_coverage_by_zones"] = round(coverage * 100, 1) if coverage else None
    (final / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print("final layers in", final)


if __name__ == "__main__":
    main()
