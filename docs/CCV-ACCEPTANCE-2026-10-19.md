# CCV connection acceptance — 19 October 2026

## Current boundary

Pim's credentials are installed only in the dedicated Base44 secret store under `CCV_SHOP_API_KEY` and `CCV_SHOP_API_SECRET`. The public source and static package contain no credentials. Public ordering remains disabled at the server until Pim approves. The Google Form/product description was not changed.

Active execution name: `ssk-commerce-v14`, API revision `ccv-r02-04`. Public approval switch: `CCV_LIVE_ORDERING_V14_ENABLED=false`. Temporary admin test switch: `CCV_ACCEPTANCE_V14_TESTS_ENABLED=false` after tests. The unversioned legacy switches also stay false. A client request, URL or saved checkout capability cannot override these controls.

## Executed tests

- Authenticated hosted product/price check: product896372573, SSK Custom Glove, €374.95.
- Customer browser: choose right-handed11.75-inchH-Web, save confirmed fixed design, reconstruct all four preview images and specification, reach order review with checkout disabled. Contact details are not needed for saving.
- Actual unpaid/incomplete CCV basket for the €374.95 right-handed case, with separate Crocodile panels and exact QA personalization.
- Actual unpaid/incomplete CCV basket for the €379.95 left-handed case with Japan flag on the middle finger and separate Crocodile panels. Repeating checkout returned the same basket URL. Direct public checkout was rejected while the admin test route worked.
- Both product rows had the correct product, quantity1, quoted price, zero discount, full design specification and an explicit `ACCEPTANCE TEST — DO NOT FULFIL` memo. Neither basket was completed or paid. No customer identity/address/email was submitted.
- CCV reported21%VAT and default Netherlands shipping€9.70: totals€384.65 and€389.65. These are observed default checkout costs, not a promise for other addresses or delivery methods.
- CCV checkout was opened in the browser to inspect product, shipping, VAT, empty customer fields, delivery and payment-method sections. No terms were accepted; `Definitief bestellen` and payment were not used.
- Failed first aggregate-price verification was recovered against its existing CCV ID rather than retried with another POST. Validation now checks the actual product row; CCV's observed aggregate total includes shipping. Known CCV IDs survive later verification failures for reconciliation.

Private runtime evidence and test-basket IDs remain in the local dated release evidence folder; no checkout bearer URLs or secret values are published here.

## Remaining approval and release steps

Pim must approve the recorded design/specification, merchant order handling and shop costs. Complete an explicitly agreed payment test with Pim, including confirmation email, final order status, payment return/cancellation and fulfilment handling. Those paid/completed-order phases have **not** passed through this unpaid test.

After that approval and credentialed acceptance, enable only `CCV_LIVE_ORDERING_V14_ENABLED=true`, verify a fresh public config and checkout, and then replace the product's Google Form link. Keep the temporary test and legacy switches false. Pausing public ordering requires setting the versioned live switch false again; that also blocks previously prepared checkout links.

Physical phones/tablets and country/address-specific delivery acceptance remain separate from browser viewport checks. No glove geometry, image quality or laces were changed by this connection packet.
