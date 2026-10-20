# Scott palm trace — local builder integration

Source: latest 2026-10-20 exported trace, SHA256 `16be5a33ed3c7b1d58f2e5f17e12b99a86a129776855290a47756adf38bd2190`. All 1,514 input shapes are preserved verbatim in `trace-original.json`. The two final edits are palm Back 9 and the adjacent welting. This installation compiles the 88 palm shapes, including all 40 lace contours and seven explicit opening/remove shapes. Other views retain their existing accepted source assets.

The native H-web palm now uses registered aliases in the real GloveRenderer, including picking, colour controls and saved-order rendering. Alternate web inserts retain their registered original metadata; the H-specific web contour is not transferred to other web geometries. No production deployment, merger or ordering activation is part of this local installation.

Source categories remain authoritative. The unnumbered inside-thumb finger continuation uses Palm, as Scott explicitly requested for this continuous piece. Its polygon is unchanged. Generic finger polygons with an explicit Back number use that field. Explicit categories are not inferred from names: a polygon named Opening but classified Finger remains leather.

Palm and web illumination is normalized on diffuse plates while preserving all masks. The official existing palm artwork is drawn separately and remains readable for both hands. No generated geometry replaces a traced boundary. Generated thread is material artwork only: two parallel curved rows above, matching double rows in the middle, and one straighter lower row. Stitches are six pixels long, spaced 8.5 pixels apart in the registered master view; all thread is clipped to Web and has Stitching pick ownership.

Rebuild prerequisites: Python with Pillow, NumPy and OpenCV. Run `scripts/compile_scott_palm_trace.py --tracer <standalone tracer HTML> --trace <unchanged JSON>`. This rebuilds new masks/metadata only, not legacy files. Serve the repository and open `scripts/compile-palm-web-stitches.html`; save the visible generated result to this folder as `stitching.png`. Run `scripts/finalize_scott_palm_stitches.py`, then `scripts/test_scott_palm_trace.py`. The generated stitch source is preserved as `generated-stitches.png`.

Local review: `http://127.0.0.1:8896/?scott-palm-trace=r01`. The prior simplified trace preview remains separate. Local visual review does not certify every web, manufacture, hosted performance or production readiness.

R02: latest small H-web palm contour correction imported on 2026-10-20. Only the Web H polygon changed in the original trace; the lace asset and all other authored polygons are unchanged. Public render cache revision incremented to prevent showing the preceding contour.
