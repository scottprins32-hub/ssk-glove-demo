"""A Modified Trapeze candidate placed, not bent: one photograph, one
similarity transform, its own shading.

Why the shipped Modified Trapeze reads as pasted (runs/web-modified-trapeze/
report.json): make_web.fit() maps the store photograph onto the calibration
glove's opening with a homography whose local scale runs from 0.49 at the top
of the web to 1.18 at the bottom, anisotropic up to 1.39, and conform() then
bends the outline a further 47 px. The top laces come out thin and hooked, the
strap a fat paddle. The lattice is then trimmed to the opening, which cuts
laces into fragments, its leather is replaced by the H-web's material sheet,
and the heel wedge the warp still misses is filled by copying.

What this does instead, all of it measured, none of it drawn:

1. Placement. The web's traced extent (strap excluded) is fitted to the
   calibration glove's opening with a SIMILARITY transform (scale, rotation,
   shift, anisotropy held within 7%). The two openings have the same aspect
   (2.85 against 2.83), so no bending is needed: every lace keeps the width
   and curve the camera recorded. The cost counts opening left uncovered and
   web laid over another panel in full, and web rim overhanging open air at
   0.15, because a rim a few pixels wider than the H-web's is still a rim.
2. Source. The camera's own JPEG of DSC05720 (SHA-256 checked against
   trace.json), not the relit store photograph: relighting lifted the black
   leather's shadows into noise and clipped the lace highlights. The crop is
   committed as images/store-2026-09/modified-trapeze-web-camera.jpg so this
   re-runs without the Drive.
3. Edges. The trace masks are exact per pixel at half resolution. At full
   resolution each boundary pixel is unmixed between the two classes it lies
   between (lace, leather, backdrop), using their local mean colours: lace
   edges come out antialiased by the camera, not by a resampler.
4. Material. Leather and lace keep the photograph's own luminance: every
   lace's shadow on the next, the post's lit edge, the stitch holes. Only the
   spread is brought to the stock zone's (the settle() rule make_web.py
   already uses for the finger strip), so a black glove's contrast does not
   turn into dirt on a white one.
5. Heel join. The part of the opening the web does not reach at the heel is
   filled with the leather the same frame shows there (this glove's own panel
   below the web), not with copied or smeared pixels.

Writes runs/mt-candidate/ (layers, overlays, report.json) and, with
--install ASSETS, the three layers into a configurator assets folder under the
existing 'modified-trapeze' keys. Point --install at a COPY of the assets for
review; nothing here touches glove_builder/customiser/assets by default.

    python glove_builder/make_mt_candidate.py [--frame DSC05720.jpeg]
    python glove_builder/make_mt_candidate.py --install /path/to/copy/assets
"""

import argparse
import hashlib
import json
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
from make_web import WEBS, aperture  # noqa: E402

SLUG = "modified-trapeze"
MASKS = HERE / "runs/store-modified-trapeze/masks"
TRACE = HERE / "runs/store-modified-trapeze/trace.json"
CAMERA = HERE / "images/store-2026-09/modified-trapeze-web-camera.jpg"
OUT = HERE / "runs/mt-candidate"
W, H = 929, 1100
# The committed camera crop, in store-photograph coordinates (the frame
# cropped at trace.json's crop_in_frame, then halved). Full resolution, so
# one store pixel is two by two here.
BOX = (1000, 120, 1560, 1200)
LUMA = np.array([0.299, 0.587, 0.114], np.float32)
MID = 140.0
BLACK = 6.0
# full-res crop pixel centre -> store-photograph coordinates
A = np.array([[0.5, 0, BOX[0] - 0.25], [0, 0.5, BOX[1] - 0.25], [0, 0, 1]])


def camera_crop(frame):
    """The camera's pixels for BOX, from the original frame if given."""
    if frame is None:
        return np.asarray(Image.open(CAMERA).convert("RGB"))
    t = json.loads(TRACE.read_text())
    want = t["source"]["sha256"]
    got = hashlib.sha256(pathlib.Path(frame).read_bytes()).hexdigest()
    if got != want:
        raise SystemExit(f"{frame}: sha256 {got} is not the traced frame {want}")
    cx, cy = t["crop_in_frame"][:2]
    box = (cx + 2 * BOX[0], cy + 2 * BOX[1], cx + 2 * BOX[2], cy + 2 * BOX[3])
    im = Image.open(frame).convert("RGB").crop(box)
    CAMERA.parent.mkdir(parents=True, exist_ok=True)
    im.save(CAMERA, quality=97, subsampling=0)
    print(f"camera crop {box} of {pathlib.Path(frame).name} -> {CAMERA.name}")
    return np.asarray(im)


def store_masks():
    m = {n: np.asarray(Image.open(MASKS / f"{n}.png")) > 127
         for n in ("glove", "web_extent", "web_lace", "web_leather",
                   "web_window", "web_roi", "web_strap", "lace_anywhere")}
    poly = Image.new("1", m["glove"].shape[::-1])
    ImageDraw.Draw(poly).polygon(WEBS[SLUG]["finger_poly"], fill=1)
    m["finger"] = np.asarray(poly) & m["glove"]
    return m


def similarity(p):
    s, th, tx, ty, an = p
    c, sn = np.cos(th), np.sin(th)
    return np.array([[s * an * c, -s * sn, tx], [s * an * sn, s * c, ty],
                     [0, 0, 1]], np.float64)


def fit(src, ap):
    """Scale, rotation, shift and a little anisotropy; nothing that bends."""
    sil = np.asarray(Image.open(HERE / "layers/rainbow-back-4x/glove.png")
                     .convert("RGBA").resize((W, H), Image.LANCZOS))[..., 3] > 40
    sil = ndimage.binary_fill_holes(sil)
    panels = sil & ~ndimage.binary_dilation(ap, iterations=2)
    air = ~sil
    src8 = src.astype(np.uint8)

    def warp(T):
        return cv2.warpPerspective(src8, T, (W, H), flags=cv2.INTER_NEAREST) > 0

    def cost(p):
        a = warp(similarity(p))
        return float((ap & ~a).sum() + (a & panels).sum()
                     + 0.15 * (a & air).sum())

    ys, xs = np.nonzero(src)
    ya, xa = np.nonzero(ap)
    s0 = np.ptp(ya) / np.ptp(ys)
    p = np.array([s0, 0.0, xa.mean() - s0 * xs.mean(),
                  ya.mean() - s0 * ys.mean(), 1.0])
    best = cost(p)
    for step in ((0.02, 0.02, 8, 8, 0.02), (0.01, 0.01, 4, 4, 0.01),
                 (0.005, 0.005, 2, 2, 0.005), (0.002, 0.002, 1, 1, 0.002)):
        moved = True
        while moved:
            moved = False
            for i in range(5):
                for sg in (1, -1):
                    q = p.copy()
                    q[i] += sg * step[i]
                    if not 0.93 <= q[4] <= 1.07:
                        continue
                    v = cost(q)
                    if v < best - 1e-6:
                        best, p, moved = v, q, True
    a = warp(similarity(p))
    stats = {"uncovered_opening_px": int((ap & ~a).sum()),
             "over_other_panels_px": int((a & panels).sum()),
             "over_open_air_px": int((a & air).sum()),
             "iou": round(float((a & ap).sum() / (a | ap).sum()), 4)}
    return similarity(p), p, stats


def unmix(img, classes, band=3, sigma=3.0):
    """Soft per-class fractions from hard per-pixel classes.

    Inside a class, one-hot. On a boundary, each pixel is placed on the line
    between the local mean colours of the two classes nearest to it, which is
    what the camera's own antialiasing did to that edge.
    """
    I = img.astype(np.float32)
    names = list(classes)
    cores, dist, means = {}, {}, {}
    for n in names:
        c = ndimage.binary_erosion(classes[n], iterations=1)
        cores[n] = c
        dist[n] = ndimage.distance_transform_edt(~c) if c.any() else \
            np.full(c.shape, 1e9, np.float32)
        w = ndimage.gaussian_filter(c.astype(np.float32), sigma * 2)
        mu = np.dstack([ndimage.gaussian_filter(I[..., k] * c, sigma * 2)
                        for k in range(3)])
        # where a class has no core nearby, carry the nearest core's colour
        good = w > 1e-3
        mu = np.where(good[..., None], mu / np.maximum(w, 1e-3)[..., None], 0)
        if good.any():
            iy, ix = ndimage.distance_transform_edt(~good, return_indices=True,
                                                    return_distances=False)
            mu = mu[iy, ix]
        means[n] = mu
    D = np.stack([dist[n] for n in names])
    order = np.argsort(D, axis=0)
    frac = {n: cores[n].astype(np.float32) for n in names}
    anycore = np.any(np.stack([cores[n] for n in names]), axis=0)
    edge = ~anycore & (np.sort(D, axis=0)[1] <= band * 2)
    ia, ib = order[0][edge], order[1][edge]
    Ie = I[edge]
    Ca = np.stack([means[n][edge] for n in names])[ia, np.arange(ia.size)]
    Cb = np.stack([means[n][edge] for n in names])[ib, np.arange(ib.size)]
    d = Ca - Cb
    al = np.clip(((Ie - Cb) * d).sum(-1) / np.maximum((d * d).sum(-1), 25.0),
                 0, 1)
    for k, n in enumerate(names):
        f = frac[n]
        v = np.zeros(ia.size, np.float32)
        v[ia == k] += al[ia == k]
        v[ib == k] += 1 - al[ib == k]
        f[edge] = v
    # pixels far from every core but classified: keep their hard class
    rest = ~anycore & ~edge
    for n in names:
        frac[n][rest] = classes[n][rest]
    return frac, means


def warp_layer(rgb, alpha, M):
    """Premultiplied, supersampled 3x, area-averaged down: the fit() recipe."""
    SS = 3
    S = np.array([[SS, 0, 0], [0, SS, 0], [0, 0, 1]], np.float64)
    pm = np.dstack([rgb * alpha[..., None], alpha * 255.0]).astype(np.float32)
    big = cv2.warpPerspective(pm, S @ M, (W * SS, H * SS),
                              flags=cv2.INTER_LANCZOS4)
    a = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA)
    a = np.clip(a, 0, 255)
    al = a[..., 3:4] / 255.0
    c = np.where(al > 1e-3, a[..., :3] / np.maximum(al, 1e-3), 0)
    return np.clip(c, 0, 255), a[..., 3]


def settle(lum, alpha, ref_zone, grain=1.0):
    """Bring a layer's luminance spread to the stock zone's, keeping shape.

    `grain` scales what varies over a pixel or two (the leather's pebble
    and its specular glints) separately from the shading, which is kept
    whole. Black leather glints where a light leather does not, and at full
    strength those glints tinted as grey stipple over a white or tan web.
    The split is edge-preserving, so a lace's shadow on the leather and the
    post's lit edge stay in the shading.
    """
    ref = Image.open(HERE / f"layers/rainbow-back-4x/{ref_zone}.png")
    ref = np.asarray(ref.convert("RGBA").resize((W, H), Image.LANCZOS)
                     ).astype(np.float32)
    rl = ref[..., :3] @ LUMA
    rm = ref[..., 3] > 200
    m = alpha > 200
    spread = lambda v: np.log(max(np.percentile(v, 95), 1.0)
                              / max(np.percentile(v, 5), 1.0))
    s_own, s_ref = spread(lum[m]), spread(rl[rm])
    k = min(1.0, s_ref / max(s_own, 1e-3))
    med = float(np.median(lum[m]))
    # With a black level. The deepest shadows sit at one to three levels of
    # the JPEG, and in a plain log each of those steps is a 70% jump: that
    # is the dark speckle beside every lace. Six levels of offset is about
    # the lens flare the backdrop puts into any shadow on this frame.
    r = np.log((np.maximum(lum, 0.0) + BLACK) / (med + BLACK)).astype(np.float32)
    r = np.where(alpha > 20, r, 0).astype(np.float32)
    base = cv2.bilateralFilter(r, 7, 0.45, 2.5)
    r = base + grain * (r - base)
    # Stored with its midtone at 140, not at the photograph's own. The page
    # normalises every layer by its median, so the level is free; black
    # leather kept at its own (about 20) had ten grey levels to its name and
    # posterised into flat facets once lifted to a light colour.
    out = MID * np.exp(k * r)
    return out, {"own_p95_p5": round(float(np.exp(s_own)), 2),
                 "stock_p95_p5": round(float(np.exp(s_ref)), 2),
                 "k": round(float(k), 3), "grain": grain}


def match_wedge(lum, alpha, wed, M):
    """Bring the heel wedge's broad tone to the web leather beside it.

    The wedge is photographed leather, but it is this glove's thumb panel,
    which faces away from the light: on a white web it read as a grey patch
    with an edge. Its own texture and stitching stay; only the level it sits
    at, averaged over ten pixels, is lifted to the leather around it, and
    the gain eases out over a few pixels so no new edge is drawn.
    """
    wc = cv2.warpPerspective(wed.astype(np.float32), M, (W, H),
                             flags=cv2.INTER_LINEAR) > 0.5
    solid = alpha > 200
    wc &= solid
    ring = ndimage.binary_dilation(wc, iterations=18) & ~wc & solid
    if wc.sum() < 50 or ring.sum() < 50:
        return lum, 1.0
    target = float(np.median(lum[ring]))
    own = wc.astype(np.float32)
    low = (ndimage.gaussian_filter(lum * own, 10)
           / np.maximum(ndimage.gaussian_filter(own, 10), 1e-3))
    gain = np.where(wc, np.clip(target / np.maximum(low, 1.0), 0.7, 1.8), 1.0)
    gain = ndimage.gaussian_filter(gain.astype(np.float32), 4)
    out = np.where(solid | (alpha > 0), lum * gain, lum)
    return out, round(float(np.median(gain[wc])), 3)


def build(frame=None):
    OUT.mkdir(parents=True, exist_ok=True)
    img = camera_crop(frame)
    # The black leather sits in the bottom twenty levels of an 8-bit JPEG, so
    # its grain is mostly compression and sensor noise; once the page lifts
    # its midtone to the chosen colour that noise is grey speckle across a
    # white web. Non-local means keeps what repeats (stitching, grain, edges)
    # and drops what does not.
    img = cv2.fastNlMeansDenoisingColored(np.ascontiguousarray(img), None,
                                          h=7, hColor=5,
                                          templateWindowSize=7,
                                          searchWindowSize=21)
    m = store_masks()
    # Only the strip of index finger the laces wrap over. finger_poly is 80 px
    # wide; beyond the wrap it is just a second photograph of finger leather
    # beside the calibration glove's, which is a visible join for nothing.
    near_roi = ndimage.distance_transform_edt(~m["web_roi"]) <= 34
    m["finger"] &= near_roi
    ap = aperture(H)
    src = m["web_extent"] & ~m["web_strap"]
    T, p, stats = fit(src, ap)
    print(f"similarity: scale {p[0]:.4f}, rotation {np.degrees(p[1]):.2f} deg, "
          f"anisotropy {p[4]:.3f}; {stats}")

    # The heel wedge: opening the placed web leaves uncovered, shown by this
    # same frame as this glove's own leather. Lower half only; above that an
    # uncovered sliver is air between rim loops and stays open.
    # (0.45 of the height: the wedge left of the post starts at row 581.)
    placed = cv2.warpPerspective(src.astype(np.uint8), T, (W, H),
                                 flags=cv2.INTER_NEAREST) > 0
    gap = ndimage.binary_dilation(ap & ~placed, iterations=3) & ap
    gap[: int(0.45 * H)] = False
    gap_src = cv2.warpPerspective(gap.astype(np.uint8), np.linalg.inv(T),
                                  m["glove"].shape[::-1],
                                  flags=cv2.INTER_NEAREST) > 0
    wedge = gap_src & m["glove"] & ~m["web_roi"] & ~m["finger"] \
        & ~m["lace_anywhere"]
    wedge = ndimage.binary_dilation(wedge, iterations=2) & m["glove"] \
        & ~m["web_roi"] & ~m["finger"]

    # into the full-resolution crop
    def up(a):
        a = a[BOX[1]:BOX[3], BOX[0]:BOX[2]]
        return np.repeat(np.repeat(a, 2, 0), 2, 1)
    roi, strap, fing, wed = up(m["web_roi"]), up(m["web_strap"]), \
        up(m["finger"]), up(wedge)
    glove = up(m["glove"])
    region = roi | strap | fing | wed
    lace = (up(m["web_lace"]) | (up(m["lace_anywhere"]) & (fing | wed))) & region
    # The trace is exact at half resolution; doubled, its edge carries
    # one-pixel hairs where noise was taken for lace. A lace is 20 px across
    # here, so opening with a radius of two removes the hairs and no lace.
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)).astype(bool)
    lace = ndimage.binary_opening(lace, structure=disk)
    back = (up(m["web_window"]) | ~glove) & ~lace
    leath = region & glove & ~lace & ~back
    frac, means = unmix(img, {"lace": lace, "leather": leath, "back": back})
    I = img.astype(np.float32)
    near = ndimage.binary_dilation(region, iterations=4)
    f_l, f_k = frac["lace"] * near, frac["leather"] * near
    # below a fifth is chroma bleed from the JPEG's subsampled colour, not lace
    f_l = np.clip((f_l - 0.2) / 0.8, 0, 1)
    # The trace decided each half-resolution pixel on its own, so a lace's
    # edge is notched a pixel in and out along its length. A light blur and a
    # smoothstep take out notches of a pixel or two and keep the crevice
    # between two laces, which is three or more.
    f_s = ndimage.gaussian_filter(f_l, 1.0)
    t = np.clip((f_s - 0.3) / 0.4, 0, 1)
    f_l = (t * t * (3 - 2 * t)).astype(np.float32)

    # colour of each layer where it is partial: unmixed from the backdrop or
    # the other material, falling back to the local mean where the fraction
    # is too small to invert
    def colour(f, own, other):
        un = (I - (1 - f[..., None]) * other) / np.maximum(f[..., None], 1e-3)
        w = np.clip((f - 0.35) / 0.5, 0, 1)[..., None]
        return np.clip(w * un + (1 - w) * own, 0, 255)
    other_l = np.where((frac["leather"] >= frac["back"])[..., None],
                       means["leather"], means["back"])
    lace_rgb = np.where((f_l >= 0.999)[..., None], I,
                        colour(f_l, means["lace"], other_l))
    leath_rgb = np.where((f_k >= 0.999)[..., None], I,
                         colour(f_k, means["leather"], means["back"]))
    # behind a lace: leather where the lace lies on leather, nothing where it
    # crosses a window (the nearer of the two decides)
    dk = ndimage.distance_transform_edt(~(leath & ~fing))
    db = ndimage.distance_transform_edt(~back)
    # and never along a lace's edge where it borders a window, or the web's
    # colour shows as a hairline beside every lace that crosses one
    # Leather is behind a lace only where leather closes over it, i.e. lies
    # on both sides of it: a lace on the post, not one crossing a window.
    closed = cv2.morphologyEx(leath.astype(np.uint8), cv2.MORPH_CLOSE,
                              cv2.getStructuringElement(cv2.MORPH_ELLIPSE,
                                                        (31, 31))) > 0
    behind = (lace | (f_l > 0)) & closed & (dk < db) & (db > 4) & (roi | wed)
    under = np.where(behind, np.maximum(f_k + f_l, 0), f_k)
    # leather colour under laces: the nearest photographed leather
    iy, ix = ndimage.distance_transform_edt(~(leath & (f_k > 0.9)),
                                            return_indices=True,
                                            return_distances=False)
    fill = ndimage.gaussian_filter(leath_rgb[iy, ix], (2, 2, 0))
    leath_rgb = np.where((f_k < 0.9)[..., None] & behind[..., None],
                         fill, leath_rgb)

    web_a = np.clip(under, 0, 1) * (roi | wed) * ~fing
    web_a = np.maximum(web_a, np.clip(f_k, 0, 1) * ndimage.binary_dilation(
        (roi | wed) & ~fing, iterations=2) * ~fing)
    fin_a = np.clip(f_k, 0, 1) * fing
    # a fraction this small is the unmixing's noise, not material
    web_a[web_a < 0.1] = 0
    fin_a[fin_a < 0.1] = 0
    lac_a = np.clip(f_l, 0, 1)

    Mfull = T @ A
    layers = {}
    rep = {"source": str(CAMERA.relative_to(HERE)),
           "transform_store_to_canvas": np.round(T, 8).tolist(),
           "scale": round(float(p[0]), 4),
           "rotation_deg": round(float(np.degrees(p[1])), 3),
           "anisotropy": round(float(p[4]), 4), "fit": stats,
           "heel_wedge_store_px": int(wedge.sum())}
    for name, rgb, al, zone, grain in (
            ("leather", leath_rgb, web_a, "web", 0.35),
            ("lace", lace_rgb, lac_a, "laces", 0.6),
            ("finger", I, fin_a, "back3", 0.35)):
        c, a = warp_layer(rgb, al.astype(np.float32), Mfull)
        lum = c @ LUMA
        # opaque where the photograph is opaque: two resamples leave the
        # interior at 250-254, which lets 2% of whatever is under it through
        a = np.where(a >= 245, 255, a)
        lum, st = settle(lum, a, zone, grain)
        rep[f"{name}_tone"] = st
        if name == "leather" and wed.any():
            lum, rep["heel_wedge_gain"] = match_wedge(lum, a, wed, Mfull)
        g = np.clip(lum, 0, 255)
        layers[name] = np.dstack([g, g, g, a]).astype(np.uint8)

    # The web's leather must not lie over another panel of this glove. It is
    # allowed over the opening, over open air (its own rim) and under the
    # finger strip, which draws on top of it.
    sil = np.asarray(Image.open(HERE / "layers/rainbow-back-4x/glove.png")
                     .convert("RGBA").resize((W, H), Image.LANCZOS))[..., 3] > 40
    sil = ndimage.binary_fill_holes(sil)
    fa = layers["finger"][..., 3] > 20
    allow = ndimage.binary_dilation(ap, iterations=3) | ~sil | \
        ndimage.binary_dilation(fa, iterations=2)
    trimmed = int(((layers["leather"][..., 3] > 0) & ~allow).sum())
    layers["leather"][..., 3][~allow] = 0
    # and no crumbs: a speck of web leather on its own is resampling debris
    for name in ("leather", "finger"):
        al = layers[name][..., 3]
        lbl, n = ndimage.label(al > 0)
        if n:
            sz = ndimage.sum(al > 0, lbl, range(1, n + 1))
            al[np.isin(lbl, 1 + np.nonzero(sz < 40)[0])] = 0
    rep["leather_trimmed_off_other_panels_px"] = trimmed
    rep["opening_uncovered_px"] = int((ap & ~((layers["leather"][..., 3] > 90)
                                            | (layers["lace"][..., 3] > 90)
                                            | fa)).sum())
    wmask = cv2.warpPerspective(up(m["web_window"]).astype(np.uint8), Mfull,
                                (W, H), flags=cv2.INTER_NEAREST) > 0
    rep["photographed_window_px_on_canvas"] = int(wmask.sum())
    # in the form trapeze_check.mjs reads, so the same check can run on this
    win = np.zeros((H, W, 4), np.uint8)
    win[..., 3] = wmask * 255
    Image.fromarray(win, "RGBA").save(OUT / "window_aligned.png")
    for name, arr in layers.items():
        Image.fromarray(arr, "RGBA").save(OUT / f"{name}.png")
    (OUT / "report.json").write_text(json.dumps(rep, indent=2))
    print(json.dumps(rep, indent=2))
    overlays(img, m, lace, leath, back, fing, wed, T, ap)
    return layers


def overlays(img, m, lace, leath, back, fing, wed, T, ap):
    """Source with the classes it was cut into, and the placement on the
    calibration glove's opening."""
    ov = img.astype(np.float32).copy()
    for msk, col in ((lace, (60, 230, 90)), (leath, (255, 60, 60)),
                     (back & ndimage.binary_dilation(lace | leath, iterations=6),
                      (40, 120, 255)),
                     (fing & ~lace, (250, 200, 40)), (wed & ~lace, (255, 0, 255))):
        ov[msk] = 0.45 * ov[msk] + 0.55 * np.array(col, np.float32)
    Image.fromarray(ov.astype(np.uint8)).save(OUT / "source_classes.jpg",
                                              quality=90)
    side = np.hstack([img, ov.astype(np.uint8)])
    Image.fromarray(side).resize((side.shape[1] // 2, side.shape[0] // 2),
                                 Image.LANCZOS).save(OUT / "source_vs_classes.jpg",
                                                     quality=90)
    g = np.asarray(Image.open(HERE / "customiser/assets/glove.webp")
                   .convert("RGB")).astype(np.float32)
    src = m["web_extent"] & ~m["web_strap"]
    a = cv2.warpPerspective(src.astype(np.uint8), T, (W, H),
                            flags=cv2.INTER_NEAREST) > 0
    for msk, col in ((ap & ~a, (255, 0, 0)), (a & ~ap, (0, 90, 255)),
                     (a & ap, (0, 200, 0))):
        g[msk] = 0.5 * g[msk] + 0.5 * np.array(col, np.float32)
    Image.fromarray(g.astype(np.uint8)).crop((470, 0, 929, 820)).save(
        OUT / "placement_on_opening.png")


def install(assets):
    """Encode the three layers the way build_assets.py does and point the
    'modified-trapeze' entries of glove-data.json in `assets` at them."""
    sys.path.insert(0, str(HERE / "customiser"))
    import build_assets as ba
    import sheen
    assets = pathlib.Path(assets)
    data_path = assets / "glove-data.json"
    data = json.loads(data_path.read_text())

    def stock(zone):
        im = Image.open(HERE / f"layers/rainbow-back-4x/{zone}.png")
        return im.convert("RGBA").resize((W, H), Image.LANCZOS)
    target = {"web": ba.sheen_p95(ba.spec_base(stock("web"))),
              "laceweb": ba.sheen_p95(ba.spec_base(stock("web"))),
              "webfinger": ba.sheen_p95(ba.spec_base(stock("back3")))}
    pair = dict(data["webs"].get(SLUG, {}))
    for part, key in (("leather", "web"), ("lace", "laceweb"),
                      ("finger", "webfinger")):
        im = Image.open(OUT / f"{part}.png").convert("RGBA")
        if key == "webfinger":
            a = np.asarray(im).astype(np.float32)
            solid = a[..., 3] > 200
            if solid.any():
                iy, ix = ndimage.distance_transform_edt(
                    ~solid, return_indices=True, return_distances=False)
                a[..., :3] = a[..., :3][iy, ix]
            a[..., 3] = ndimage.gaussian_filter(a[..., 3], 3.0)
            im = Image.fromarray(a.astype(np.uint8), "RGBA")
        name = f"{key}_{SLUG}"
        base = ba.tint_base(im)
        base.save(assets / f"{name}.webp", quality=85, method=4)
        data["assets"][name] = f"{assets.name}/{name}.webp"
        al = np.asarray(base)[..., 3]
        ys, xs = np.nonzero(al > 8)
        data["bbox"][name] = [int(xs.min()), int(ys.min()),
                              int(xs.max()) + 1, int(ys.max()) + 1]
        sp = ba.match_sheen(ba.spec_base(im), target[key])
        data["sheen"].pop(name, None)
        if sp is not None:
            sp.save(assets / f"{name}_hi.webp", quality=80, method=4)
            data["assets"][name + "_hi"] = f"{assets.name}/{name}_hi.webp"
            data["bbox"][name + "_hi"] = data["bbox"][name]
            b, h = sheen.read_pair(assets / f"{name}.webp",
                                   assets / f"{name}_hi.webp")
            if b is not None:
                k = sheen.scale(b, h)
                if k < sheen.FLOOR:
                    data["sheen"][name] = k
        pair[key] = name
    data["webs"][SLUG] = pair
    data_path.write_text(json.dumps(data, separators=(",", ":")))
    print(f"installed the candidate into {assets}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frame", type=pathlib.Path,
                    help="original DSC05720.jpeg; refreshes the committed crop")
    ap.add_argument("--install", type=pathlib.Path, metavar="ASSETS",
                    help="write the layers into this assets folder (a copy)")
    args = ap.parse_args()
    if args.install:
        if not (OUT / "leather.png").exists():
            build(args.frame)
        install(args.install)
    else:
        build(args.frame)


if __name__ == "__main__":
    main()
