Builder: Claude Code (Opus 5.5), worktree `ssk-glove-web-assets`, branch `feature/glove-web-assets`

# Trapeze and Modified Trapeze web assets

Both webs are now traced from the store shoot's own camera frames, fitted to the
calibration glove and registered in the catalogue. Nothing is pushed, merged or
deployed. Astra reviews independently; I did not run a reciprocal review.

**Status: not approved.** Astra's four visual blockers are not signed off, and
I don't claim they are fully fixed; that is for Astra's independent visual
review. The automated checks pass, but they only prove that the current labels
recolour correctly, not that the labels describe the photograph. The last
section lists what is still visible.

**Round 3 (this commit), after Astra's HIGH finding.** The Modified Trapeze
overlay labelled brown light reflected off the lacing, inside the continuous
black post, as gold lace. Those were the broad scalloped patches right of the
stitching, and they rendered as torn white islands and hook-shaped black
masses on a white web. The fix is to the source labels, not to smoothing or
display; see "Round 3: reflection on the post" below. The Trapeze labels were
re-inspected at 3× on every post tile and match the frame, so its assets are
unchanged.

**Round 4 (this commit), after Astra's Medium finding.** On the Modified
Trapeze, the lower right of the right ladder (render x 760–811, y 425–595,
both hands) still rendered the continuous brown lace bands as green
fragments cut into by red leather. Colour and brightness can't separate that
lace's shaded faces from the gold light it throws on the post. So ownership
there is now traced by hand off the full-resolution frame; see "Round 4:
hand-traced lower right ladder" below. The round-3 scallop fix and the
earlier joins are unchanged.

## Source identity

| web | glove on the stand | original frame (Drive, read-only) | SHA-256 |
|---|---|---|---|
| Trapeze | 1 of 8, white leather / purple lace | `SSK fotoshoot/DSC05716.jpeg` (RAW `DSC05716.ARW`) | `3b9c7993…aa150e` (RAW `9f14a294…c8b65`) |
| Modified Trapeze | 5 of 8, black leather / gold lace | `SSK fotoshoot/DSC05720.jpeg` (RAW `DSC05720.ARW`) | `7585cf70…2ecb9e15` (RAW `b4ae9967…fb40314`) |

The full hashes are in `glove_builder/trace_trapeze.py` (`SOURCES`) and in each
`runs/store-<slug>/trace.json`.

- **How the webs were identified.** Scott named the eight stand gloves by voice
  in shooting order (commit 3d71e50: 1 Trapeze … 5 Modified Trapeze). The stand
  frames DSC05716–05723 follow that order. I did not identify either web by how
  it looks.
- **What else I checked.** I looked at every other JPEG frame on a contact
  sheet, and developed the two RAW-only frames I hadn't seen (05704, 05714) to
  small /tmp previews. No other frame shows either web better. 05728–05731 are
  close-ups of the Trapeze glove's heel and palm, and no other frame shows the
  black/gold glove.
- **The committed crops are these frames.** `images/store-2026-09/{trapeze,modified-trapeze}.jpg`
  are exactly the frame's pixels (1650,150)–(5100,3860), halved, then relit by
  `flatten_light.py`.
  - I found the crop by template-matching the pre-relight versions (3d71e50)
    against the halved frames: correlation 0.999 on both.
  - Every trace re-verifies the SHA-256 and the high-pass correlation against
    the relit photo: 0.933 (Trapeze) and 0.916 (Modified Trapeze).
- **Not processed:** DSC05706–05713 (the rainbow views, which Astra owns). I
  renamed and copied nothing in the Drive folder. The originals are not
  committed, because the traced masks are, so `make_web.py` re-runs without
  the Drive.

## What changed

### New: `glove_builder/trace_trapeze.py` (tracer and provenance)

- **How pixels are classified.** Each pixel of the full-resolution frame crop
  (twice the committed photo's resolution) is classified on its own:
  - **Trapeze:** lace where a* ≥ 4 and a*−b* ≥ 7, or near-black and not warm.
    Window where neutral or cool and bright.
  - **Modified Trapeze:** lace where (R−B)/(R+G+B) ≥ 0.22 **and** the
    relit brightness is ≥ `lit_floor` (60). Within 24 full-res px of a
    backdrop window, warmth alone is enough. Window where neutral grey. See
    round 3.
- **Clean-up** before bringing the labels down to the photo grid:
  - Specks are handed to the nearest real piece.
  - A 1.5 px Gaussian majority vote smooths each class. This removed the
    flickering lace edges.
  - Pieces too small to draw at page scale are reassigned (leather < 60 px,
    lace < 30, window < 12). This removed the random hue islands (Astra #2).
- **A window must be enclosed by the glove.** Backdrop that connects to the
  open air beyond the rim is not counted as a window: 12,382 px (Trapeze) and
  8,320 px (Modified Trapeze).
- **What is drawn by hand.** Only three things, each deciding which part of
  the glove a pixel belongs to. Inside them nothing is invented.
  - `roi`: the web's boundary against the finger, thumb and heel.
  - `lace_only`: the web's own strap where it runs out over the next panel.
    Only lace pixels are taken inside it.
  - `finger_poly` (in `make_web.py`): the strip of index finger.
- **Outputs** (committed):
  - `runs/store-<slug>/masks/web_{leather,lace,window,roi,extent,strap}.png`
    and `lace_anywhere.png`
  - `trace.json`, which includes the source identity
  - `trace_check.jpg`, the source beside the class overlay
- **`--install BUILD`** copies only this web's layers from a scratch
  `build_assets.py` run into `customiser/assets/` and adds only their entries
  to `glove-data.json`, after checking the file round-trips byte for byte. No
  existing asset or JSON entry is touched. A full rebuild in this Python
  environment would have re-encoded unrelated assets: `idmap.png`,
  `web_spiral-i_hi.webp`, and every asset path.

### Round 3: reflection on the post (Modified Trapeze source labels)

- **What I found.** I opened DSC05720 at full resolution, gamma-lifted and
  chroma-boosted, beside the label overlay, in tiles along the whole post
  (photo x 1230–1470, y 250–1100).
  - Between the right ladder's hooks the black post sits in the laces'
    shadow and picks up their gold as reflected light.
  - I measured it against real lace in shadow. Hue (27–38°) and value (V
    8–40) overlap, and G/R (0.58–0.69) nearly does. So no colour rule can
    separate them in the raw frame.
- **What separates them.** Brightness under even light does. `lighting()`
  recovers `flatten_light.py`'s gain as the ratio of the committed relit
  photo to the halved frame, smoothed well past a lace's width. On that scale
  lit gold lace sits above 60 and the reflection below it. I compared floors
  of 45 and 60 side by side on the lifted frame: 45 still took the reflection
  patches, and 60 follows the hooks' own edges.
- **What it doesn't touch.** Next to backdrop windows there's no leather to
  reflect anything, so warmth alone still decides there. That keeps the left
  ladder and the loops round the rim exactly as before.
- **Result:**
  - 18,939 px of the post, which the photo shows as black leather, go back
    from lace to leather: lace 143,462 → 124,523 px, leather 66,339 → 84,671
    px. Windows are unchanged at 22,746 px.
  - The post is one continuous piece of leather in every render. The laces
    cross it only where a lit hook actually lies over it.
  - I added no loops and grew nothing. The whole post is not made leather:
    every lit crossing stays lace.
- **Shading is kept separately from the labels.** The reflected light stays
  in the leather layer's own relief, as a lighter patch in the web colour
  where the frame has one. It is no longer a lace.
- **Unchanged:** the joins, the conform, the finger strip and the strap work
  from the previous commit. The `--install` changed only the Modified
  Trapeze's bbox and sheen entries in `glove-data.json`. Backups:
  `trace_trapeze.py.bak`, `make_web.py.bak.2`, `runs/store-*/masks.bak/`,
  `trace.json.bak`, `WEB-ASSET-HANDOFF.md.bak`, all gitignored.

### Round 4: hand-traced lower right ladder (Modified Trapeze)

- **Source.** DSC05720.jpeg, SHA-256 re-verified on the run. I read the full
  frame crop (2× the committed photo) with non-local-means denoising, a
  gamma of 0.5 and 1.5× chroma. I traced the outlines on a 5 px grid in
  photo coordinates, then checked each outline against the relit committed
  crop at 3–6×.
- **What is drawn** (`SOURCES["modified-trapeze"]["hand_traced"]` in
  `trace_trapeze.py`; the polygons are also recorded in `trace.json`):
  - `zone`: photo (1370–1425, 792–1055), narrowing to x 1352 below y 965.
    Only here does hand tracing override the automatic labels.
  - Positive lace outlines, which are the visible physical strands:
    - the trunk lace;
    - the lace round the rim, ending at x 1419–1421, where a strip of lit
      grey rim leather begins;
    - the upper strand down the rim to its tip at (1400, 906);
    - the lower strand (1366–1382, y 932–1000);
    - the lit tab of the next hook down (1352–1361, y 997–1024).
  - Negative outlines, which are leather inside those lace outlines: the
    maroon shadow pocket between trunk and strand at (1377–1389, 879–906),
    and a small dark gap at (1404–1413, 809–819).
  - Everything else in the zone that isn't backdrop is leather: the grey
    rim, its bulge down to y 1055, and the maroon shadow between the strands.
- **How it is applied.** After every automatic step (tidy, smoothing, island
  removal), so nothing smooths or reassigns it. Backdrop windows inside the
  zone stay windows; there are 0 in it. Hand ownership covers 6,176 px of
  lace and 4,937 px of leather, and differs from the automatic labels on
  1,510 px.
- **What is not done:**
  - No hidden continuation is invented. Each strand ends where the frame
    shows it end, and nothing behind the rim or the heel is drawn.
  - No threshold changed anywhere. `lit_floor` still governs the rest of the
    post, so the round-3 scallop fix stands.
  - Shading isn't touched. The layers take their pixels, and `relief()`
    their texture, from the photo exactly as before. The trace only decides
    which layer a pixel belongs to.
- **Proofs** (committed):
  - `runs/store-modified-trapeze/proof_source.jpg`: the relit source, the
    88be384 labels and the hand-traced labels, side by side at 3×, with the
    zone outlined.
  - `runs/store-modified-trapeze/proof_render.jpg`: before (88be384) and
    after, on the white web / black lace / navy body and red web / yellow
    lace / white body renders, RHT and LHT (the LHT is un-mirrored so it
    lines up), render x 735–830, y 400–620, at 3×.
  - The "before" renders came from 88be384's assets, served from a /tmp
    copy of the customiser.
- **Result on the page.** The trunk and both strands read as continuous
  bands with smooth edges. The fragments and red incursions are gone. The
  maroon shadow reads as a leather gap between strands, as in the frame, and
  the grey rim reads as smooth leather.

### `glove_builder/make_web.py`

Backups: `make_web.py.bak`, `make_web.py.bak.1`, `make_web.py.bak.2`, all
gitignored. (Rounds 3 and 4 made no change here.) Round-4 backups:
`trace_trapeze.py.bak.1`, `runs/store-modified-trapeze/{masks,trace.json}.bak.1`,
`WEB-ASSET-HANDOFF.md.bak.1`.

- **Specs:** the unshipped outline/hue specs are replaced by
  `"traced": runs/store-<slug>/masks`, plus a `finger_poly`.
- **Gating:** everything below applies only to traced lattice specs
  (`lattice = "traced" in spec`). The other webs take the same code paths as
  before.
- **Masks:** `cut()` reads the traced masks, and the traced windows are used
  as photographed.
- **Finger strip:** carried the way Spiral I, Standard I and SMK already do
  it. The photograph shows the lattice laces tucking in behind a smooth index
  finger, so the strip hides the calibration H-web's half-loops on back 3
  (Astra #4).
  - Lace inside the strip is kept whole as lace: the lace ends, and the
    Trapeze's one lace loop through the finger.
  - `settle()` brings the strip's tonal spread down to back 3's, measured over
    the same pixels (Modified Trapeze 7.0:1 → 1.6:1). Otherwise a black
    finger strip painted white shows grey smudges.
- **Fit, then conform:**
  - `fit(outline_only=True)` clips to the calibration glove's outline without
    its H-web holes. Those holes had been deleting real lace and windows, and
    the fill then invented about 11,000 px of leather.
  - `conform()` is a thin-plate spline that bends the fitted web's outline the
    last 35–49 px onto the opening's outline. It is held at zero 60 px inside
    the opening, so the post, the lattice and the windows keep their fitted
    geometry. It moves pixels and never adds or removes any.
  - Invented fill in the opening fell from 19,013 px to 1,775 (Trapeze) and
    1,616 (Modified Trapeze), about 1.4% of the 118,256 px opening. This
    removed the flat triangle at the join (Astra #1).
- **Heel and strap:**
  - No rows below the opening are kept for lattices. That removed the
    detached horizontal lace strip under a cut (Astra #1).
  - The web's own strap may lie over the knot footprint the page already
    heals, and out to its traced end.
- **Photographed shading kept:** `relief()` uses sigma 40, with a mask-aware
  mean and a wider clamp, so the shadow one lace throws on the next survives.
  The old sigma 13 made crossings merge into flat blobs, which is Astra #2/#3
  as seen on the page. The synthetic `cord()`/`emboss()` pass is skipped for
  lattices, because it drew false ridges on flat straps.
- **Opacity:** lace and leather interiors are snapped from alpha ≥ 245 to 255.
  Otherwise 1–2% of the other colour, or of the glove's own lacing, showed
  through, and changing one colour control moved the other part by up to 3
  levels.
- **Report:** `report.json` now records the photo→canvas homography and the
  largest conform move.

### Registration (narrow)

- `customiser/glove-catalog.js` (backup `glove-catalog.js.bak`): `render:
  'modified-trapeze'` and `render: 'trapeze'` are added. Nothing else changed.
- `customiser/assets/glove-data.json` (backup `glove-data.json.bak`): added
  `webs.trapeze` and `webs.modified-trapeze` (`web`, `laceweb`, `webfinger`,
  `knot: true`), their 12 `assets` paths and `bbox`es, and 6 `sheen` scales.
  No existing value changed.
- 12 new `customiser/assets/{web,laceweb,webfinger}_{trapeze,modified-trapeze}[_hi].webp`
  files, about 220 KB in total.
- `layers/webs/{trapeze,modified-trapeze}/{leather,lace,finger}.png`: the
  inputs `build_assets.py` reads, as for every other web.
- `runs/web-<slug>/{check.jpg,fit.jpg,report.json,window_aligned.png,invented.png}`.
  The 5–6 MB photo-space intermediates are regenerated by `make_web.py` and not
  committed.

### New check: `glove_builder/trapeze_check.mjs`

- **What it covers.** For each web and each hand, the page is loaded through
  local storage with the web chosen at the size it is sold in, and rendered
  in six colourings:
  - the photographed colours
  - red/yellow/white
  - royal/white/black
  - white/black/navy
  - two single-control changes
- **What it asserts:**
  - web leather and lace read their chosen colours, within 25 (the
    `render_check` tolerance);
  - at least 97% of the traced windows are open on the canvas (pixels under
    back 3 are excluded);
  - changing the web colour moves zero lace pixels, and changing the lace
    colour moves zero leather pixels;
  - the left hand mirrors the right, with a worst channel difference ≤ 4.
- **Speed and output.** Metrics are computed in the page and the regions come
  back as one base64 string, so the whole run takes about 45 s instead of
  minutes. Every render is written to `--out` as PNG.

I did not weaken any threshold to fit a shipped web, and I stopped measuring
the baseline webs as Astra asked.

## Exact tests run (final state)

Environment:

```
PW_CHROMIUM='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
NODE_PATH=/Users/scottprins/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules
```

- **`PORT=8801 node glove_builder/trapeze_check.mjs --out /tmp/tz/check3`: all
  passed.**
  - Trapeze: leather off by 13.9, lace off by 12.1–13.9, windows 98.7% open
    (of 5,378 px).
  - Modified Trapeze: leather off by 13.9, lace off by 13.9, windows 99.6%
    open (of 7,951 px).
  - Colour independence (round 4): 0 of 86,999 (Trapeze) and 62,754
    (Modified Trapeze) lace pixels moved, and 0 of 21,904 and 41,885 leather
    pixels moved. Windows are 98.7% / 99.6% open, and LHT mirrors RHT with a
    worst difference of 0.
  - Round 4 also re-ran `render_check`, `state_check`, `keyboard_check`,
    `studio_check` and `sheen.py --check`: all pass.
  - These passing is necessary but not sufficient. They passed on the
    previous commit too, while the labels were wrong.
  - Mirroring: LHT = RHT with a worst difference of 0.
- **`PORT=8802 node glove_builder/render_check.mjs`: "all zones render the
  colour they were given".**
  - It imports `/tmp/pw/node_modules/playwright`, so I made a /tmp symlink to
    the runtime above. That is not a global change.
- **`PORT=8803 node glove_builder/state_check.mjs`: all PASS.**
- **`PORT=8804 node glove_builder/keyboard_check.mjs`: all PASS.**
- **`PORT=8805 node glove_builder/studio_check.mjs`: PASS.**
- **`.venv/bin/python glove_builder/sheen.py --assets glove_builder/customiser/assets --check`:
  "glove-data.json matches the assets".**
- **Not run:** `colour_evidence.py --check`. It is unrelated to webs and needs
  the colour-evidence photo folder.

The Python work ran in a local `.venv` (Python 3.14; numpy 2.5, scipy 1.18,
opencv-headless 5.0, Pillow 12.3), which is gitignored. There were no global
installs.

## What I visually inspected

**Round 3.**
- **Source against labels.** DSC05720 at full resolution, lifted, beside the
  labels in six tiles down the post: before the fix, then with floors of 45
  and 60, then after.
- **Trapeze labels.** DSC05716 at 3× beside its labels in four tiles down the
  post (photo x 1170–1350, y 380–1100), plus relit-L and a*−b* maps. The cream
  post is continuous leather and the dark laces cross it, so no change was
  needed.
- **Source beside overlay beside render** (white web / black lace / navy
  body): the scalloped patches are gone.
- **Contact sheets of all eight renders per web** (photographed colours,
  red/yellow/white, royal/white/black, white/black/navy, RHT and LHT), plus a
  2× crop of the Modified Trapeze's right ladder on the white-web render.

**Earlier rounds:**

- **Source against class overlay.** I compared the source frames with the
  class overlays at 2–4× on:
  - both posts (Trapeze photo x 1180–1330, y 420–1080; Modified Trapeze
    x 1270–1400, y 650–990);
  - the finger joins;
  - both bases and straps.
- **Source against render.** I put the source, warped by the fitted
  homography, beside the page render in the photographed colours for both
  webs.
- **Every page render**, RHT and LHT, on contact sheets: the photographed
  colours, red/yellow/white, royal/white/black and white/black/navy for both
  webs.
- **Close-ups of Astra's four regions** at 2–3× on a magenta page background,
  so that any gap reads as a hole: the joins at render (580–640, 600–650) and
  (650–780, 710–730), the posts, and the top join (x 635, y 100–250).
  - The flat red triangle and the horizontal cut are gone.
  - The Trapeze post is one continuous piece of leather with laces crossing
    it, and there are no lace islands in it.
  - ~~The Modified Trapeze post shows the black leather between crossings
    wherever the photograph does.~~ Wrong, as Astra showed: the post's
    reflected light was labelled lace. That claim came from looking at an
    overlay at page scale, not at the frame. Corrected in round 3.
  - The H-web half-loops at the finger edge are gone. The laces end at the
    finger's edge, as photographed.

## Remaining uncertainty and visible residuals

1. **Hairline at the finger join.** A 1 px pale hairline shows on the finger
   join when the lace is light and the body dark (for example white lace on
   black). It is web lace lying under the finger strip's edge, which the
   photograph says the lace does. `build_assets.py` feathers every
   `webfinger` with a Gaussian of sigma 3, and the lace shows through the
   feather. The fix would be a narrower feather in `build_assets.py` or the
   engine, which is not mine to change, and it affects the three other webs
   that carry a strip.
2. **Stock knot strap stub.** On the Modified Trapeze, and slightly on the
   Trapeze, the end of the calibration glove's knot strap still shows beyond
   this web's own strap. It is a strap-shaped piece in the body colour, left
   of the web's strap at canvas about (545–580, 540–600), and it is in back 2
   and the glove base. It is glove-level (`build_assets.py`'s knot heal) and
   shows under every swapped web. I did not touch it.
3. **Round 4 update to this item.** The lower right (photo y 792–1055) is
   now hand-traced and no longer fragmented. The rest of the right ladder,
   above y 792 (render above about y 425), still uses the `lit_floor` rule.
   On the white-web render some hooks there still have slightly ragged
   shaded ends. They are much less broken than the region Astra flagged,
   but they are the same kind of defect. If Astra wants them traced too, the
   `hand_traced` mechanism takes more zones with no code change.
   - One judgement call inside the traced zone: the upper strand (render
     about x 790–800, y 470–540) is drawn to its visible tip. A darker face
     of it lies along the rim between y 880 and 905 in the photo. I traced
     that face as lace, because in the frame the gold edge continues along
     it. It's the one boundary in the zone I am least sure of.
   - Previous text, kept for the record:
   **Modified Trapeze right ladder, shaded ends (the least certain part).**
   `lit_floor` removes the reflection, but it also ends each hook where the
   hook itself passes into shadow.
   - On a white web the right-ladder hooks show slightly ragged, frayed ends
     and a few small detached fragments. The worst is the lower right,
     render about x 760–820, y 420–640.
   - The frame cannot separate the lace's shaded end from the gold light it
     casts on the post; both measure the same. Pulling the ends back by a
     connectivity rule would bring the scallops back, so I didn't. A proper
     fix would need a hand trace of each right-ladder hook's outline off the
     full-resolution frame. That is feasible, and it is the next step if
     Astra judges this still unacceptable.
   - Faint lighter patches remain in the leather where the reflection was.
     That is the photographed light kept as shading, not a label.
4. **The spline moves the rim.** `conform()` moves the web's outer 35–49 px by
   up to 41.7 px (Trapeze) and 48.6 px (Modified Trapeze), because a 12" and
   a 12.75" web are being dropped into a 12.5" opening. The inner lattice
   stays at its fitted geometry, and nothing is added or removed. Still, the
   rim lacing's spacing is that of the calibration glove's opening, not of
   the photograph.
5. **Knot and strap.** Both webs carry their own strap to its traced end, but
   neither carries a knot. In both photographs the knot is hidden behind the
   heel, and I did not invent one. `knot: true` is set only because that is
   the key `build_assets.py` writes for every web not in `NO_KNOT`. The page
   draws no stock knot under any swapped web either way.
6. **Trapeze right ladder.** Its loops over the post's right edge give that
   edge an irregular outline on the page. At 3× the frame shows the same
   thing, because the loops really do overlap the post there. I'm keeping
   this listed for Astra's eye rather than asserting it is fine.
7. **White web colour.** Picking White for the web (10) on the light page
   makes the windows low-contrast (page #EBEBEB against white leather). That
   is inherent to the page background, not the asset.
8. **Not updated:** `README.md` (still says these two are unshipped) and
   `customiser/dist/index.html` (the single-file bundle, which needs
   `bundle.py`). I left both for Astra's integration to avoid conflicts. I
   did not edit `app.js`, `app.css`, `index.html` or `glove-engine.js`, or
   anything for SMLEE.

## Reproduce

```
.venv/bin/python glove_builder/trace_trapeze.py --web trapeze          # needs the Drive frame
.venv/bin/python glove_builder/make_web.py --web trapeze
.venv/bin/python glove_builder/customiser/build_assets.py --layers glove_builder/layers/rainbow-back-4x --out /tmp/assets
.venv/bin/python glove_builder/trace_trapeze.py --web trapeze --install /tmp/assets
```

Repeat for `modified-trapeze`. The committed masks let you skip the first step.
