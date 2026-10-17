# SSK Europe: configurator → CCV Shop

## Verified shop entry and return page

- Product: https://sskeurope.ccvshop.nl/SSK-Custom-Glove
- Product ID: `896372573`; displayed custom price €374.95.
- Configurator: https://ssk-glove-configurator-da8db964.base44.app/
- Admin: configurator URL + `merchant.html`, restricted to Base44 role `admin`.
- Current product description points to a Google Form. Its replacement snippet is below. Do not remove the form until the real checkout acceptance checks pass.

```html
<p>Stel jouw SSK Custom Glove samen met onze configurator. Kies je maat, web, kleuren en personalisatie. Je controleert je ontwerp voordat je in onze webshop afrekent.</p>
<p><a href="https://ssk-glove-configurator-da8db964.base44.app/">Ontwerp jouw SSK-handschoen</a></p>
<p>Custom handschoen: €374,95. Een vlag kost €5 extra. Crocodile pattern heeft geen meerprijs. De verzendkosten zie je bij het afrekenen.</p>
```

## Remaining merchant configuration

Create a CCV API key for the **SSK Europe shop** with permissions:

- GET `/api/rest/v1/products/896372573/`
- POST `/api/rest/v1/orders/`
- GET `/api/rest/v1/orders/:id/`

Store only on the dedicated Base44 backend as secrets `CCV_API_KEY` (public API key) and `CCV_API_SECRET` (HMAC secret). Never put them in HTML, JavaScript, GitHub, a shared design link, or a chat message. Use the Base44 project's Secrets settings. No customer data is requested until CCV checkout.

The app/function ID is `6acecad7d76f2c87da8db964`; function name `ssk-commerce-v10`. Entity RLS permits only admins; the function exposes separate random read/checkout capabilities, storing only their hashes. A shared read link cannot reopen another buyer's cart. Owning checkout capability is kept in sessionStorage, so a different browser creates its own fixed copy. Do not use the visible SSK reference code as authorization.

## Acceptance after keys are installed

1. Sign in to `merchant.html` as admin; use **Winkelaansluiting controleren**. Verify product ID and price. A mismatched price must block creating a cart.
2. With Pim, run one agreed unpaid checkout test: normal €374.95, then flag €379.95. Confirm CCV order row, VAT, shipping, customer details, and full specification including exact personalization. Browser code must never mark paid/completed. Choose an explicitly agreed payment test before paying.
3. Double-click/retry and reload: only one unfinished order for the fixed snapshot. Test a deliberate interrupted API response; admin must reconcile the existing CCV order ID, never blindly create a new order.
4. Verify the order memo opens the matching admin snapshot and four preview notes. Personalization specification governs; not all personalization is drawn. Some non-native thumb views remain intentionally unavailable. Proofs are representative, not manufacturing patterns.
5. Confirm checkout/basket URLs are on `https://sskeurope.ccvshop.nl`. The product page remains the explicit return link. Payment return routing is controlled by CCV and has not been changed by this integration.
6. Only after the above, replace the Google Form link on the product page with the snippet. Keep the old form URL in shop-admin history for rollback.

## Build, tests and deployment

Run from the repository root:

```sh
node scripts/build_commerce_catalog.mjs
node scripts/build-commerce-function.mjs
node scripts/build-commerce-admin.mjs
node --test scripts/test_commerce.mjs
node scripts/build_commerce_catalog.mjs --check
node scripts/build-commerce-function.mjs --check
PYTHONPATH=scripts python3 -m unittest scripts.test_base44_package scripts.test_version_site
python3 scripts/build-base44.py
node scripts/serve-commerce-preview.mjs
```

Preview: http://127.0.0.1:8892/ . It is visibly test-labelled, proxies only config/create/copy/read/status to the deployed function, and blocks checkout and admin calls. Synthetic designs are saved on Base44; it is not an offline simulator.

Deploy only the named `ssk-commerce-v10` function from the linked dedicated Base44 project. Its generated `lib/` contains canonical dependencies because the platform rejects imports outside the function directory. Never use full entity push or `--force` on an existing app. New private schemas were installed individually. Global rate singleton ID `6ad0d87a4f12d75db8726165` must exist: admission fails closed if missing. It bounds saved snapshots at 100/hour across the app, not per visitor. This is a resource bound, not DDoS protection.

Order links expire after 30 days. Expiry blocks capability access; records remain private for administrator support. There is no scheduled deletion yet. Maximum proof payload is 2.6 MB base64; individual image limit 1.1 MB. Source glove images and lace bytes are unchanged. Admin SDK is loaded on the separate admin page; ordering modules load only at review.

## Protocol sources

Official API: https://demo.ccvshop.nl/API/Docs/ (API v1, incomplete orders, order rows, HMAC authentication), linked by https://www.ccv.eu/en/service-contact/developer-portal/webshop-api . Current specification is also recorded in `docs/superpowers/specs/2026-10-15-ccv-commerce-design.md`.

## Proof storage and execution pin

Images are losslessly split into fields of at most 8192 characters within the private snapshot, then reconstructed only after a view-capability or admin check. This avoids the observed Base44 large-string field rejection. A direct 650,000-character storage round trip matched exactly. Private file upload was tested but signed URL creation did not finish; production does not depend on it. No public file hosting is used for customer proofs. The client rejects any API response with a different revision from `ccv-r01-14`. Function `ssk-commerce-v10` is the verified immutable execution name; previous task-created experimental names are retired. Do not assume a successful function deploy means the public runtime switched versions; verify the returned revision.

Proof images originate in the browser and are supporting illustrations, not independently verified production geometry. Server-validated choices and exact personalization are authoritative. Stored proofs are bounded to 2.6 MB base64 per snapshot; the global 100/hour admission limit bounds incoming storage, and is not a per-user limit.

## Current delivery status

Backend v10/revision14 is deployed. The commerce frontend is built and available in the local test preview; the existing production glove frontend is preserved. Final independent integration review passed the bounded build/access/responsive scope. 74 deterministic tests passed. See `outputs/ccv-commerce-r01/STATE.md` for evidence and remaining activation gates.

The production store adapter uses equality-based conditional updates. Observed Base44 no-match HTTP500 responses are handled with bounded rate retries; checkout claim ambiguity fails closed after reading current state. There is no automatic retry of an external order POST. Real interrupted-CCV reconciliation still requires the agreed credentialed acceptance test.
