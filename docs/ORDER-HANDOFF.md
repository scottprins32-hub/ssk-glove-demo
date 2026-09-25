# Orders: from the configurator to Pim, paid in the shop

How a finished design becomes an order SSK Europe can send to Japan, without
the configurator storing anything and without a second checkout.

## The flow

1. **Build.** The customer builds one glove, or up to five in one order
   ("Nog een handschoen toevoegen" on the review step). Each glove keeps its
   own SSK2 design code. The buyer's name, phone and e-mail belong to the
   order, not to a glove.
2. **Send.** "Bestelling naar SSK Europe sturen" posts the order to
   `/api/order`. The endpoint gives it an order number, e-mails Pim, e-mails
   the customer a copy, and returns the number. Nothing is written anywhere:
   Pim's inbox is the record.
3. **Pay.** The customer is sent to the existing CCV Shop checkout with three
   instructions: choose the custom glove, set the quantity to the number of
   gloves, enter the order number in the configurator field. The shop's own
   order and payment run as today.
4. **Match.** Pim receives two things that carry the same number: the e-mail
   with the order sheet, and the shop order with the payment. He matches
   them, checks the row, adds the PO number, and it goes into the monthly
   workbook.

The order number is `SSK-YYMMDD-XXXXC`: the date, four characters from an
alphabet without I and O, and a check character. A typo in the shop's field
is caught (`isOrderNumber` in `order-sheet.js`) rather than matched to the
wrong order. Each glove in the mail is `SSK-YYMMDD-XXXXC-1`, `-2` and so on.

## What Pim receives

One e-mail per order, reply-to the customer:

- **Subject** `Custom glove order SSK-260925-7K3QM — Scott Prins (2 handschoenen)`.
- **Body** the order number, the count, the contact details, and per glove
  the full specification as the review step lists it, with its design code.
- **`SSK-order-<number>.xlsx`** the order sheet in his workbook's layout:
  the three header rows of "Order Sheet glove" (No, PO#, REFERENCE#,
  Pattern, Size, QTY RHT/LHT, Finger Pad, ①–⑳ colours as `70.Navy`, ring
  finger embroidery, back style, bullet logo, thumb embroidery, thumb
  number, pattern, embroidery, flags) and one row per glove. Five columns
  are appended after his last one: the order number, the glove's position,
  the design code, phone and e-mail. Copy the rows into the month's workbook
  as they are.
- **One JPEG per glove**, the back view as the customer saw it.

Column rules worth knowing (`order-sheet.js`, `sheetRow`):

| Column | Written as |
|---|---|
| REFERENCE# | the customer's name |
| Size | without the inch sign: `11.75` |
| QTY | `1` under RHT or under LHT |
| Web | `Spiral I WEB`, `H WEB` (the catalogue id with `-Web` replaced) |
| Finger Pad Color | only with a pad or hood fitted; `10.White` when none was chosen |
| Ring Finger Embroidery | `SSK` and the thread colour |
| Back Style | `Conventional` (every SSK Europe order) |
| Thumb Embroidery | name, font, thread; outline thread only for an outline or shadow font |
| Thumb Number | number, circle colour, thread; blank without a number |
| Embroidery | `Please Embroider on Pinky <text> in <Font> <Thread>` |
| Flags | `Please add Netherlands Flag to index finger` |
| Welting Type, Pattern (crocodile emboss), Palm Logo, PO# | left blank: the form has no question for them, so Pim fills them as he does today |

The customer's copy has the same specification, the order number and the
three pay steps, in the language the page was in.

## Two or three gloves

The review step lists the gloves of the order: the ones waiting and the one
on the stage. "Nog een handschoen toevoegen" parks the finished glove and
starts a fresh one (fit and lettering asked again, colours from the blank
starter, buyer kept). "Bewerken" swaps a waiting glove with the one on the
stage; "Verwijderen" drops it. Everything is sent in one request, one mail,
one order number, one workbook with N rows, and the shop quantity is N. The
limit is five (`LIMITS.gloves`), enforced on both sides.

## Setting it up

The endpoint sends through [Resend](https://resend.com). Vercel project
`ssk-glove-demo`, Settings → Environment Variables, production:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | from the Resend dashboard |
| `ORDER_FROM` | a sender on a domain verified in Resend, e.g. `SSK Europe configurator <orders@sskeurope.nl>` |
| `ORDER_TO` | Pim's address |
| `ORDER_CC` | optional, extra recipients, comma separated |
| `CHECKOUT_URL` | optional, the shop page for the customer's mail; the page itself uses `CHECKOUT_URL` in `app.js` |
| `ORDER_ORIGINS` | optional, allowed page origins; default `*` so the single-file bundle inside the shop can post |

Until the first three are set the endpoint answers 503 `not-configured`,
the page says ordering by e-mail is not switched on yet, and the copy /
download buttons remain the way to send a specification.

In the CCV Shop, the custom glove product needs one text field the customer
must fill: name it "Bestelnummer configurator" (CCV product personalisation:
a text field with a character limit; 20 is enough), so an order cannot be
placed without it. Point `CHECKOUT_URL` in `app.js` at that product's page
once it exists; today it is the SSK Custom Gloves category.

## What is not stored, and abuse

The page keeps the draft and the waiting gloves in local storage on the
customer's device, as it did, and clears the waiting gloves once the order is
sent. The endpoint keeps nothing. The e-mail is the record.

The endpoint is public because the page is. It refuses: more than five
gloves, a design code with a wrong check character, a filled honeypot field,
a picture that is not a JPEG under 400 KB, a body over 3 MB, and more than
five orders from one address in a short burst (in-memory, per instance). A
determined sender can still mail Pim; a rate that becomes a nuisance is the
point at which to put a Turnstile or an origin allow-list in front of it
(`ORDER_ORIGINS`).

## Checks

```bash
NODE_PATH=<dir holding playwright> node glove_builder/order_check.mjs
```

Drives the real page in Chromium with the endpoint intercepted (build, add a
second glove, send, read back the request and the pay panel), then feeds the
same request to `api/order.mjs` in dry mode and reads the workbook back cell
by cell against Pim's layout. 55 checks; exit 0 pass, 1 fail, 3 when
Playwright is missing.

## Later

- **Automatic matching.** CCV Shop has a webshop API with webhooks on
  orders. A second function could receive the shop's paid-order event, read
  the order number out of the product field and reply to Pim's mail with
  "paid". That needs API keys from the shop and is not built.
- **Deposit or full price.** The shop product decides; the configurator only
  quotes € 374,95.

## Files

| File | What |
|---|---|
| `api/order.mjs` | the endpoint: validation, order number, mails, workbook |
| `glove_builder/customiser/order-sheet.js` | Pim's columns, the row mapping, the order number, the limits; shared by page and endpoint |
| `glove_builder/order/xlsx.mjs` | a dependency-free workbook writer |
| `glove_builder/customiser/app.js` | e-mail field, the cart, sending, the pay panel |
| `glove_builder/customiser/index.html`, `app.css`, `glove-catalog.js` | the sheet markup, styles and NL/EN strings |
| `glove_builder/order_check.mjs` | the check |
