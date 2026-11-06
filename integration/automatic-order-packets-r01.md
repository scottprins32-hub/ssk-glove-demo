# SSK order production package

Pim processes orders from the CCV merchant confirmation email (confirmed 6 November 2026). Internal-note links are a fallback, not the main delivery.

`ssk-production-v1` checks transferred snapshots against the authoritative CCV order and exact stored specification/prices. Only completed, non-cancelled orders enter production delivery. It groups up to six custom designs and their actual quantities; ordinary shop items, buyer contact details and retail prices are excluded. Payment and production release remain with SSK Europe.

Each package contains an English specification, four stored view images per design, a PDF and a ZIP preserving original image bytes. A missing/representative view is identified. Unsupported PDF font glyphs are shown explicitly as Unicode codepoints; literal personalization remains in the email and UTF-8 JSON/TXT. Large attachments are grouped into numbered messages under the same order. For an exceptionally large image PDF, the mail carries a specification PDF and original image ZIPs; the full image PDF remains in private administrator storage.

A private `production_delivery` field stores optimistic claims, preparation state and per-message receipts. Unknown delivery outcomes are quarantined for manual provider reconciliation, never automatically resent. Safe rejection can retry only unaccepted parts using the exact saved packet. Native Base44 scheduling runs every five minutes as the creator. `factory.html` is an admin-only status/download fallback; its API uses private-file storage and signed media URLs.

## Sender connection

No mail service is connected as of implementation. Sending is OFF by default; placing orders is independent and remains enabled. Recipient is fixed to **info@sskeurope.com**; no automatic message goes to Japan or the customer. CCV's notification API cannot accept these dynamic attachments.

Configure secrets securely in Base44, never in source/client code:

- SMTP: `SSK_PRODUCTION_MAIL_PROVIDER=smtp`, `SSK_PRODUCTION_FROM`, `SSK_SMTP_HOST`, `SSK_SMTP_PORT` (465 TLS or 587 STARTTLS), `SSK_SMTP_USER`, `SSK_SMTP_PASSWORD`.
- Or verified Resend sender: provider `resend`, `SSK_PRODUCTION_FROM`, `SSK_RESEND_API_KEY`.
- Only after the connection is configured and verified: `SSK_PRODUCTION_MAIL_ENABLED=true`.

An initial live send and mailbox receipt/attachment check are still required. A successful provider response means accepted by the provider, not confirmed inbox delivery. CCV payment notifications and payment configuration are untouched.

## Checks

Node 24: `node scripts/build-order-packet.mjs` and `node --test scripts/test_*.mjs`.
Package checks: `PYTHONPATH=scripts python3 -m unittest scripts.test_base44_package scripts.test_version_site scripts.test_static_site`.
Install generator dependencies via `npm ci --prefix commerce/production --ignore-scripts`. Build output lives in `base44/functions/ssk-production-v1/lib`; no generator dependency is added to the customer frontend.

Independent review found and then verified fixes for six-design mail limits and valid Unicode blocking PDF generation. Source/fixture approval does not establish real mail delivery. No new financial order or payment was created during this work.
