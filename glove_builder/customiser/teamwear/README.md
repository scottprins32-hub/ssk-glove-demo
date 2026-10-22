# SSK teamwear customiser

Clubs and teams build their kit here and send it to SSK Europe as one team
order. Same layout and step flow as the glove configurator one folder up, in
black, red and white instead of navy.

Serve `glove_builder/customiser/` and open `/teamwear/`. No build step.

| File | What it is |
|---|---|
| `theme.css` | Black / red / white tokens. Same names as `../ds/tokens/colors.css`, so the glove page can switch theme by linking it |
| `catalog.js` | Products, models, colour zones, logo positions, sizes, prices |
| `garments.js` | Flat SVG drawings; every colourable part has `data-zone` |
| `app.js` | Steps, state (localStorage `ssk-teamwear-v1`), team order, request |
| `photos/` | Pim's product photos, background removed, 1000px high WebP |
| `build_photos.py` | Rebuilds `photos/` from Pim's Drive folder (`--src`) |

## Steps

Product → Model (and material) → Colours → Logos & text → Names & numbers →
Sizes & quantities (roster per player) → Order (several products, club
details, send).

## Prices (Pim, 19 Oct 2026)

Heat-applied transfers, EUR per piece, in `catalog.js` `PRICES`:

| Code | | 1 colour | 2 colours | 3 colours |
|---|---|---|---|---|
| LOGO-LG | Large logo | 9.00 | 13.50 | 16.50 |
| LOGO-MD | Medium logo | 7.50 | 11.50 | |
| LOGO-SM | Small logo | 6.00 | 9.50 | |
| T8 | 8 inch number | 7.50 | 12.50 | |
| T3 | 3 inch number | 5.00 | 7.50 | |
| NAME | Name plate | 10.00 | 15.00 | |

Two colours is the standard maximum; three only for a large logo. Text on a
garment counts as a one-colour logo; lettering with an outline counts as two
colours. From 10 pieces of one item, 10% off ("ofzo" — indicative, Pim to
confirm). The order lists every line with its article code.

Still pending: garment prices and embroidery prices (shown as "Prijs volgt").

## Photos

Real photos for BST99 (tee, 9 colours), BST99LS (long sleeve, 8), BSJ200
(light windbreaker, 4, front and back) and HC2 (closed cap, 4, front only, a
350px source). Everything else is still a drawing.

Positions a photo cannot show (back of a tee, the neck, the sleeve) are still
offered and ordered, with a note. Photos are not in the Base44 package: it is
at its 50 MB limit without them. Vercel and Pages serve them.

## What is still a placeholder

- **Drawings** for jerseys, pants, hoodies, heavy windbreaker, polo, open cap,
  socks and bag. Replace with photos and keep the zone ids.
- **Sending** opens a mail to orders@sskeurope.nl with the spec and price
  lines. Logos travel as attachments the customer adds. Not yet wired to the
  glove's `/api/order` or the CCV checkout.

## Product decisions from Scott (19 Oct 2026)

- Windbreaker: heavy with long sleeves, or light with short sleeves and pockets.
- Hoodie: cotton or polyester (DRI-GEAR).
- Caps: open or closed back. Embroidery from 12 pieces; the page blocks adding
  an embroidered cap to the order under 12.
