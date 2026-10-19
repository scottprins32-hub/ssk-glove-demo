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

## Steps

Product → Model (and material) → Colours → Logos & text → Names & numbers →
Sizes & quantities (roster per player) → Order (several products, club
details, send).

## What is still a placeholder

- **Prices.** Every price in `catalog.js` is `PRICE_PENDING` until Pim's price
  list arrives. The page then shows "Prijs volgt" and never invents a number.
- **Drawings.** `garments.js` draws stand-ins. When Pim's product files arrive,
  replace the drawing and keep the zone ids, so saved designs stay valid.
- **Sending.** "Send request" opens a mail to orders@sskeurope.nl with the full
  spec. Logos travel as attachments the customer adds. Not yet wired to the
  glove's `/api/order` or the CCV checkout.

## Product decisions from Scott (19 Oct 2026)

- Windbreaker: heavy with long sleeves, or light with short sleeves and pockets.
- Hoodie: cotton or polyester (DRI-GEAR).
- Caps: open or closed back. Embroidery from 12 pieces; the page blocks adding
  an embroidered cap to the order under 12.
