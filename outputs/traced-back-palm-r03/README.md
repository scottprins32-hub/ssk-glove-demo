# Exact back and palm traces R03

Source SHA256: 1b3d9333a496a3c275f40167b7a3c6e3353ce2db046d5669852504a69d47a4fe

The source export is copied without editing. Explicit category wins over a misleading shape name. The unnumbered palm-side finger piece is Palm; numbered finger pieces retain their Back field. Back7 uses the existing back78 renderer alias, and ring_emb uses embroidery. Back2 stays independent from Palm.

Native H back and palm only. Other registered webs keep their prior plates/inserts rather than inheriting an H-specific perimeter. Thumb and pinky source assets/metadata are unchanged. Original R02 traces and generated material are preserved in Git and their original source directories.

Compile with bundled Python (Pillow/NumPy/OpenCV), PYTHONPATH=/tmp/ssk-trace-deps, scripts/compile_traced_back_palm.py. The saved view-sources.json is sufficient to reproduce the plates. --tracer can refresh sources from the preserved tracer HTML, but never edits it.

Closed source polygons are rasterized at 4x with their original vertices. Only opening/remove categories cut away pixels. Source-photo shadow, baked thread and pores are not ownership boundaries. Leather illumination is normalized and smoothed without changing alpha. Photographed lace/embroidery relief remains within exact traced masks. Prior native overlay repairs are disabled only in the R03 native bundle so they cannot resurrect removed pixels. All alternate-web fallbacks remain intact.

Each open stitch_path is one row: no extra closing edge or parallel row is invented. Rounded thread dashes follow arc length including polyline corners. Physical dash lengths 4px back / 6px palm, gap42% of dash length. The centerline stroke is shortened by its endcap diameter, preserving that actual raster gap. Thread ownership follows stitching and is clipped to retained surfaces and exact cuts.

Checks: 46 loader/cache tests, 5 current trace tests, 2 historical R02 tests, 7 packaging guards and 2 runtime pack guards. Independent review first found legacy late overlays and near-closed dash gaps; both fixed. Current raster: 777 back dashes /775 connected components, 329 palm dashes /329 components; largest component13px. Full new device/performance matrix and manufacturing acceptance not claimed. Pim must approve before live ordering is enabled.

Independent final review: bounded PASS;46 JS and7 trace checks. Confirmed both hands, stamps, Back2 colour/picking, Crocodile alpha and first StandardI selection/returnH. Fixed an additional lazy-palm metadata alias bug found during the second review; setWeb reads current base data and synchronizes before colour-state assembly. Preview cards likewise use their active renderer zone map. No broad device/performance or all-web manufacturing claim.

## Local R06 category correction, 21 October 2026

Scott changed only the category of palm shapes56 and57 (Welting inside wijvinger and Welting wijsvinger5) from Binding to Welting. Current exact export SHA256:e2ad55e9420c9d9799af014c3d6ce89150918b0fb3fc6f4544a4d1b3475c630c. All384names/contours and all lace/seam/cutout inputs remain exact. Derived palmBinding/Welting masks and idmap reflect those categories; all lace/stitch and unrelated-view image bytes are unchanged. Five exact tests and independent category-only review passed. This is local source/preview only; production remains the prior authorized release until a new merge/publication.
