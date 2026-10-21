# Native H-web thumb trace and circle preview

Local preview only. Scott's final export has 285 shapes in all views; 41 non-stitch thumb contours and 34 open thumb stitch paths. Original JSON is preserved exactly. Only native H thumb assets are installed here; other view contours and original source assets are retained.

Rebuild this thumb package with a Python environment containing NumPy and Pillow:

    python scripts/compile_thumb_trace.py --trace outputs/traced-thumb-r12/trace-original.json --sources outputs/traced-thumb-r12/view-sources.json --report outputs/traced-thumb-r12/BUILD.json

New neutral material plates use exact ownership/cutout geometry and even component shading. Native source image/legacy helpers are disabled for this traced preset. Old web stitching is replaced by dashes on the 34 user paths. Laces use the exact user contours; no existing source lace asset is overwritten.

Generated SSK circular badge is a separate full-resolution cutout. Registration uses opaque-disc bounds rather than stray near-transparent image pixels. Circle and single stitch ring share (390,844), radii61/66. Letters/digits replace the SSK mark when thumbNumber is present; text accepts one/two A-Z/0-9, independent circle and thread colours. Original six circle entries remain in order with eight appended entries within fixed reference-code capacity. Text stays free text outside share codes by existing privacy contract; saved designs/specification retain it. Artwork/text rotate -60 degrees RHT, +60 LHT for readable mirrored placement. Enlarged type uses152/186 pixels for two/one characters on256px tile, roughly15% above the initial preview.

Tests:116 JavaScript checks pass; hosted contract module copies synchronized locally only. Independent evaluator opened centered badge,14/navy/gold and SP/white/black screenshots on both hands and independently passed91 tests. No manufacturing, physical-device, full asset rebuild, captured-order-preview, alternate-web, live publication or merchant acceptance claim. Live ordering remains disabled; no backend deployment performed. The requested ten-minute follow-up was completed and automation deleted when Scott confirmed stitching done.
