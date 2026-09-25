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
| Heel | DSC05712.ARW | DSC05713.ARW | 1372fbf711e2f18c53395e33ae5a59f1377ff4579a4f4996467168cb154ced0b |

The RAWs are in Scott's Drive under SSK Europe / Pictures of gloves /
SSK fotoshoot, and stay there. They are developed with rawpy 0.27.1 (camera
white balance, half size, 16 bit) and cropped. The crops are committed as
`images/store-2026-09/rainbow-thumb.png`, `rainbow-pinky.png` and
`rainbow-heel.png`, so everything re-runs without the Drive. In the Drive
the ARWs now sit in the shoot folder's `RAW` subfolder.

The photographs named in the brief, `images/scott-glove-2026-07/thumb_side_a.jpg`,
`thumb_side_b.jpg` and `pinky_side_pad.jpg`, show Scott's own glove. It is a
navy croc glove with orange panels, a flame web and an MP thumb patch, held in
a hand and rotated. It is a different glove and a different model, so it
cannot give the fixed body's geometry, and it is not used.

## Reproduce

```bash
# optional: re-develop the crops from the RAWs (checks each SHA-256)
python glove_builder/make_side_views.py --shoot "<folder with DSC05708, DSC05710 and DSC05712.ARW>"
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

### Heel (1233 x 1100)

| Order field | What it is in the frame | Evidence |
|---|---|---|
| back9 | the pinky wingtip wrapping the heel | red |
| back7 | the ring finger's back, foreshortened | orange |
| back6, back5 | the middle finger's back, either side of its welt | yellow, split on the snapped welting line |
| back4, back3 | the index finger's back, either side of its welt | green, split on the snapped welting line |
| back2 | the thumb's panel | turquoise |
| web | the H-Web's top bars | turquoise inside a traced outline |
| belt | the band round the wrist opening | purple |
| back1 | the thumb wingtip stitched to the belt | purple beyond a traced seam on the right |
| lining | the wrist opening | dark and colourless inside the ring of binding; a cavity, kept darker than its colour (depth 0.62, the back view's rule) |
| welting, laces, binding, stitching | pink by shape | see above |

The bullet patch is found as the one thing on the belt that is not purple,
opened with a disc wider than any piping. The belt's leather carries on
under it in the belt's own colour, so a smaller badge leaves leather.

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

- **Views.** The stage's view switcher offers Back, Palm, Thumb side, Pinky
  side and Heel (Achterkant, Palm, Duimzijde, Pinkzijde, Hiel). Each extra
  view is an optional data file, and the page works without it.
- **Fields.** `app.js` reads each side zone's order field from the view's data.
  Colours, zone highlighting and click-to-select use the same fields as the
  back view. A field a side cannot show gets "Not visible from this side".
- **Engine.** `glove-engine.js` loads `assets/{thumb,pinky}-data.json`, or the
  inlined copies in the single-file build. It draws the left-hand lettering
  from `embroideryLHT` and hatches `webMarker` when the chosen web is not the
  H-Web. The stage then says so in both languages.
- **Bundle.** `bundle.py` inlines all three views and the embroidery faces.
  The single file grows from 4.7 MB to 7.4 MB.
- **Checks.** `side_views_app_check.mjs` drives the real configurator. It
  checks the switcher, every zone's colour, click-to-select, and the
  unphotographed web in both views and both hands. All other checks still
  pass.

## The badge on the heel

The heel shows the bullet patch obliquely, on the curved belt. Each
orderable badge is laid onto that patch (`build_side_views.py`,
`badges_on_patch`):

- **Fit.** The front-on photograph of the rainbow badge (the calibration
  glove's own) is fitted to the patch the frame shows: the red and green
  arms' centroids give the axis and centre, the outline's extents the scale,
  then the outline is matched point to nearest point to a perspective
  transform. Overlap with the photographed patch: 0.946.
- **Every badge.** The other embroidered badges are the same shape
  photographed front-on, so each is laid onto the rainbow badge's frame by
  its outline's box and carried by the same transform. The rubber Edge
  badges are a slightly different shape and take a small stretch. All 15
  orderable badges are built; none is tinted at run time.
- **In the page.** A view that carries `bulletAssets` draws the chosen
  badge's own image; with no badge chosen it shows the rainbow patch, as
  the back view shows its photographed patch. On a left-handed glove the
  badge is unmirrored about its box so the mark reads the right way, as on
  the back view.
- **Check.** `side_views_app_check.mjs` switches the badge from Edge Gold to
  Navy/Gold on the heel and confirms only the patch's box changes, both
  hands.

## Embroidered text

The form's thumb text and pinky text are drawn on the side that carries
them (`glove-engine.js` drawText, from each view's `textMount`):

- **Where.** Along the panel's long axis through its centroid: the pinky text
  on Back 9, the thumb text on Back 1, shifted toward the fingertip to clear
  the thumb circle. The cap height is a share of the panel's width and the
  text shrinks to fit the panel's length. The mounts are computed by
  `build_side_views.py` from the panel masks, not drawn by hand.
- **Which way.** Embroidery reads the right way up when the back of the hand
  is up. That is what the photographed SSK mark on the pinky side does: it
  reads along the finger with the tops of its letters toward the back of the
  hand. Both texts follow that rule, so the pinky text reads down the finger
  with its tops to the right, and the thumb text reads up the thumb with its
  tops to the left. A left-handed glove re-lays the text rather than
  mirroring it, so it reads correctly there too.
- **Fonts.** Open web fonts stand in for SSK's: Block by Barlow Condensed,
  Script by Yellowtail, Brush by Kaushan Script (`assets/fonts`, SIL OFL,
  inlined by `bundle.py`). "with Outline" strokes the outline thread round
  the letters, "with Shadow" sets an offset copy in it. Kanji draws nothing:
  SSK stitches it in Japanese characters, and the stage and the form say so.
- **Look.** The thread colour is multiplied by the panel's own light and
  carries a fine stitch ridge and a darker edge, and never leaves its panel.
  Before a font is chosen the text shows in Block; an unchosen thread shows
  in the unanswered grey, like a panel without a colour.
- **Reaching it.** Under each text field a button switches the stage to the
  side that shows it.
- **Check.** `embroidery_check.mjs` drives the configurator: the text changes
  pixels only on its panel, carries the main thread and the outline thread,
  sits at the mirrored place on the left hand without being a mirror image,
  and Kanji draws nothing. Both texts, both hands.
- **Review sheets.** `runs/side-views/review/embroidery_*.jpg`.

Open: the thumb-text orientation is the pinky mark's rule applied to the
thumb, whose back-of-hand side in the photograph is the web side (the
bullet patch's edge shows there). Scott's own glove reads the other way if
it is right-handed; a photograph of an SSK thumb embroidery on a glove of
known hand would settle it.

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
7. **Heel: panels.** From the heel, Back 8 (the pinky's back panel) is not
   separated from Back 9; the red the heel shows is mapped to Back 9. The
   belt/Back 1 seam is traced along the stitch line, not measured.
8. **Heel: badge.** The patch sits on a curved band, and a perspective
   transform of a flat photograph is an approximation (overlap 0.946). On a
   left-handed glove the badge is unmirrored while the hole in the belt is
   mirrored, so a sliver of flat belt colour shows beside the badge where
   the two S shapes differ.
9. **Heel: edges.** The heel's lower edge stands against the black stand and
   is traced, not measured; the deepest shadows under the lower binding are
   assigned by their nearest neighbour.
10. **No palm or back changes** were made.

## Files

| File | What |
|---|---|
| `glove_builder/make_side_views.py` | source development and verification, zone map, overlays |
| `glove_builder/build_side_views.py` | page assets and data per view |
| `glove_builder/side_views/index.html`, `side-views.js` | standalone preview on the same engine |
| `glove_builder/customiser/assets/side/`, `customiser/assets/{thumb,pinky}-data.json` | the built views |
| `glove_builder/customiser/glove-engine.js`, `app.js`, `glove-catalog.js`, `bundle.py` | the wiring (see "In the configurator") |
| `glove_builder/side_views_app_check.mjs` | the configurator check |
| `glove_builder/embroidery_check.mjs` | the embroidered-text check |
| `glove_builder/customiser/assets/fonts/` | the three embroidery faces and their licence note |
| `glove_builder/side_views_check.mjs` | the check |
| `glove_builder/side_views_review.py` | review sheets |
| `glove_builder/images/store-2026-09/rainbow-{thumb,pinky}.png` | committed source crops |
| `glove_builder/layers/side-{thumb,pinky}/` | zone layers (colour only inside each zone) |
| `glove_builder/runs/side-views/` | overlays, `zones.json`, review sheets |
