# SSK order production package

Pim processes orders from the CCV merchant confirmation email (confirmed 6 November 2026). Internal-note links are a fallback, not the main delivery.

`ssk-production-v1` checks transferred snapshots against the authoritative CCV order and exact stored specification/prices. Only completed, non-cancelled orders enter production delivery. It groups up to six custom designs and their actual quantities; ordinary shop items, buyer contact details and retail prices are excluded. Payment and production release remain with SSK Europe.

Each package contains an English specification, four stored view images per design, a PDF and a ZIP preserving original image bytes. A missing/representative view is identified. Unsupported PDF font glyphs are shown explicitly as Unicode codepoints; literal personalization remains in the email and UTF-8 JSON/TXT. Large attachments are grouped into numbered messages under the same order. For an exceptionally large image PDF, the mail carries a specification PDF and original image ZIPs; the full image PDF remains in private administrator storage.

A private `production_delivery` field stores optimistic claims, preparation state and per-message receipts. Unknown delivery outcomes are quarantined for manual provider reconciliation, never automatically resent. Safe rejection can retry only unaccepted parts using the exact saved packet. The native Base44 workflow `SSK-orderpakketten` is configured for every five minutes. Its manual execution completed successfully; it is paused until the sender is connected, to avoid repeated paid polling while email cannot be sent. Legacy function automations were refused by the current platform and are not used. `factory.html` is an admin-only status/download fallback (its unauthenticated gate was opened; authenticated browser access remains unverified); its API uses private-file storage and signed media URLs.

## Sender connection

No mail service is connected as of implementation. Sending is OFF by default; placing orders is independent and remains enabled. Recipient is fixed to **info@sskeurope.com**; no automatic message goes to Japan or the customer. CCV's notification API cannot accept these dynamic attachments.

Configure secrets securely in Base44, never in source/client code:

- SMTP: `SSK_PRODUCTION_MAIL_PROVIDER=smtp`, `SSK_PRODUCTION_FROM`, `SSK_SMTP_HOST`, `SSK_SMTP_PORT` (465 TLS or 587 STARTTLS), `SSK_SMTP_USER`, `SSK_SMTP_PASSWORD`.
- Or verified Resend sender: provider `resend`, `SSK_PRODUCTION_FROM`, `SSK_RESEND_API_KEY`.
- Only after the connection is configured and verified: `SSK_PRODUCTION_MAIL_ENABLED=true`.

Hosted preparation and retrieval for existing completed order 28803 were verified; all four ZIP originals match stored preview SHA256/bytes. An initial live send and mailbox receipt/attachment check are still required. A successful provider response means accepted by the provider, not confirmed inbox delivery. CCV payment notifications and payment configuration are untouched.

## Checks

Node 24: `node scripts/build-order-packet.mjs` and `node --test scripts/test_*.mjs`.
Package checks: `PYTHONPATH=scripts python3 -m unittest scripts.test_base44_package scripts.test_version_site scripts.test_static_site`.
Install generator dependencies via `npm ci --prefix commerce/production --ignore-scripts`. Build output lives in `base44/functions/ssk-production-v1/lib`; no generator dependency is added to the customer frontend.

Independent review found and then verified fixes for six-design mail limits and valid Unicode blocking PDF generation. Source/fixture approval does not establish real mail delivery. No new financial order or payment was created during this work.

## Native Base44 mail (13 November 2026)

Base44 now supports PDF/image attachments. The native provider is implemented as `SSK_PRODUCTION_MAIL_PROVIDER=base44` with the same fixed recipient, private claims, stored packets and per-part receipts. No SMTP credential is required once SSK is eligible to receive native mail.

Each design is sent as a numbered message containing one production PDF and its four unchanged original views (at most five attachments; below 5 MB each / 10 MB total). Full source-image PDF pages are preferred; a compact overview is used only if required by the native limit. Full per-view qualifications remain in both email and a PDF appendix. HTML is escaped. ZIP remains an administrator download and is not mailed because native SendEmail rejects archives.

Two initial issues found by independent review were corrected: ambiguous acknowledgements are quarantined rather than marked sent; representative-size/personalization notes are retained. A third PNG stress case was corrected by decoding PNG thumbnail pixels with the existing PDF decoder, retaining all original PNG bytes. Source and bundle pass the accepted-1000px-PNG regression.

Live native preparation for existing order 28803 succeeded. Sending was refused with HTTP 422: the recipient is not a registered app user and this app has no verified custom domain. The legitimate role-user provision alone does not satisfy this provider requirement. No user verification state was fabricated and no provider restriction was bypassed. Native sending is OFF and the workflow remains inactive while the one-time mailbox activation is pending. No successful send or inbox receipt has been established.

Activate the registered SSK recipient through the proper invitation/sign-in process, or configure a verified custom domain/SMTP sender. Only after an accepted live send, enable the sender flag and the workflow. Do not confuse app-user provisioning with successful recipient activation.
