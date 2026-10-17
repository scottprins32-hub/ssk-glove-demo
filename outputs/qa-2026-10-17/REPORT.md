# SSK hard QA — 17 October 2026

Candidate: pending CCV branch d03e4f85 integrated with current main8023bf3d. Existing images, renderer and accepted lace assets retain exact bytes (PACKAGE.json). Production checkout still requires Pims CCV credentials and acceptance.

## Reproduced and fixed

1. Critical published startup failure: actual Base44 UI shows 'De handschoen kon niet worden geladen'; console reports glove metadata could not load. The checked-in Vite dist contains only assets/glove-data-DiAm_s-Y.json, while renderer requests assets/glove-data.json and the three other view metadata files. Npm build now uses the complete validated static asset graph and emits a conventional dist with all four HTML routes and original asset paths. Build/package parity is verified; production has not been republished in this audit.
2. Gallery falsely reported success when localStorage rejected writes. Regression first ran with three failures; store now reports write failures, preserves prior designs and shows actionable recovery. Gallery deletion also reports failure.
3. One malformed gallery entry could crash the complete page. Valid records now survive beside malformed entries.
4. Closed summary remained in keyboard/accessibility navigation because display:flex overrode hidden. Closed drawer now has display:none plus inert/aria-hidden; open/close state is announced and localized.
5. On a 320px phone the price overflowed to354px and language controls collapsed. Header controls now fit at320/390/768; mobile action controls are at least44px high.
6. Save actions had duplicate names but different effects. Device-save and download/share now have distinct labels; successful gallery save offers a direct My designs link.
7. A configuration-service outage prevented viewing a valid saved design. Readable saved design remains visible with checkout disabled if configuration cannot load.
8. Order review exposed internal keys and mixed languages. Localized labels preserve exact authoritative choices and give embroidery colors their numeric code plus name; download uses those same readable rows.
9. Independent review reproduced a save/load race: selected-view completion rebuilt review controls, hiding a successful save. Asset completion now preserves active review and embroidery controls; actual callback regression covers both steps.
10. Integration retained duplicate filenames for identical entity schemas. Only upstream capitalized schemas remain; JSON equality was checked before removing duplicate tracked sources. No remote schemas or records were deleted.

## Executed verification

- 76 Node tests (commerce, existing view loaders, gallery, order handlers) and12 Python packaging/version/static tests. TESTS.txt/PACKAGE-TESTS.txt record final runs.
- Hosted v10 revision14 smoke: real synthetic save/read/copy, separated capabilities, €379.95 flag quote, missing keys503, admin denial403 and bad-origin403. No CCV order/payment writes. Fresh output is outputs/ccv-commerce-r01/HOSTED-SMOKE.json.
- All final package files byte-match manifest. Required metadata and page paths exist; accepted renderer and lace hashes unchanged.
- Browser: new defaults; required confirmation; four order images; exact Unicode names/number; local gallery save/reopen; resume/fresh start; starter/hood color coupling; middle flag and €5; back3/back7 Crocodile with palm exclusion; undo/redo; left hand and12.75web filtering; English switch; actual spec download; anonymous admin gate.
- Responsive builder320/390/768/1280; order390/768/1280. No horizontal overflow. Screenshots/measurements are saved in this directory. Desktop header uses existing40px actions; mobile actions >=44px.

## Scope and remaining work

Browser personas use separate tabs and session authority within one browser, not independent physical devices/accounts. Unit handler tests cover recipient copy and storage denial; absent real CCV keys intentionally disables live checkout. Authenticated merchant acceptance, real CCV permissions, baskets/VAT/shipping/payment/interruption reconciliation, physical phones/tablets and sub-second real-network performance remain unverified. No manufacturing/web geometry acceptance follows from flow tests. No merchant Google Form change or customer message was sent.

Raw browser network inspection was denied by saved CDP permission; no bypass/alternate inspection was attempted. Source build diagnosis uses local filesystem and already-visible error evidence. The generic Vite build failed locally because a native lightningcss binary is absent; the actual replacement static build succeeded without that dependency.

No new commerce frontend or hotfix has been deployed by this audit. The published startup problem therefore remains a live release priority, even though its source/package fix is ready for review. Independent evaluator findings and verdict are recorded separately.

## Review outcome

Two independent rounds executed. Last verdict NEEDS_WORK: the success-path save race was independently verified fixed, but order screenshots were duplicate desktop captures and a rejected-load branch could still hide save failure. After that verdict root fixed the failure branch, added a regression test, replaced captures in the viewport-controlled tab with asserted actual dimensions and opened the corrected phone image. Final counts76Node+12Python. The evaluator did not re-review those final corrections; no third round was run. Independent final acceptance remains open.
