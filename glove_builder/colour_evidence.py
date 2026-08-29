"""Read SSK's leather colours off photographs of real gloves.

    python glove_builder/colour_evidence.py --photos <dir>
    python glove_builder/colour_evidence.py --photos <dir> --apply
    python glove_builder/colour_evidence.py --photos <dir> --check

The customiser paints 28 leather colours whose hex values were eyeballed. SSK
Europe's Drive folder holds photographs of finished custom gloves whose
FILENAMES name the colourway: `SE-1175-PIN-COL.jpg` is an 11.75" glove in Pink
and Columbia, `SE-1250-RED-GRE-BLA.jpg` is Red, Grey and Black. Each photo is
therefore a labelled sample of two or three real leathers.

How a photograph is read
------------------------
1. The shots are cut-outs: the glove sits on pure white. The background is
   every near-white pixel REACHABLE FROM THE BORDER, so a white lace inside
   the glove stays in the sample -- a plain "far from white" test threw the
   white leathers away and was what made the first version read White as
   #AEA49E.
2. The silhouette is eroded a few pixels: the cut-out edge is a blend of paper
   and leather, and blown pixels (every channel >= 248) carry no colour.
3. Pixels are over-clustered on HUE plus a weak lightness term, then clusters
   are merged back into materials: same hue = same leather. A lit panel and
   its own shadow differ in saturation, not hue, because the studio highlight
   veils the colour with white -- merging on hue puts them back together.
4. A material's colour is read from its WELL-LIT band (the 70th-90th
   luminance percentile), not its mean. The mean is an average over the
   shading, and on a thin lace it is nearly all shadow.

Why this is not circular
------------------------
A cluster is matched to a colour code only among the codes THAT PHOTO names,
and only against ANCHORS -- hexes frozen in this file, never the palette being
rewritten. With two codes it is a two-way assignment decided by which cluster
is nearer which, so a wrong starting value cannot defend itself, and --apply
cannot walk the palette anywhere. Codes never seen in a filename are left
alone. `--check` re-runs the read and fails if the palette has drifted from
what the photographs say.

What counts as evidence
-----------------------
One GLOVE, not one file. `... LHT.jpg` is the same photograph mirrored --
measured, not assumed: SE-1175-PIN-COL and its LHT differ by 0.2/255 after a
flip, and the sampler reads them to the same hex. Counting them separately
would have doubled the apparent evidence for half the palette. `Inside` is the
palm of that same glove and `Close`/`Closer` are it from nearer; all of them
fold into one. Views are averaged first, then gloves; the spread reported is
the spread BETWEEN gloves, which is the only one that says anything.

Files the folder holds that this cannot use are skipped, not guessed at:
SE-1250-RAINBOW is the calibration glove the renderer was built from and names
no colourway, and the order-form reference shots (palm colour, ring logo,
finger hood) are not gloves in a named build at all.

A colour is only rewritten where the photographs disagree with the chart by
more than three times the uncertainty of their own median. Red comes out at
#AD1726 against a chart #C8102E and is LEFT ALONE: four gloves that scatter
that widely cannot overturn a 29-unit difference. Camel lands 9 units from
its chart value, Grey 14, Orange 24 -- colours where the chart was already
right and the sampler agrees with it, which is what makes the big misses
(Mint 96 units, Pink 82, Navy 71) worth acting on.

What it cannot fix
------------------
A leather the camera blew out. These shots clip: a sixth of the white leather
sits at a flat 255 with nothing behind it, and the band this reads a colour
with tops out at the 90th percentile, so once more than a tenth of a material
is clipped the band is inside the clip and what comes back is whatever was
left in shadow. White's eight photographs scatter from #B9BFBE to #D5D1C1 for
exactly that reason, and none of them moves the palette. Where a colour has
even one photograph that did not clip it, it is read from that one -- which is
how Mint is read off SE-1175-MIN-BLA rather than off the two gloves that
clipped it. A frame that is not exposed for the paper is what would settle
White and Camel.
"""

from __future__ import annotations

import argparse
import itertools
import json
import pathlib
import re

import numpy as np
from PIL import Image, ImageFilter

HERE = pathlib.Path(__file__).parent
DATA = HERE / "customiser" / "assets" / "glove-data.json"
OUT = HERE / "colour-evidence.json"

WORK = 520          # long edge the sampling runs at
SAMPLES = 60_000    # pixels fed to k-means
ERODE = 7           # silhouette erosion, px at WORK, kills the cut-out fringe
BLOWN = 248         # every channel at or above this carries no colour
BAND = (70, 90)     # the well-lit percentile band a material is read from
CLIP_MAX = 1 - BAND[1] / 100   # blown past the band's own top: unreadable
CLUSTERS = 8        # over-cluster, then merge back into materials
MERGE_HUE = 14.0    # degrees: same hue, same leather
MERGE_LUM = 2.2     # ... as long as the two are within this lightness ratio
NEUTRAL_SAT = 0.14  # below this a material has no usable hue to merge on
NEUTRAL_LUM = 1.65  # ... so neutrals merge on lightness, conservatively
MIN_SHARE = 0.05    # a material smaller than this of the glove is not a panel
ORDER_PENALTY = 80.0  # cost of ignoring the filename's body-first order
ORDER_TOL = 0.15    # ... two materials this close in size are the same size
MAX_SPREAD = 45.0   # gloves that scatter more than this settle nothing
SIGMA = 3.0         # ... and the chart falls only to this many standard errors

LUM = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

# What the photographs actually measure. A glove's laces are leather, cut from
# the same hides, and they are a big part of what the sampler reads on any
# two-colour glove. Stitching and embroidery are thread: no photograph here
# resolves a stitch line, so those palettes keep the chart values rather than
# inherit a leather's.
LEATHER_PALETTES = ("leather", "lace")

# Filename abbreviations. RED and ORA are here because the palette has both
# Red and Red Orange, Orange and Orange Tan -- a prefix match is ambiguous and
# would silently drop eight photographs. GRE is the one the photographs had to
# settle: on SE-1200-BLA-GRE and SE-1250-RED-GRE-BLA it is Grey, not Green.
ALIASES = {"GRE": "Grey", "ELE": "Electric Blue", "COL": "Columbia",
           "CHO": "Chocolate", "YEL": "Yellow Tan", "CAM": "Camel",
           "RED": "Red", "ORA": "Orange", "NAV": "Navy", "PUR": "Purple",
           "WHI": "White", "BLA": "Black", "PIN": "Pink", "MIN": "Mint",
           "SAL": "Salmon"}

# The palette as it stood before any photograph was read. Frozen on purpose:
# assignment measures against THIS, so running --apply twice cannot drag a
# colour anywhere. Update it only alongside a deliberate re-baseline.
ANCHORS = {
    "10": "#F2F0EA", "12": "#D9B97A", "20": "#A31E31", "25": "#E17FC0",
    "32": "#C8102E", "33": "#E03C31", "35": "#F05A28", "37": "#F2A900",
    "40": "#4E2A23", "41": "#E8A33D", "43": "#D78F3C", "44": "#C98C3F",
    "45": "#E8B84C", "46": "#6B3B25", "48": "#7B2A2F", "49": "#F0A099",
    "50": "#279B48", "51": "#1C4E2C", "52": "#B9E0CE", "55": "#16C0DE",
    "60": "#2145D6", "65": "#6C9BC9", "70": "#1D3A8F", "71": "#131C3E",
    "75": "#0AB5C8", "80": "#B12FA0", "90": "#17161A", "93": "#7E8288",
}


# --- the palette file -------------------------------------------------------

def palette() -> list[tuple[str, str, str]]:
    data = json.loads(DATA.read_text())
    return [tuple(c) for c in data["palettes"]["leather"]]


def code_for(abbrev: str, pal) -> str | None:
    """Which palette colour a filename's three letters mean."""
    want = ALIASES.get(abbrev.upper())
    if want:
        for code, name, _ in pal:
            if name.lower() == want.lower():
                return code
        return None
    hits = [code for code, name, _ in pal
            if name.upper().startswith(abbrev.upper())]
    return hits[0] if len(hits) == 1 else None


# The colour block has to END where the codes end: SE-1250-RAINBOW is the
# calibration glove, not a glove in colour RAI, and without the boundary the
# regex happily takes the first three letters of anything.
NAME = re.compile(r"^SE-(?:(?P<style>[A-Z]{2})-)?(?P<size>\d{4})"
                  r"(?P<colours>(?:-[A-Z]{3})+)(?![A-Z])", re.I)


def parse(name: str, pal):
    m = NAME.match(pathlib.Path(name).stem)
    if not m:
        return None
    codes = []
    for abbrev in m.group("colours").strip("-").split("-"):
        code = code_for(abbrev, pal)
        if code is None:
            return None                 # an abbreviation we cannot place
        codes.append(code)
    view = "palm" if re.search(r"inside", name, re.I) else "back"
    # The glove this file shows: LHT is the same photograph flipped, the two
    # views are two sides of one glove, and Close/Closer are the same glove
    # again from nearer. All of it folds into one piece of evidence, or six
    # files would speak six times for one leather.
    stem = pathlib.Path(name).stem
    glove = re.sub(r"\s*\b(LHT|RHT|Inside|Closer|Close|\d)\b", "", stem,
                   flags=re.I).strip()
    return {"model": f"SE-{m.group('style') + '-' if m.group('style') else ''}"
                     f"{m.group('size')}",
            "codes": codes, "view": view, "glove": glove}


# --- reading one photograph -------------------------------------------------

def _reachable(near: np.ndarray) -> np.ndarray:
    """Near-white pixels connected to the image border. The background."""
    cur = np.zeros_like(near)
    cur[0], cur[-1], cur[:, 0], cur[:, -1] = \
        near[0], near[-1], near[:, 0], near[:, -1]
    while True:
        nxt = cur.copy()
        nxt[1:] |= cur[:-1]
        nxt[:-1] |= cur[1:]
        nxt[:, 1:] |= cur[:, :-1]
        nxt[:, :-1] |= cur[:, 1:]
        nxt &= near
        if nxt.sum() == cur.sum():
            return cur
        cur = nxt


def glove_pixels(path: pathlib.Path):
    """The leather, cut off the paper it was photographed on.

    Returns the image, the silhouette, and separately the pixels the camera
    blew out. The last is not waste: a leather whose own photographs clip is a
    leather this cannot measure, and White is exactly that -- a sixth of it
    sits at 255 in every shot, with nothing behind the clip to recover.
    """
    img = Image.open(path).convert("RGB")
    img.thumbnail((WORK, WORK))
    a = np.asarray(img).astype(np.float32)

    near = (a.min(2) >= 246) & ((a.max(2) - a.min(2)) <= 6)
    if not near[0].any() and not near[-1].any():
        return None, None, None       # not a cut-out on white
    inside = ~_reachable(near)
    inside = np.asarray(
        Image.fromarray((inside * 255).astype(np.uint8), "L")
        .filter(ImageFilter.MinFilter(ERODE))) > 0
    blown = inside & (a.min(2) >= BLOWN)
    inside &= ~blown
    if inside.sum() < 4000:
        return None, None, None
    return a, inside, blown


def blown_share(a, inside, blown, reps):
    """What fraction of each material the camera clipped.

    A blown pixel is white whatever it was, so it cannot be sorted by colour
    -- sorting it that way would hand every glove's specular streaks to its
    palest leather. It is sorted by where it IS instead: the labels grow into
    the clipped regions from their edges.
    """
    f = features(a[inside])
    lab = np.full(a.shape[:2], -1, np.int16)
    lab[inside] = ((f[:, None, :] - features(reps)[None, :, :]) ** 2
                   ).sum(2).argmin(1).astype(np.int16)
    kept = np.array([int((lab == i).sum()) for i in range(len(reps))],
                    dtype=float)
    todo = blown.copy()
    for _ in range(14):
        if not todo.any():
            break
        for shift in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            src = np.roll(lab, shift, axis=(0, 1) if 0 not in shift else
                          (0 if shift[0] else 1))
            take = todo & (src >= 0)
            lab[take] = src[take]
            todo &= ~take
    lost = np.array([int(((lab == i) & blown).sum()) for i in range(len(reps))],
                    dtype=float)
    return lost / np.clip(kept + lost, 1, None)


def chromaticity(px):
    return px / (px.sum(-1, keepdims=True) + 12.0) * 255.0


def features(px, weight: float = 0.55):
    return np.concatenate([chromaticity(px), (px @ LUM)[:, None] * weight], 1)


def kmeans(f, k, iters=30, seed=7):
    rng = np.random.default_rng(seed)
    centres = f[rng.choice(len(f), k, replace=False)]
    who = np.zeros(len(f), dtype=int)
    for _ in range(iters):
        who = ((f[:, None, :] - centres[None, :, :]) ** 2).sum(2).argmin(1)
        moved = 0.0
        for i in range(k):
            if (who == i).any():
                new = f[who == i].mean(0)
                moved = max(moved, float(np.linalg.norm(new - centres[i])))
                centres[i] = new
        if moved < 0.3:
            break
    return who


def lit(px):
    """A material's colour: the median of its well-lit band."""
    lums = px @ LUM
    lo, hi = np.percentile(lums, BAND)
    keep = px[(lums >= lo) & (lums <= hi)]
    return np.median(keep if len(keep) >= 20 else px, axis=0)


def hsv(rgb):
    rgb = np.asarray(rgb, np.float32)
    mx, mn = float(rgb.max()), float(rgb.min())
    d = mx - mn
    sat = d / mx if mx > 0 else 0.0
    if d < 1e-6:
        return 0.0, sat, mx
    r, g, b = (float(v) for v in rgb)
    hue = (((g - b) / d) % 6 if mx == r else
           ((b - r) / d + 2 if mx == g else (r - g) / d + 4)) * 60
    return hue, sat, mx


def materials(px, groups_too: bool = False):
    """Cluster, then merge the clusters that are the same leather."""
    who = kmeans(features(px), CLUSTERS)
    groups = [px[who == i] for i in range(CLUSTERS)]
    groups = [g for g in groups if len(g) >= 150]
    while len(groups) > 1:
        best = None
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                a, b = lit(groups[i]), lit(groups[j])
                ha, sa, _ = hsv(a)
                hb, sb, _ = hsv(b)
                la, lb = float(a @ LUM) + 2, float(b @ LUM) + 2
                ratio = max(la / lb, lb / la)
                if sa < NEUTRAL_SAT and sb < NEUTRAL_SAT:
                    ok, cost = ratio < NEUTRAL_LUM, abs(la - lb)
                else:
                    cost = abs((ha - hb + 180) % 360 - 180)
                    ok = (cost < MERGE_HUE and ratio < MERGE_LUM
                          and abs(sa - sb) < 0.30)
                if ok and (best is None or cost < best[0]):
                    best = (cost, i, j)
        if best is None:
            break
        _, i, j = best
        groups[i] = np.concatenate([groups[i], groups[j]])
        groups.pop(j)
    total = sum(len(g) for g in groups)
    out = sorted(((len(g) / total, lit(g)) for g in groups), key=lambda t: -t[0])
    return (out, groups) if groups_too else out


def hexof(rgb) -> str:
    return "#%02X%02X%02X" % tuple(int(np.clip(round(c), 0, 255)) for c in rgb)


def rgbof(hexv: str) -> np.ndarray:
    return np.array([int(hexv[i:i + 2], 16) for i in (1, 3, 5)],
                    dtype=np.float32)


def assign(mats, wanted):
    """One material per named colour, chosen as a set rather than one by one.

    Two things decide it. The ANCHORS say which material looks like which
    colour, and the FILENAME ORDER says which is which by size: SSK writes the
    body leather first and the trims after, and that holds in every one of
    these photographs -- SE-CM-3350-CHO-COL is 52% chocolate then 31%
    Columbia. Anchors alone put Chocolate on the 7% black logo patch, because
    a near-black is nearer a dark brown than the real brown leather is. The
    order prior is soft: two materials within ORDER_TOL of each other are
    treated as the same size, so a glove whose trim really is the bigger patch
    is not forced.
    """
    big = [i for i, (share, _) in enumerate(mats) if share >= MIN_SHARE]
    if len(big) < len(wanted):
        big = list(range(len(mats)))
    if len(big) < len(wanted):
        return {}
    best, best_cost = None, None
    for combo in itertools.permutations(big, len(wanted)):
        cost = sum(float(np.linalg.norm(mats[c][1] - rgbof(ANCHORS[w])))
                   for c, w in zip(combo, wanted))
        for a in range(len(combo)):
            for b in range(a + 1, len(combo)):
                if mats[combo[a]][0] < mats[combo[b]][0] * (1 - ORDER_TOL):
                    cost += ORDER_PENALTY
        if best_cost is None or cost < best_cost:
            best, best_cost = combo, cost
    return dict(zip(wanted, best))


# --- the proof sheet -------------------------------------------------------

def proof(path: pathlib.Path, out_dir: pathlib.Path):
    """The photograph beside itself, flattened to the colours we read off it.

    The only honest test of a sampler: repaint every pixel with its material's
    sampled colour, keep the shading, and look. If the flat glove is a
    different glove, the read is wrong -- a misassigned material or a value
    pulled out of the shadow shows up here and nowhere in the numbers.
    """
    a, inside, _ = glove_pixels(path)
    if a is None:
        return None
    px = a[inside]
    rng = np.random.default_rng(3)
    if len(px) > SAMPLES:
        px = px[rng.choice(len(px), SAMPLES, replace=False)]
    reps = np.array([m[1] for m in materials(px)], np.float32)

    f_all = features(a.reshape(-1, 3))
    f_rep = features(reps)
    who = ((f_all[:, None, :] - f_rep[None, :, :]) ** 2).sum(2).argmin(1)
    flat = reps[who].reshape(a.shape)
    shade = np.clip((a @ LUM) / np.clip(flat @ LUM, 1, None), 0, 1.6)[..., None]
    outp = np.clip(flat * shade, 0, 255)
    outp[~inside] = 255

    gap = np.full((a.shape[0], 8, 3), 255, np.uint8)
    strip = np.concatenate([a.astype(np.uint8), gap, outp.astype(np.uint8)], 1)
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / (path.stem.replace(" ", "_") + ".png")
    Image.fromarray(strip).save(dest)
    return dest


# --- the sweep --------------------------------------------------------------

def read_photos(folder: pathlib.Path, pal):
    seen: dict[str, list] = {}
    used, skipped = 0, []
    for path in sorted(folder.iterdir()):
        if path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        meta = parse(path.name, pal)
        if not meta:
            skipped.append(f"{path.name} (filename names no colourway)")
            continue
        a, inside, blown = glove_pixels(path)
        if a is None:
            skipped.append(f"{path.name} (not a cut-out on white)")
            continue
        px = a[inside]
        rng = np.random.default_rng(3)
        if len(px) > SAMPLES:
            px = px[rng.choice(len(px), SAMPLES, replace=False)]
        mats = materials(px)
        got = assign(mats, meta["codes"])
        if not got:
            skipped.append(f"{path.name} (fewer materials than colours named)")
            continue
        reps = np.array([m[1] for m in mats], np.float32)
        clipped = blown_share(a, inside, blown, reps)
        for code, i in got.items():
            seen.setdefault(code, []).append(
                {"hex": hexof(mats[i][1]), "photo": path.name,
                 "view": meta["view"], "model": meta["model"],
                 "glove": meta["glove"],
                 "clipped": round(float(clipped[i]), 4)})
        used += 1
    return seen, used, skipped


def summarise(seen, pal):
    """One value per glove, then one value per colour, plus its uncertainty.

    A leather is read only from the photographs that did not blow it out. The
    band this reads a colour with tops out at the 90th percentile, so once
    more than a tenth of a material is at 255 the band is inside the clip and
    what comes back is whatever was left in shadow -- which is why White's
    eight photographs, all of them clipped, scatter from #B9BFBE to #D5D1C1
    and why none of them gets to move the palette. Mint has one glove that
    clipped nothing, and it is read from that one alone.

    A colour photographed on one glove has no spread of its own, and reporting
    zero would let a single photograph rewrite the chart. It borrows instead:
    the median spread the colours WITH several gloves show between them, which
    is what glove-to-glove variation actually costs here. Its own photographs
    can still overrule that upwards -- Yellow Tan's four disagree by more than
    any two gloves do, because the yellow on that glove is a web patch and a
    set of laces in two different tones, and it stays unadopted for it.
    """
    rows = {}
    for code, _, _ in pal:
        obs = seen.get(code, [])
        if not obs:
            continue
        clean = [o for o in obs if o["clipped"] <= CLIP_MAX]
        gloves = {}
        for o in (clean or obs):
            gloves.setdefault(o["glove"], []).append(rgbof(o["hex"]))
        pts = np.array([np.median(np.array(v), axis=0)
                        for v in gloves.values()])
        med = np.median(pts, axis=0)
        spread = float(np.median(np.linalg.norm(pts - med, axis=1)))
        within = float(np.median(np.linalg.norm(
            np.array([rgbof(o["hex"]) for o in (clean or obs)]) - med, axis=1)))
        _, sat, _ = hsv(med)
        rows[code] = {"hex": hexof(med), "gloves": len(pts),
                      "photos": len(clean or obs), "blown_out": not clean,
                      "clipped": float(np.median([o["clipped"] for o in obs])),
                      "spread": spread, "within": within, "sat": sat,
                      "neutral": sat < NEUTRAL_SAT,
                      "distance": float(np.linalg.norm(med - rgbof(ANCHORS[code])))}

    # What one glove differs from the next, over the colours that have more
    # than one. This is the prior a single-glove colour is measured against.
    seen_spreads = [r["spread"] for r in rows.values()
                    if r["gloves"] >= 2 and not r["blown_out"]]
    pooled = float(np.median(seen_spreads)) if seen_spreads else 0.0
    for r in rows.values():
        if r["gloves"] >= 2:
            r["stderr"] = 1.25 * r["spread"] / (r["gloves"] ** 0.5)
        else:
            r["stderr"] = 1.25 * max(r["within"], pooled)
    return rows, pooled


def adoptable(row) -> tuple[bool, str]:
    if row["blown_out"]:
        return False, (f"blown out in every photograph "
                       f"({row['clipped'] * 100:.0f}%)")
    if row["spread"] > MAX_SPREAD:
        return False, f"gloves disagree ({row['spread']:.0f})"
    if row["distance"] <= SIGMA * row["stderr"]:
        return False, (f"chart is within the error "
                       f"({row['distance']:.0f} vs {SIGMA * row['stderr']:.0f})")
    return True, "adopted"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--photos", required=True, type=pathlib.Path)
    ap.add_argument("--apply", action="store_true",
                    help="write the adopted values into glove-data.json")
    ap.add_argument("--proof", type=pathlib.Path, default=None,
                    help="write photo-beside-flattened proof strips here")
    ap.add_argument("--check", action="store_true",
                    help="exit non-zero if the palette has drifted from these"
                         " photographs")
    args = ap.parse_args()

    pal = palette()
    names = {code: name for code, name, _ in pal}
    live = {code: hexv for code, _, hexv in pal}

    seen, used, skipped = read_photos(args.photos, pal)
    if args.proof:
        made = 0
        for path in sorted(args.photos.iterdir()):
            if path.suffix.lower() in (".jpg", ".jpeg", ".png") \
                    and parse(path.name, pal) and proof(path, args.proof):
                made += 1
        print(f"wrote {made} proof strip(s) to {args.proof}\n")
    rows, pooled = summarise(seen, pal)

    print(f"{used} photograph(s) read, {len(skipped)} skipped; one glove "
          f"differs from the next by {pooled:.0f}\n")
    print("code  name           chart     photographs  gloves  off by  +/-  "
          "blown  verdict")
    print("-" * 92)
    adopted = {}
    for code, name, _ in pal:
        row = rows.get(code)
        if row is None:
            print(f"{code:4s}  {name:13s}  {ANCHORS[code]}   not photographed")
            continue
        ok, why = adoptable(row)
        if ok:
            adopted[code] = row["hex"]
        print(f"{code:4s}  {name:13s}  {ANCHORS[code]}   {row['hex']}  "
              f"{row['gloves']:5d}   {row['distance']:6.0f}  "
              f"{row['stderr']:4.0f}  {row['clipped'] * 100:4.0f}%  {why}")

    OUT.write_text(json.dumps({
        "_comment": [
            "GENERATED by glove_builder/colour_evidence.py from photographs of",
            "finished custom gloves, whose filenames name the colourway.",
            "Each material is matched only against the colours ITS OWN photo",
            "names and only against the anchors frozen in that script, so the",
            "palette cannot defend or drift itself. A colour is adopted when",
            f"the gloves disagree with the chart by more than {SIGMA:.0f}",
            "standard errors of their own median; a colour seen on one glove",
            "borrows the spread the others show between gloves. '... LHT' is",
            "the same photograph mirrored, so it does not count twice.",
            "Neutrals are reported and never adopted: in a photograph nothing",
            "separates a white leather from a lit grey one but the light.",
        ],
        "photos": used,
        "skipped": skipped,
        "adopted": adopted,
        "between_gloves": pooled,
        "measured": {c: {k: v for k, v in r.items() if k != "sat"}
                     for c, r in rows.items()},
        "observations": seen,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {OUT.relative_to(HERE.parent)}")

    if args.check:
        drift = {c: (live[c], h) for c, h in adopted.items() if live[c] != h}
        for c, (was, now) in sorted(drift.items()):
            print(f"DRIFT {c} {names[c]}: palette {was}, photographs {now}")
        if drift:
            print(f"\n{len(drift)} colour(s) differ from the photographs. "
                  f"Re-run with --apply, or re-baseline ANCHORS.")
            return 1
        print("\npalette matches the photographs")
        return 0

    if args.apply and adopted:
        data = json.loads(DATA.read_text())
        changed = 0
        for name in LEATHER_PALETTES:
            for entry in data["palettes"][name]:
                if entry[0] in adopted and entry[2] != adopted[entry[0]]:
                    entry[2] = adopted[entry[0]]
                    changed += 1
        DATA.write_text(json.dumps(data, separators=(",", ":")) + "\n",
                        encoding="utf-8")
        print(f"applied {len(adopted)} colour(s) across {changed} palette "
              f"entries in {', '.join(LEATHER_PALETTES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
