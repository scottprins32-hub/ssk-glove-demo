Back-view category correction from Scott

Exact285-shape browser export; only Back/Welting7 became laces/Veter (15 unchanged points).
Rebuild:

    python scripts/compile_traced_back_palm.py --view back --audit-dir outputs/back-lace-r16 --asset-dir back-scott-trace-r16 --previous-trace outputs/traced-thumb-r12/trace-original.json

The previous trace identifies its former source dye so that the lace has one neutral colour response; the original source render still contains pink welting. Other views, all geometry, existing lace relief and stitches remain unchanged.
The three changed raster files are welting.webp(1055pixels), laces.webp(1055pixels), idmap.png(864pixels). All other back raster bytes equal R03 originals.
