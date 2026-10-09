# I-web width R03 — 2026-10-08

## Completed local scope
- Both horizontal leather bars increased to an intermediate thickness for Standard I and Spiral I in palm and back image studies.
- Standard I leather proportions used as style reference; large X / spiral ties retained.
- Four local HD gallery images and preview cards replaced. Other 20 manifest entries byte-for-byte equivalent as parsed records; all previous originals preserved.
- No production renderer assets changed. No push, merge or deployment this turn.

## Verification actually performed
- Independent fresh-context evaluator opened four selected PNGs, four thin R02 references and two broad R01 palms: PASS for proportions only. See EVALUATION-R1.md. One evaluation round.
- Deterministic: SHA-256 parity of four copied images, preserved disabled maps and productionReady=false, 20 unaffected entries.
- Browser: all four comparison buttons/images; 32× zoom; dark/light background; overview and web-focus reset; synchronized scroll (both panes y=6240 after scrolling from 5520); no console errors.
- Browser: all four local HD gallery selections resolve new native PNGs; stale parts/map controls disabled; no console errors.
- Opened visual evidence: four selected generator images; before/after Standard I palm, Standard I back, Spiral I palm, Spiral I back. Saved full-page UI evidence: evidence/comparison.jpg.

## Remaining / phases skipped
- White/red exterior speckles and some window-edge contamination still require clean cutouts. Independent reviewer explicitly excludes production suitability.
- Exact factory anatomy/dimensions, thumb variants and recolorable-mask registration were not part of this bar-width iteration and are unverified. No engine/build tests because renderer code did not change.
- Deploy skipped: image studies are not clean production cutouts and masks remain disabled. Earlier broader web-rebuild tasks stay open in ../web-rebuild-r03/TASKS.md.

## Open
- Comparison: http://127.0.0.1:8772/2d-glove-candidates/i-web-width-r03/index.html
- Updated local gallery: http://127.0.0.1:8797/hd-webs/
- Source/provenance: GENERATIONS.json. Original full-resolution images retained in generated/. First palm attempts also preserved.
