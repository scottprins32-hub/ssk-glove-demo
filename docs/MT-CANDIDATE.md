# Modified Trapeze candidate: placed, not bent

Proof piece for one web, for review before any other web follows the same
route. Isolated: it does not change `glove_builder/customiser/` (assets,
glove-data.json, dist), `make_web.py`, `build_assets.py` or any shipped layer.
Branch `feature/modified-trapeze-candidate`, based on
`origin/feature/glove-web-assets` 45aa9eb (unchanged at the time of writing).

`WEB-KWALITEITSPLAN.md` is not in this repository or on this branch; this
work follows the brief as given in chat.

## Why the shipped Modified Trapeze looks pasted

Measured on `runs/web-modified-trapeze/report.json` and the shipped layers:

| Cause | Shipped | Effect on screen |
|---|---|---|
| Homography local scale | 0.49 at the top of the web to 1.18 at the bottom | top laces thin and hooked, lower strap a fat "Y" paddle |
| Anisotropy | up to 1.39 | laces stretched across, crossings merged |
| `conform()` bend | up to 47 px | outline and rim laces dragged onto the H-web's opening |
| Trim to the H-web opening | laces cut where they leave it | fragmented, jaggy lattice |
| Leather material | replaced by the H-web's `web_material` sheet | flat post, no lit edge, no lace shadows |
| Source | relit store photograph | black leather's shadows lifted into noise, lace highlights clipped |

The source angle is usable: the traced web and the calibration glove's
opening have the same aspect (2.83 against 2.85). A similarity transform
(uniform scale 0.755, rotation 1.95 degrees, no anisotropy, no bend) covers
the opening at IoU 0.83. No reshoot is needed for this web.

## What the candidate does

`glove_builder/make_mt_candidate.py`:

1. **Source.** The camera JPEG of DSC05720, SHA-256 checked against
   `trace.json`, cropped at full resolution and committed as
   `images/store-2026-09/modified-trapeze-web-camera.jpg` so it re-runs
   without the Drive. The 39.5 MB RAW could not be fetched here, because the
   Drive connector caps downloads at 10 MB.
2. **Placement.** A similarity fit of the traced extent, without the strap,
   onto the opening. Uncovered opening and cover over other panels count in
   full. Rim overhanging open air counts at 0.15.
3. **Edges.** Each boundary pixel is unmixed at full resolution between the
   two nearest classes (lace, leather, backdrop), using their local mean
   colours. Lace masks are opened by 2 px and smoothstepped to remove the
   trace's notches, while crevices of 3 px or more stay open.
4. **Material.** The photograph's own luminance, denoised with non-local
   means. Its spread is brought to the stock zone's with the `settle()`
   rule. Fine grain is kept at 35% for leather and 60% for lace, while
   shading (lace shadows, the post's edge, stitch holes) is kept whole. A
   black level of 6 stops the JPEG's 1 to 3 level shadows from speckling.
5. **Heel join.** The part of the opening the web does not reach at the heel
   is filled with the leather the same frame shows there: this glove's own
   panel, 5,900 source pixels. Its broad tone is matched to the web leather
   beside it, at a gain of 1.25.
6. **Finger strip.** Only the band the laces wrap over, within 34 px of the
   web. That is under half of `finger_poly`, so the join with the
   calibration glove's finger is short.

It writes the same three layers the page already uses (`leather`, `lace`,
`finger`), so the configurator code is unchanged.

## Files

| File | What |
|---|---|
| `glove_builder/make_mt_candidate.py` | builds the candidate; `--install ASSETS` encodes it into a copy of the assets |
| `glove_builder/mt_candidate_review.py` | before/after sheets rendered by the page itself, from a temporary copy |
| `glove_builder/images/store-2026-09/modified-trapeze-web-camera.jpg` | camera pixels of the web, full resolution |
| `glove_builder/runs/mt-candidate/{leather,lace,finger}.png` | the candidate layers, 929 x 1100 |
| `glove_builder/runs/mt-candidate/source_vs_classes.jpg` | source beside its classes: lace green, leather red, backdrop blue, finger strip orange, heel wedge magenta |
| `glove_builder/runs/mt-candidate/placement_on_opening.png` | placement on the opening: covered green, uncovered red, overhang blue |
| `glove_builder/runs/mt-candidate/review/*_1x.jpg`, `*_1x_black.jpg`, `*_2x.jpg` | before, after, before, after: right hand then left |
| `glove_builder/runs/mt-candidate/report.json` | transform, fit and tone numbers |

The colourways are White/Black (10/90), Dark/Light (Black/White, 90/10),
Natural (Tan/Tan, 44/44) and As shot (Black/Yellow Tan, 90/45).

## Reproduce

```bash
python glove_builder/make_mt_candidate.py            # from the committed crop
python glove_builder/make_mt_candidate.py --frame DSC05720.jpeg   # from the original
python glove_builder/mt_candidate_review.py          # sheets into runs/mt-candidate/review
```

To ship it, run `--install glove_builder/customiser/assets` and then rebuild
the bundle. That is an integration step for Astra's pipeline and has not
been done here.

## Tests

- `trapeze_check.mjs`, run on a copy with the candidate installed and its
  own `window_aligned.png`, passes on both webs and both hands. Web and lace
  colours land within the tolerance and each changes independently. 99.8% of
  10,863 photographed window pixels are open (the shipped web keeps 7,951
  open). The left hand mirrors the right exactly.
- On the unchanged branch, `state_check.mjs` passes and
  `sheen.py --check` passes. Neither is affected, because no shipped asset
  changed.

Passing checks do not make this finished. The visual shortcomings are below.

## Remaining visual shortcomings

1. **Stock lace tail.** The calibration glove's long lace tail still hangs
   off the rim, and this glove's own two tails are not drawn. The page's
   `laces` zone draws the stock tail outside the opening, and the web punch
   leaves it.
2. **Back 2 slivers.** Slivers of back 2 and `back2_knotheal` show beside
   the lower rim and as a stub right of it. The knot-heal footprint reaches
   into the opening. The shipped web hid them by bending over them.
3. **Rim width.** The rim is about 8,000 px wider than the H-web's
   silhouette on the right. It is this web's real rim at uniform scale, but
   it sits a few pixels outside the stock outline.
4. **Air between rim loops.** At the top, air shows between the rim loops
   where the H-web had leather. This is true to the photograph.
5. **Lace outlines.** Laces still have slightly frayed edges at 200%, from
   the half-resolution trace. On tone-on-tone colourways such as Tan/Tan they
   carry a thin light outline.
6. **Stitching colour.** Stitching on the post is relief only and does not
   take the stitching colour, because the swap contract has no stitching
   layer for a web.
7. **Flatter post.** The post reads flatter than in the photograph. Black
   leather's 34:1 luminance spread is brought to the stock web's 1.9:1.
8. **Heel wedge.** The wedge is this glove's thumb panel coloured as web
   leather. Its double stitching shows faintly.
9. **Fingertip join.** Where the finger strip ends at the fingertip, the
   feather is soft.
10. **Not compared with 44 Pro.** No 44 Pro reference was available here.

## Conflicts and dependencies with Astra's pipeline

- **No file overlap.** Every file here is new, and `make_web.py`,
  `build_assets.py` and `customiser/` are untouched.
- **Overwrite risk.** Installing the candidate and later re-running
  `make_web.py --web modified-trapeze` plus `build_assets.py` would
  overwrite it. A choice between the two routes is needed before
  integration.
- **Shortcomings 1 and 2.** These need the web punch or knot heal in
  `build_assets.py` to also remove the stock rim tail and the back 2
  knot-heal footprint inside the opening under a swapped web. That affects
  every swapped web, so it belongs to Astra.
- **Other webs.** The route (similarity placement, own shading, unmixed
  edges) applies to the other store webs only after this piece has been
  reviewed.
