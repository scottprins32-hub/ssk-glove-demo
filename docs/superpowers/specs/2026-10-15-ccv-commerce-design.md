# SSK Custom Glove → CCV Shop

Scott approved the proposed full-page configurator plus CCV checkout and asked to build the complete system. Further design approval is already supplied; repeat approval ceremony is skipped. Current shop inspected through its live DOM: https://sskeurope.ccvshop.nl/SSK-Custom-Glove, product ID 896372573, €374.95. Current description links to Google Form 1FAIpQLSeVPgJ36qOKCOqH39xXzNlwy6f1hn6V6wDV_wkbrFF5Wx_CUA. Prepare a replacement link/snippet; preserve the existing shop until the credentialed checkout is proven.

## Contract
Customer enters from that product page, designs full screen, reviews all order fields, saves an immutable snapshot and proceeds to CCV's own checkout. Reference code excludes free-text personalization; snapshot therefore includes validated personalization separately. Store no buyer address/payment data. CCV collects those in checkout. Original draft/save/share behavior stays intact.

Base44 dedicated SSK app stores GloveOrderDraft records with admin-only entity RLS. Public backend permits capability-scoped creation/read/checkout, bounded payloads, expiry and origin checks. Read and checkout use separate random capabilities stored hashed. A shared read link cannot reuse another buyer's basket. Cloning a shared design creates a new private checkout intent. Admin requires Base44 authenticated admin role. Secrets remain server environment variables.

Shared order validator uses current catalogue, active badges, palettes, size/web combinations, per-piece allowed materials and flag-panel coupling. Base €37495 cents, one flag €500 cents, crocodile €0. Client-supplied prices are ignored. Other Flag requires merchant confirmation and cannot enter automatic checkout. Review confirmation is explicit. Preview images remain visual evidence, not order authority; unavailable views remain honestly labeled. Render sources, masks and approved laces are untouched.

## CCV protocol verified from official docs
https://demo.ccvshop.nl/API/Docs/ downloaded to outputs/ccv-integration-research. HMAC-SHA512 signs publicKey|METHOD|URI|exactBody|UTC timestamp, with x-public, x-date, x-hash. GET /api/rest/v1/products/896372573/ validates target. POST /api/rest/v1/orders/ uses is_completed:false and paid:false; default completed:true must never be inherited. customer:{} is required, orderrows include fixed product ID, count1, server price, discount0 and full memo; order_row_taxes_included:true. Shipping/tax are handled by CCV using product context. Response GET order supplies checkout_href/basket_href. Check reservationnumber, currency and total_orderrow_price before redirect. Never infer payment from browser return.

Atomic conditional Base44 updateMany claims a draft before a single CCV POST. Concurrent callers cannot both submit. An uncertain POST or an execution interrupted after the claim stays locked; no automatic POST retry. Admin can reconcile only against a CCV order whose reservationnumber matches the draft. Completed/paid status is read from CCV, never written as paid. Initial checkout isolation creates its own unfinished basket; it does not overwrite the shopper's existing cart.

## Activation and delivery
Build and test all happy/error paths against an isolated local CCV simulator, clearly labeled as a test. Production reports checkout unavailable until CCV_API_KEY and CCV_API_SECRET exist. Shop URL/product ID/return page are already known, not user inputs. A credentialed read-only readiness check validates permissions and prices. A real test checkout remains unverified until keys are supplied. No fake successful payment. No automatic change to Pims live description before readiness.

Provide responsive saved-order page, print/export specification, edit/copy design, safe shop return; separate authenticated merchant list/detail/status/reconciliation and readiness checklist. New commerce code loads only at review/order pages so glove-first rendering is preserved. Native model assets remain byte-exact.

## Verification
Unit/integration tests: tampering, validation, €5 flag, material exclusions, personal text, hashes, HMAC exact body, redirects allowlist, concurrency, uncertain response, expired/unauthorized reads, admin denial, status origin and catalogue parity. Browser: actual builder → save → immutable order → simulated CCV checkout; reload/retry, shared-copy isolation, mobile/tablet/desktop, existing drafts. Independent evaluator before installation/release. No real charge or merchant communications.
