# SSK CCV Commerce Implementation Plan

Goal: prepare the complete design-to-CCV workflow, leaving merchant API credentials and real checkout validation as explicit activation gates.

Architecture: shared strict order contract, Base44 capability-scoped backend with atomic checkout claim, lazy storefront UI and independent merchant panel. Official CCV protocol is documented in the adjacent spec.

Spec: docs/superpowers/specs/2026-10-15-ccv-commerce-design.md

Constraints: root sole repository writer; preserve all glove assets and existing drafts. No paid credits, Base44 builder AI, full entity sync, guessed API endpoints, completed/paid order creation or live checkout without credentials.

- [x] Contract and backend: generate palette/badge metadata from current assets; write failing node:test coverage for required fields, totals, key hashing, claim races and uncertain POST. Implement pure validation, CCV HMAC adapter and injected repository service. Run tests, then add the Base44 entry point and private schema.
- [x] Customer flow: add lazy review actions, immutable snapshot page, four supported-view previews with honest limits and safe return/edit links. Test missing configuration, duplicate click and price tampering. Preserve the existing image engine bytes.
- [x] Merchant and installation: authenticated admin list/detail/status, conditional reconciliation, setup readiness, shop replacement snippet. Prepare SDK bundle only for admin page. Provision only the new schema and named backend function after scoped independent review.
- [ ] End-to-end: local simulator, browser desktop/mobile/tablet flows and errors; packaging/cache/version checks; fresh independent evaluator, fix findings, save evidence and honest activation instructions. No actual checkout/payment can be called verified without Pims keys.

Implementation executes inline using executing-plans; using another writer is skipped because checkout AGENTS permits only one. Independent evaluation still uses a fresh evaluator as required by SIX.

## Completed evidence and explicit remaining gates

74 deterministic tests passed: 31 commerce, 33 existing loader, 10 packaging/versioning. Generated catalogue/function checks and actual platform atomic-evidence assertions passed. Deployed `ssk-commerce-v10` revision `ccv-r01-14` passed public HTTP saving, reading, separate copy authority, flag pricing, access denial and missing-key blocking. Anonymous entity listing returns no private rows.

Final browser evidence opens the packaged local frontend against that backend at 390/768/1280 widths: four proofs loaded, no horizontal overflow, usable touch controls and exact product return. Independent integration evaluator round 2: bounded PASS. Source renderer/lace hashes unchanged.

The end-to-end checkbox remains open deliberately: a full browser CCV checkout simulator was not executed. Deterministic injected CCV protocol tests and hosted no-key tests replace it only for their specific scopes. Actual CCV keys, tax/shipping/payment, interrupted real checkout reconciliation, authenticated admin browser login and physical-device testing remain unverified. No merchant Google Form replacement or new commerce frontend production publication occurred.
