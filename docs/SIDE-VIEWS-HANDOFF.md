# Thumb-side and pinky-side views: handoff

The views were built on branch `feature/side-views` and merged to main at
d548bc1. They are wired into the configurator on branch
`feature/side-views-in-app` (see "In the configurator" below). `make_web.py`,
the tracer and every existing layer are untouched.

## Sources

The fixed base glove is the rainbow calibration glove. The store shoot of
23 September 2026 photographed its sides on the stand:

| View | Frame used | Repeat (same pose) | SHA-256 of the RAW |
|---|---|---|---|
| Thumb side | DSC05708.ARW | DSC05709.ARW | 7f79d4c9bdbf4f976aaa2e17d44ecb0d1736c1ec8c141a536c81c59396fac060 |
| Pinky side | DSC05710.ARW | DSC05711.ARW | c9d70fbfc3025927c2f98388dd7532deb44eee4edf98b237d2977b8278e0c568 |

The RAWs are in Scott's Drive under SSK Europe / Pictures of gloves /
SSK fotoshoot, and stay there. They are developed with rawpy 0.27.1 (camera
white balance, half size, 16 bit) and cropped. The crops are committed as
`images/store-2026-09/rainbow-thumb.png` and `rainbow-pinky.png`, so
everything re-runs without the Drive. DSC05712 and DSC05713 show the heel and
are not used here.

The photographs named in the brief, `images/scott-glove-2026-07/thumb_side_a.jpg`,
`thumb_side_b.jpg` and `pinky_side_pad.jpg`, show Scott's own glove. It is a
navy croc glove with orange panels, a flame web and an MP thumb patch, held in
a hand and rotated. It is a different glove and a different model, so it
cannot give the fixed body's geometry, and it is not used.

## Reproduce

```bash
# optional: re-develop the crops from the RAWs (checks each SHA-256)
python glove_builder/make_side_views.py --shoot "<folder with DSC05708.ARW, DSC05710.ARW>"
# zone layers from the committed crops -> layers/side-{thumb,pinky}/, runs/side-views/
python glove_builder/make_side_views.py
# page assets -> customiser/assets/side/, customiser/assets/{thumb,pinky}-data.json
python glove_builder/build_side_views.py
# the single-file build picks them up too
python glove_builder/customiser/bundle.py
# configurator: serve glove_builder/customiser/ and use the view switcher;
# standalone preview: serve glove_builder/ and open /side_views/index.html
python -m http.server 8000 --directory glove_builder
# check (exit 0 pass, 1 fail, 3 Playwright missing, which is not a pass)
NODE_PATH=<dir holding playwright> node glove_builder/side_views_check.mjs
# review sheets -> runs/side-views/review/
python glove_builder/side_views_review.py
```

## How the map is made

The rainbow glove gives every order field its own hue.

- **Colour classes.** Each pixel is classified by its chromaticity (R, G and
  B over their sum), which a shadow does not change. The class colours are
  measured on well-lit pixels of the same frame. A brightness-weighted vote
  over the neighbourhood, wider in deep shadow, settles noisy pixels.
- **Traced seams.** Two fields that share a hue are divided along a seam the
  camera shows, traced by hand. Where the seam is a piping line, it is
  snapped to that line's centre in the photo.
- **Pink parts.** Pink divides by shape. Straps 15 px or more across are
  laces. Pink along the glove's outline is binding. Traced piping lines are
  welting. Thin stitched runs and stitch dots are stitching.
- **Fixed parts.** Parts with no order field stay as photographed and are
  never recoloured.
- **Page assets.** These use the customiser's own `tint_base`, `spec_base`,
  `match_sheen` and `sheen.py` read-only, so a colour renders as it does on
  the back and palm views.

### Thumb side (822 x 1100)

| Order field | What it is in the frame | Evidence |
|---|---|---|
| web | the H-Web: posts, bars, rim | turquoise, inside the traced web outline |
| back2 | the thumb's back panel below the web | turquoise below the web strap's stitched point (traced seam) |
| back1 | the thumb's large outer panel | purple |
| belt | the purple strip below the light piping | carries the edge of the rainbow bullet patch (traced seam) |
| back3 | the index finger's edge | green |
| palm | the pocket seen through the web's slots | dark turquoise enclosed by the web |
| laces, binding, stitching | pink by shape | see above |

Fixed: the thumb circle with the small SSK logo, the light piping between
back 1 and the belt, and the bullet patch seen edge-on.

### Pinky side (737 x 1100)

| Order field | What it is in the frame | Evidence |
|---|---|---|
| back9 | the pinky's outer panel | red, outer side of the welting |
| back8 | the pinky's back panel | red, between the welting and the ring finger |
| back7 | the ring finger | orange |
| ring_emb | the embroidered SSK on the ring finger | pink inside a traced letter outline; a crossing lace strap is kept out |
| back6 | the middle finger's broad face | yellow |
| back5 | the narrow yellow strip | yellow, beyond the welting inside the yellow |
| back4 | the index finger's back | green |
| palm | a glimpse between pinky and ring finger | turquoise, inside a traced scope |
| welting, laces, binding, stitching | pink by shape and traced piping | see above |

Fields a view does not show are listed on the page and in its data file
(`fieldsNotShown`).

## The web, and webs that were not photographed

- **Fixed body.** The body never depends on the chosen web. The check proves
  this pixel for pixel in both views and both hands.
- **Thumb side.** The web shows only on the thumb side, and only the base
  glove's own H-Web was photographed there. For any other web, the web and
  the lacing and stitching through it are hatched. The page then says:
  "Web "…" is niet gefotografeerd vanaf de duimzijde. Het gearceerde deel is
  de H-Web van de basishandschoen met de veters erdoorheen, niet het gekozen
  web."
- **Missing webs.** These 12 catalogue webs have no thumb-side photograph:
  Spiral I, Standard I, SMS, SMK, SMLEE, Modified Trapeze, Basket, Em Rocket,
  Sasaki 1, Sasaki 2, Closed Diamond Net and Trapeze. They are marked on the
  page, never presented as done.
- **Pinky side.** No web is visible from the pinky side, so no marker is
  shown.

## Checks

`side_views_check.mjs` drives the real page in Chromium and reads the canvas
back. All 20 checks pass:

| Check | Result |
|---|---|
| Every zone renders its field's swatch, in two orders far apart, both views, both hands | worst 10.4 (pinky palm) on a tolerance of 25 |
| Changing one field changes only that field's pixels | 9 thumb and 12 pinky fields, both hands |
| Body pixels are identical whichever web is chosen | both views, both hands |
| An unphotographed web is marked on the thumb side, and no marker shows on the pinky side | pass |
| The left hand is the right hand mirrored, outside the lettering | worst channel difference 0 |

The lettering reads the right way in both hands. For a left hand it is
reflected across its own text line, so "SSK" reads along the mirrored finger
at the mirrored slant.

Review sheets are in `runs/side-views/review/`: White/Black, Black/White,
Tan/Tan, the Japan starter and a contrast order where every field differs.
Each sheet shows both views, right then left hand. Each also has a 200%
version (`*_2x.jpg`), plus `source_vs_contrast.jpg` and
`thumb_unphotographed_web.jpg`. The source/zone overlays are
`runs/side-views/{thumb,pinky}_zones.jpg`.

## In the configurator

- **Views.** The stage's view switcher offers Back, Palm, Thumb side and Pinky
  side (Achterkant, Palm, Duimzijde, Pinkzijde). Each extra view is an
  optional data file, and the page works without it.
- **Fields.** `app.js` reads each side zone's order field from the view's data.
  Colours, zone highlighting and click-to-select use the same fields as the
  back view. A field a side cannot show gets "Not visible from this side".
- **Engine.** `glove-engine.js` loads `assets/{thumb,pinky}-data.json`, or the
  inlined copies in the single-file build. It draws the left-hand lettering
  from `embroideryLHT` and hatches `webMarker` when the chosen web is not the
  H-Web. The stage then says so in both languages.
- **Bundle.** `bundle.py` inlines both views. The single file grows from
  4.7 MB to 6.0 MB.
- **Checks.** `side_views_app_check.mjs` drives the real configurator. It
  checks the switcher, every zone's colour, click-to-select, and the
  unphotographed web in both views and both hands. All other checks still
  pass.

## Remaining limitations

1. **Other frames.** These are different frames from the back view's master
   photograph. The side views are separate views, not registered to it.
   Colours agree because the tint pipeline is shared. The lighting does not:
   the shoot had window light from one side. 65% of the broad fall-off is
   divided out, but a white or tan thumb still shows grey shading on its far
   side.
2. **Traced edge.** The thumb's lower-right edge stands in shadow against the
   black stand. That stretch of outline is traced, not measured, and can be a
   few pixels off.
3. **Traced seams.** The web/back2, back1/belt, back8/back9 and back5/back6
   splits follow traced seams. The back5/back6 assignment, a narrow strip for
   back 5, rests on the panel order of the back view and has not been
   confirmed with SSK.
4. **Fixed parts.** The piping above the belt has no known order field, so it
   stays as photographed. The thumb circle stays black with its logo, and
   circle colour and thumb number are not rendered. The bullet patch edge
   stays the rainbow patch whatever bullet is chosen.
5. **Fields not shown.** Thumb loops, pinky loops, lining and pad colour are
   not visible in these frames. No welting was separated on the thumb side.
6. **Pixel-level artefacts.** At 200% a few faint hairlines remain inside the
   embroidery letters. Seams read as thin dark lines, which are the
   photographed creases. Residual RAW grain shows in the deepest shadows.
7. **No other views.** The heel view (DSC05712/13) is not built. No palm or
   back changes were made.

## Files

| File | What |
|---|---|
| `glove_builder/make_side_views.py` | source development and verification, zone map, overlays |
| `glove_builder/build_side_views.py` | page assets and data per view |
| `glove_builder/side_views/index.html`, `side-views.js` | standalone preview on the same engine |
| `glove_builder/customiser/assets/side/`, `customiser/assets/{thumb,pinky}-data.json` | the built views |
| `glove_builder/customiser/glove-engine.js`, `app.js`, `glove-catalog.js`, `bundle.py` | the wiring (see "In the configurator") |
| `glove_builder/side_views_app_check.mjs` | the configurator check |
| `glove_builder/side_views_check.mjs` | the check |
| `glove_builder/side_views_review.py` | review sheets |
| `glove_builder/images/store-2026-09/rainbow-{thumb,pinky}.png` | committed source crops |
| `glove_builder/layers/side-{thumb,pinky}/` | zone layers (colour only inside each zone) |
| `glove_builder/runs/side-views/` | overlays, `zones.json`, review sheets |
