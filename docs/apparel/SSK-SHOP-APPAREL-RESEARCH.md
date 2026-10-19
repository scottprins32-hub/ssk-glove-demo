# SSK Europe webshop: apparel & teamwear research

Researched on 2026-10-19 by crawling the live CCV Shop at https://sskeurope.ccvshop.nl (Dutch storefront, `?Lng=en` also exists). Machine-readable data: [`ssk-shop-apparel.json`](./ssk-shop-apparel.json) (2171 product records). No images were downloaded; only URLs are recorded.

## 1. Scope, method and verification status

- **Domains:** `sskeurope.ccvshop.nl` answered (HTTP 200). `www.sskeurope.nl` reset the connection through the proxy, and `sskeurope.com` / `www.sskeurope.com` returned a TLS certificate that does not match the hostname. So everything below comes from the CCV Shop domain. The site itself names `www.sskeurope.com` and `info@sskeurope.com` as its own.
- **Crawl:** I parsed the full category tree from the site menu. Then I crawled every category in scope, following all `?page=N` pages, and fetched and parsed **every product page** (2171 unique URLs).
- **Categories crawled:** Clubkleding (121 club subcategories), Kleding (all 15 subcategories incl. Kingdom > Netherlands/Curaçao), Hoofdklasse Holland Series 2026 (Neptunus, Pirates), Scheidsrechter > Kleding, Tassen (all 5 subcategories) and Accessoires > Toque broek / Fan Artikelen.
- **Partly crawled:** in Accessoires > Overigen, Accessoires > Protective gear, Scheidsrechter > Accessoires, New Arrivals and Zomer Korting, I kept only apparel-type accessories (wristbands, beanies, sun visor, towel, sliding mitts/pads, umpire bag). Bats, gloves, protective guards, eye black, sunglasses and other equipment were left out.
- **What is verified:** every name, URL, SKU, price, size list, option list with surcharges, colour-variant links, image URLs and description is taken directly from the product page HTML. Detail-page prices matched the category-listing prices for every product except one.
- **What is derived (not stated by the site):** the `category` field is my own grouping, based on keyword rules over product name and site category. `brand` is taken from the name; when it is inferred from a model code such as HC2 or PA, the field says so. `colours` comes from the "Kleur" option when one exists, otherwise from the colour word in the product name. Club products are often single-colour SKUs, and other colours appear as separate products linked in `colour_variants`.
- **Known gaps:**
  - Stock levels are not reliable. Pages carry a hidden JS message "Er zijn niet genoeg producten op voorraad" that is not real stock data, so stock is not recorded.
  - One product page (`Hellevoet-Athletics-Windbreker`) did not render a product; only its listing name and price (€ 47,50) are recorded.
  - The size chart for SSK clothing ("Maten SSK Kleding") is an empty page.
  - Images are the 1200x1800 product photos as served; I did not check that they load.

## 2. Shop facts

- Business: **SSK European Baseball Center**, Heulweg 128B, 2295KK Kwintsheul (NL). Tel +31 174 501 888, info@sskeurope.com. Instagram `ssk_europe`, Facebook page linked.
- Shop hours (Openingstijden page): Mon closed; Tue 12:00–16:30; Wed 10:00–17:30; Thu 12:00–16:30; Fri 12:00–20:30; Sat/Sun closed. No garment printing on Friday evening and Saturday (per "Bedrukken Kleding / Caps" page).
- Platform: CCV Shop (Dutch SaaS). Product URLs are either friendly slugs (`/Neptunus-Jersey-HB`) or `/Webwinkel-Product-<id>/<slug>.html`. Category URLs are `/Webwinkel-Category-<id>/<slug>.html`. Product options are CCV "product_attribute" selects or text fields. Colour variants are separate products linked as "Variatie" thumbnails.
- The site has a quote ("offerte") flow besides the basket. Payment: iDEAL, credit card, bank prepayment, or cash/PIN on pickup (Algemene voorwaarden 3.2).

## 3. Visual style

- **Logo:** https://sskeurope.ccvshop.nl/Files/2/81000/81585/Protom/3046376/Media/300x300/ssk%20logo_nl.jpg (a WebP version at the same path + `.webp`). Favicon: https://sskeurope.ccvshop.nl/Files/2/81000/81585/FavIcon/QU78yVk0g8mIN584m8199a33NTL53bN3.ico
- **Font:** Poppins (self-hosted Google font, `/Global/Files/Fonts/Google/Poppins/Poppins.css`) for the whole site. Material Icons and Font Awesome 4.4 are used for icons.
- **Colours (from the template CSS `Template.parsed_31.css` and `Generic.css`):**
  - Text `#111111` on white `#FFFFFF`.
  - Primary buttons black `#000000` with white text, 4px radius, opacity .7 on hover.
  - Footer background `#111111` with white text.
  - Accent lavender/violet `#998FDF`, used for the swiper scrollbar, range slider, checked filters and live-search highlight.
  - Link blue `#0395FF`, plus `#009FDF` for review/collapse links.
  - Borders and greys: `#DDDDDD`, `#E5E5E5`, `#CCCCCC`, `#F8F9FB`.
  - The template sets `header{background:#998fdf}`, but a later rule sets the sticky header background to `#fff`. I did not visually confirm which one wins (no browser render).
- **Header layout:**
  - A top text-link bar: Home, Openingstijden, Algemene voorwaarden, Privacy, Prijslijst, Levertijden, Retour Zenden, Niet Te Ruilen, Maten, Garantie, 3D Geborduurde Caps en Sublimatie Jerseys, Was Voorschrift, Welke Bal Koopt U?, Bedrukken Kleding / Caps, Voorverkoop Aanbieding Ballen 2027. Also an NL/EN language switch and Login.
  - Below it: the logo, a horizontal category slider (Clubkleding, Kleding, Ballen, …), and search/cart/wishlist icons.
  - A mega-menu lists each top category with its subcategories.
- Headings are uppercase (h1), weight 400. Body text is 14px with letter-spacing 1px. Product grids use portrait image tiles, a name, the price and a black "Bekijk" button.

## 4. Category tree (site menu)

- **Clubkleding** (121 club subcategories, listed in section 8)
- **Kleding** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784653/Kleding.html
  - Jerseys — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785103/Jerseys.html
  - Broeken — https://sskeurope.ccvshop.nl/Webwinkel-Category-5761563/Broeken.html
  - Shorts — https://sskeurope.ccvshop.nl/Webwinkel-Category-5972637/Shorts.html
  - Honkbal Jassen — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785105/Honkbal-Jassen.html
  - Windbreakers — https://sskeurope.ccvshop.nl/Webwinkel-Category-5856547/Windbreakers.html
  - Hoodies & T-shirts — https://sskeurope.ccvshop.nl/Webwinkel-Category-5856549/Hoodies-&-T-shirts.html
  - Ondershirts — https://sskeurope.ccvshop.nl/Webwinkel-Category-5856555/Ondershirts.html
  - Compression Gear — https://sskeurope.ccvshop.nl/Webwinkel-Category-15858345/Compression-Gear.html
  - Sliding Broeken — https://sskeurope.ccvshop.nl/Webwinkel-Category-15858455/Sliding-Broeken.html
  - Petten — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785107/Petten.html
  - Riemen — https://sskeurope.ccvshop.nl/Webwinkel-Category-6338657/Riemen.html
  - Sportsokken — https://sskeurope.ccvshop.nl/Webwinkel-Category-6338659/Sportsokken.html
  - Letters & nummers — https://sskeurope.ccvshop.nl/Webwinkel-Category-6302917/Letters-&-nummers.html
  - Kingdom — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785109/Kingdom.html
    - Netherlands — https://sskeurope.ccvshop.nl/Webwinkel-Category-7256373/Netherlands.html
    - Curaçao — https://sskeurope.ccvshop.nl/Webwinkel-Category-7256375/Curaçao.html
  - Wasvoorschrift — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785113/Wasvoorschrift.html
- **Ballen** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5758263/Ballen.html
  - Honkballen — https://sskeurope.ccvshop.nl/Webwinkel-Category-31682106/Honkballen.html
    - Wedstrijdballen — https://sskeurope.ccvshop.nl/Webwinkel-Category-31682112/Wedstrijdballen.html
    - Indoor/Training — https://sskeurope.ccvshop.nl/Webwinkel-Category-31682118/Indoor-Training.html
  - Softballen — https://sskeurope.ccvshop.nl/Webwinkel-Category-31682103/Softballen.html
    - Wedstrijdballen — https://sskeurope.ccvshop.nl/Webwinkel-Category-31682109/Wedstrijdballen.html
    - Indoor/Training — https://sskeurope.ccvshop.nl/Webwinkel-Category-31682115/Indoor-Training.html
- **Knuppels** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784631/Knuppels.html
  - Honkbal — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785159/Honkbal.html
    - Jeugd USA Baseball Bats — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785171/Jeugd-USA-Baseball-Bats.html
    - BB-COR bats — https://sskeurope.ccvshop.nl/Webwinkel-Category-21024366/BB-COR-bats.html
    - Composite — https://sskeurope.ccvshop.nl/Webwinkel-Category-10438742/Composite.html
    - Hout — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785169/Hout.html
    - Senioren — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785167/Senioren.html
    - BeeBall — https://sskeurope.ccvshop.nl/Webwinkel-Category-5880609/BeeBall.html
    - Jeugd Training knuppels — https://sskeurope.ccvshop.nl/Webwinkel-Category-20822851/Jeugd-Training-knuppels.html
  - Softbal — https://sskeurope.ccvshop.nl/Webwinkel-Category-6515859/Softbal.html
    - Fastpitch — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785161/Fastpitch.html
    - Slowpitch — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785163/Slowpitch.html
  - Fungo — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785173/Fungo.html
  - Accessoires — https://sskeurope.ccvshop.nl/Webwinkel-Category-6075605/Accessoires.html
- **Handschoenen** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784651/Handschoenen.html
  - Veld Handschoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-32330970/Veld-Handschoenen.html
  - Catcher Handschoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-32330976/Catcher-Handschoenen.html
  - Eerste Honk Handschoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-32330979/Eerste-Honk-Handschoenen.html
  - Trainings Handschoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-30675194/Trainings-Handschoenen.html
- **Schoenen** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5725725/Schoenen.html
  - Metalen Spikes — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785179/Metalen-Spikes.html
  - Rubber / Plastic Noppen vanaf Maat 35,5 — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785181/Rubber-Plastic-Noppen-vanaf-Maat-355.html
  - Beeball  t/m Maat 35 — https://sskeurope.ccvshop.nl/Webwinkel-Category-31919199/Beeball--t-m-Maat-35.html
  - Turfs/Coach schoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-32426742/Turfs-Coach-schoenen.html
- **Helmen** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5725835/Helmen.html
  - Slaghelmen — https://sskeurope.ccvshop.nl/Webwinkel-Category-7692069/Slaghelmen.html
  - Coach Helmen — https://sskeurope.ccvshop.nl/Webwinkel-Category-7692073/Coach-Helmen.html
  - Accessoires — https://sskeurope.ccvshop.nl/Webwinkel-Category-7692071/Accessoires.html
- **Slaghandschoenen** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784991/Slaghandschoenen.html
- **Catcher** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784701/Catcher.html
  - Complete Sets — https://sskeurope.ccvshop.nl/Webwinkel-Category-31612437/Complete-Sets.html
  - Catcher Handschoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-6053337/Catcher-Handschoenen.html
  - Catcher Helmen — https://sskeurope.ccvshop.nl/Webwinkel-Category-5855653/Catcher-Helmen.html
  - Maskers — https://sskeurope.ccvshop.nl/Webwinkel-Category-5856609/Maskers.html
  - Body Protectors — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784993/Body-Protectors.html
  - Legguards — https://sskeurope.ccvshop.nl/Webwinkel-Category-5856471/Legguards.html
  - Accessoires — https://sskeurope.ccvshop.nl/Webwinkel-Category-5856477/Accessoires.html
- **Veld** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784707/Veld.html
  - Batting Tees — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784921/Batting-Tees.html
  - Screens — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784911/Screens.html
  - Honken — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784929/Honken.html
  - Platen — https://sskeurope.ccvshop.nl/Webwinkel-Category-6053343/Platen.html
  - Indoor — https://sskeurope.ccvshop.nl/Webwinkel-Category-6053345/Indoor.html
  - Accessoires — https://sskeurope.ccvshop.nl/Webwinkel-Category-6053339/Accessoires.html
- **Scheidsrechter** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5784989/Scheidsrechter.html
  - Materiaal — https://sskeurope.ccvshop.nl/Scheidsrechters-Materiaal
  - Kleding — https://sskeurope.ccvshop.nl/Scheidsrechters-Kleding
  - Tassen — https://sskeurope.ccvshop.nl/Tassen
  - Accessoires — https://sskeurope.ccvshop.nl/Scheidsrechters-Accessoires
- **Tassen** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5728421/Tassen.html
  - Player Tassen — https://sskeurope.ccvshop.nl/Webwinkel-Category-20542619/Player-Tassen.html
  - Team Tassen — https://sskeurope.ccvshop.nl/Webwinkel-Category-20542609/Team-Tassen.html
  - Catcher Tassen — https://sskeurope.ccvshop.nl/Webwinkel-Category-32221299/Catcher-Tassen.html
  - Ballen Tonnen/Tassen — https://sskeurope.ccvshop.nl/Webwinkel-Category-20542969/Ballen-Tonnen-Tassen.html
  - Personal Knuppeltassen — https://sskeurope.ccvshop.nl/Personal-knuppeltassen
- **Accessoires** — https://sskeurope.ccvshop.nl/Webwinkel-Category-5856307/Accessoires.html
  - Coaching — https://sskeurope.ccvshop.nl/Webwinkel-Category-31405230/Coaching.html
  - Protective gear — https://sskeurope.ccvshop.nl/Webwinkel-Category-20438274/Protective-gear.html
  - Trainings materiaal — https://sskeurope.ccvshop.nl/Webwinkel-Category-23049906/Trainings-materiaal.html
  - Grip Tape — https://sskeurope.ccvshop.nl/Webwinkel-Category-6338383/Grip-Tape.html
  - Zonnebrillen — https://sskeurope.ccvshop.nl/Webwinkel-Category-7810491/Zonnebrillen.html
  - Handschoen onderhoud — https://sskeurope.ccvshop.nl/Webwinkel-Category-5785037/Handschoen-onderhoud.html
  - Field Masks — https://sskeurope.ccvshop.nl/Webwinkel-Category-6338379/Field-Masks.html
  - Toque broek — https://sskeurope.ccvshop.nl/Webwinkel-Category-6338377/Toque-broek.html
  - Fan Artikelen — https://sskeurope.ccvshop.nl/Webwinkel-Category-5918733/Fan-Artikelen.html
  - Overigen — https://sskeurope.ccvshop.nl/Webwinkel-Category-6338387/Overigen.html
- **Outlet** — https://sskeurope.ccvshop.nl/Webwinkel-Category-10665083/Outlet.html
  - Handschoenen — https://sskeurope.ccvshop.nl/Handschoenen
  - Knuppels — https://sskeurope.ccvshop.nl/Webwinkel-Category-21658107/Knuppels.html
  - Schoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-10665143/Schoenen.html
  - Catcher Uitrusting — https://sskeurope.ccvshop.nl/Webwinkel-Category-10727939/Catcher-Uitrusting.html
  - Slaghandschoenen — https://sskeurope.ccvshop.nl/Webwinkel-Category-10721093/Slaghandschoenen.html
- **New Arrivals** — https://sskeurope.ccvshop.nl/New-Arrivals
- **Zomer Korting** — https://sskeurope.ccvshop.nl/Zomer-Korting
- **Hoofdklasse Holland Series 2026** — https://sskeurope.ccvshop.nl/Hoofdklasse-Holland-Series
  - Rotterdam Neptunus — https://sskeurope.ccvshop.nl/Rotterdam-Neptunus
  - Amsterdam Pirates — https://sskeurope.ccvshop.nl/Amsterdam-Pirates

Other information pages: Prijslijst (https://sskeurope.ccvshop.nl/Webwinkel-Page-1008707/Prijslijst.html), Levertijden (…/Webwinkel-Page-1182239/Levertijden.html), Niet Te Ruilen (…/Webwinkel-Page-1164549/Niet-Te-Ruilen.html), Maten (https://sskeurope.ccvshop.nl/Maten), 3D caps & sublimation (https://sskeurope.ccvshop.nl/3d-borduring), Was Voorschrift (…/Webwinkel-Page-4237210/Was-Voorschrift.html, image only).

## 5. Ordering rules, minimums, lead times, returns

From the **Prijslijst & Bestelvoorwaarden** page (rules dated 1 Nov 2022):
- Custom orders: 100% payment up front starts production. The lead time starts only once payment is received.
- All prices are in EUR **including Dutch VAT**, FOB Kwintsheul. Shipping is extra (Algemene voorwaarden 3.1).
- Custom-made clothing cannot be returned.
- Volume discount for the same colour/combination: **50 pcs → 4%**, **100 pcs → 6%**.

**Minimum quantities** stated on the site:
- Custom team jerseys (SSK JE models): "MINIMUM AFNAME EERSTE BESTELLING IS 6 STUKS". 15 products show their price as "per 6 stuks 1e bestelling", i.e. 6 pieces on the first order and single pieces afterwards.
- Sublimated jerseys: € 40 incl. all prints at 6–72 pcs (3d-borduring page).
- 3D-embroidered HC2 caps: minimum 12, € 20,00 each at 12+.
- Cap team-name lettering: minimum 12.
- The CCV cart itself enforces a minimum of 1 on every product.

**Lead times (Levertijden page, working days, counted from payment):**

| Product type | Lead time |
|---|---|
| Standard game wear (normal-length pants, club jerseys) | 30–35 working days |
| Special pants (+30 cm or non-standard colours) | 36–45 |
| SSK pants PA Ladies / PA Pro (if not in stock) | 30–36 |
| Club and student jackets | 36–45 (*) |
| Windbreakers (if not in stock) | 30–42 (*) |
| Stock items (web orders) | 3–5 |
| Printing on stock items | +3–5 |

(*) May take longer for orders under 3 pieces. The peak season (April–June) can be slower. The atelier is in the Czech Republic: closed 24 Jul–7 Aug, 24–31 Dec, and on Czech holidays (28 Sep, 28 Oct, 17 Nov) plus Dutch holidays.

Some product descriptions give their own lead times: custom SSK jerseys "5–6 weeks incl. printing", sublimated jerseys "within 2½ weeks after approval", Nederland P12 jersey "1–6 weeks".

**Not returnable (Niet Te Ruilen):**
- Any clothing with a club name, logo, number or player name.
- Pants with non-standard length (+0/Knicker, -10, +30 cm) or with trim.
- All caps (made to order).
- Wrong size chosen on made-to-measure items.
- Wrongly returned parcels are sent back for € 9,70.

## 6. Personalisation / decoration pricing

### 6a. Price list (Prijslijst page) — decoration options

Sewn-on ("opgenaaid") letters and numbers are available **only on SSK garments, not on Champro**.

| Code | Description | Price |
|---|---|---|
| Teamname TW 1 | Full-chest team name, 1-colour Pro Twill, sewn | € 11,50 |
| Teamname TW 2 | Full-chest team name, 2-colour Pro Twill, sewn | € 16,50 |
| Teamname VF | 1-colour Flex, heat applied (V-neck/2-button only) | € 9,00 |
| Teamname TW Heat | 1-colour Pro Twill, heat applied (V-neck/2-button only) | € 9,00 |
| Teamname VF 2 | 2-colour Flex, heat (V-neck, 2-button or back) | € 13,50 |
| Teamname TW 2 Heat | 2-colour Twill, heat (V-neck, 2-button or back) | € 13,50 |
| Letter TW 1 / TW 2 | Single chest letter (max 6"), sewn, 1 / 2 colours | € 9,00 / € 12,50 |
| Letter TW 1 Heat / TW 2 Heat | Single chest letter, heat, 1 / 2 colours | € 7,50 / € 11,50 |
| T8 TW 1 / T8 TW 2 | 8" back number, sewn, 1 / 2 colours | € 11,00 / € 16,00 |
| T8 VF / T8 TW 2VF | 8" back number, heat, 1 / 2 colours | € 7,50 / € 12,50 |
| T3 TW 1 / T3 TW 2 | 3.5" chest/sleeve number, sewn, 1 / 2 colours | € 7,50 / € 10,00 |
| T3 VF / T3 TW 2VF | 3.5" chest/sleeve number, heat, 1 / 2 colours | € 5,00 / € 7,50 |
| Nameplate 1 TW / 2 TW | Name on jersey, sewn, 1 / 2 colours | € 15,00 / € 22,50 |
| Nameplate 1 TW Heat / 2 TW/FL Heat | Name on jersey, heat, 1 / 2 colours | € 10,00 / € 15,00 |
| T-grip 1kl Med / Lrg | Heat-applied screen print 1 colour, 10x35 cm / 25x35 cm | € 7,50 / € 8,50 |
| Cap 1" Teamname | Team name side/back of cap, script (min 12 pcs) | € 1,50 p.st. |
| Cap 1" Number | Number side/back of cap | € 2,00 p.st. |
| Cap 1" Name | Name side/back of cap | € 3,00 p.st. |
| AN15 | Jersey neck trim (solid / 3-colour, 3/8") — not Champro | € 7,50 |
| AS25 | Sleeve trim (max 1.5") — not Champro | € 5,00 |
| AC25 | AN15 + AS25 combined | € 11,00 |
| NL model 3/8 trim | Neck & arm trim for NL-model jersey | € 11,00 |
| Two tone | Jersey with different-colour sleeves | € 10,00 |
| Pants +20 cm / +30 cm | Extra length (not PA-ECO / PA-BUDGET) | € 7,00 / € 12,50 |
| PN15 | Pants side trim (max 1") | € 6,50 |

### 6b. Options actually offered on product pages (club wear), with surcharges

These are the CCV options seen across the 2171 crawled products. They are the de facto online personalisation menu.

| Option label | Choices with surcharge (number of products) |
|---|---|
| Naam | (free text field) (1228); Ja: +€ 8,50 (720); Ja (2 Kleur Naam): +€ 16,00 (2); Ja (1 Kleur Opgenaaid): +€ 12,50 (2) |
| Naam Ja of Nee | Ja (1 kleur): +€ 8,50 (50); Ja (2 kleuren): +€ 16,00 (1) |
| Rugnummer | Ja: +€ 7,00 (639); Ja (één kleur): +€ 7,00 (42); Ja (2 Kleur Nummer): +€ 12,00 (17); Ja (1 Kleur Nummer Opgenaaid): +€ 9,50 (2); Ja (twee kleuren): +€ 12,00 (2); Ja (twee kleuren opgenaaid): +€ 14,00 (1) |
| Borstnummer | Ja: +€ 4,00 (146); Ja (2 Kleur Nummer): +€ 8,00 (1) |
| Borstnummer Ja of Nee | Ja: +€ 4,00 (50); Ja, 2 kleuren: +€ 8,00 (21) |
| Mouwnummer | Ja: +€ 5,00 (127) |
| Nummer | (free text field) (1219) |
| Nummer op mouw | (free text field) (1) |
| Naam Pet + Locatie | Ja, Linkerkant: +€ 4,00 (492); Ja, Achterkant: +€ 4,00 (414); Ja, Links: +€ 4,00 (83); Ja, Achter: +€ 4,00 (66) |
| Nummer Pet + Locatie | Ja, Linkerkant: +€ 3,00 (492); Ja, Achterkant: +€ 3,00 (414); Ja, Links: +€ 3,00 (83); Ja, Achter: +€ 3,00 (66) |
| Club Embleem | Ja: +€ 2,50 (8) |
| Pet logo op short | Ja: +€ 2,50 (3) |
| Inclusief ESRI Logo Achterop | Ja: +€ 8,50 (1) |
| Lengte | 0 cm: +€ 7,50 (28); +20 cm: +€ 7,50 (28); +30 cm: +€ 12,50 (9); +20 cm: +€ 7,00 (4) |
| Inclusief toque | XS: +€ 7,50 (3); S: +€ 7,50 (3); M: +€ 7,50 (3); L: +€ 7,50 (3) |
| Maten | XXXLarge: +€ 3,00 (9); XXXXLarge: +€ 3,00 (4); XXL: +€ 1,50 (1); XXL: +€ 2,50 (1) |

Summary of typical club surcharges:
- Player name on a jersey/hoodie: +€ 8,50 (1 colour), +€ 12,50 (1 colour sewn) or +€ 16,00 (2 colours).
- Back number: +€ 7,00 (1 colour), +€ 9,50 (sewn) or +€ 12,00–14,00 (2 colours).
- Chest number: +€ 4,00, or +€ 8,00 in 2 colours. Sleeve number: +€ 5,00.
- Cap name: +€ 4,00 (left side or back). Cap number: +€ 3,00.
- Club emblem on shorts: +€ 2,50.
- Pants length: +0 cm or +20 cm costs +€ 7,00–7,50, +30 cm costs +€ 12,50; standard is "+10 cm".
- Size surcharges on a few items: XXL +€ 1,50–2,50, 3XL/4XL +€ 3,00.
- Many products have free-text "Naam" and "Nummer" fields (no surcharge on the field itself). They usually sit next to a required yes/no surcharge select.

### 6c. Lettering styles, fonts and number styles (Letters & nummers category page)

- **Materials:** Pro-Twill and "Embroid" fabrics with zig-zag sewn edges. All logos and numbers can be sewn on.
- **Layouts:** Straight, Bookends Reverse, Pro Script, Bridge, Slanted Varsity, Grafity Script, Reverse Bridge, Angled Varsity, Eigen Ontwerp (own design), Double Bridge, Ballpark Tail E, Sweep, Script Tail A, Reverse Sweep, Ballpark Tail B, Vertical Arch, Script Mt Bold Tail C, University Arch, Requested Font, Bookends, Ballpark Script, Bookends Bridge, Brush Script.
- **Letter formats:** Shadow, Welded, Interlock, Loose.
- **Nameplates:** 1-colour, 2-colour, 2-colour on plate.
- **Tails:** A–H.
- **Fonts:** Varsity, Script Mt Bold, Old English, Cooper, College, Brush Script, Briquet, Ballpark, Arial Bold, Allstar.
- **Numbers:** 8.0" Pro Block, 8.0" Helvetica, 8.0" Czech style, 6.0" Arabia, 3.0", 3.5", 4.0".
- This category has no products. It is a reference page with images.

### 6d. Sublimation and 3D-embroidered caps (page "3D Geborduurde Caps en Sublimatie Jerseys")

- Sublimated jerseys cost **€ 40,00 including all prints** (team logo or name, back/sleeve/chest numbers, personal name, gradients) at 6–72 pcs.
- They come with a V-neck or crew neck, in flatback mesh or active cloth. Designs follow the Champro "customize" catalogue. Delivery is about 2½ weeks after approval.
- On the product pages, the sublimated button-down and 2-button JE SUBLI models are € 60,00, and the crew-neck and V-neck sublimated jerseys are € 40,00.
- 3D-embroidered HC2 stretch caps: minimum 12 pcs (mixed sizes allowed), € 20,00 each at 12+. Colour chart image: https://sskeurope.ccvshop.nl/Files/2/81000/81585/FileBrowser/stramien/hc2-alle-kleuren.jpg

### 6e. Base garment price list (Prijslijst), custom teamwear

Jerseys:
- SSK JE-MESH-2, JE-VNK, JE-BUTTON, JE-MESH: € 29,50.
- SSK JE-SL sleeveless, JE-PIN pinstripe, and the NL multi-colour models (JE-MESH-NL-2, JE-BUT-NL-2, JE-MESH-NL, JE-BUTTON-NL): € 39,50.
- Champro BS2: € 28,00. BST62: € 25,00 (white inserts) or € 28,00 (coloured inserts). BS32: € 26,00.
- Webshop prices for some of these differ. For example, "JE FULL Button down model NL" is € 45,00 on its product page and "BST62" is € 28,00 / "BST62 C" € 30,00. The product pages are probably more current.

Pants:
- SSK: PA-ECO € 29,00, PA-BUDGET € 32,50, PA-PRO € 45,00, PA-SI-LADIES € 45,00, PA-GO € 60,00, PA-JAP € 60,00, PA-PINSTRIPE € 55,00.
- Champro: PA11 € 42,00, PA9U € 43,50, PA9 € 40,00, PA10 € 40,00, PA4 € 30,00, PA6 € 32,00.
- Webshop: SSK PA PRO is € 52,50 and PA GO / PA JAP are € 65,00.

Shorts:
- Champro mesh € 15,00, PA-S-ME € 25,00, PA-S-ME-NL € 30,00.
- Webshop: € 15,00, € 27,00 and € 32,50.

Jackets:
- JA-SATIN € 65,00, JA-SATIN-NL € 70,00, JA-SOFTSHELL € 70,00, JA-COMP € 70,00.
- Webshop JA models: € 60–90.

Windbreakers:
- WB Softshell € 38,00, Model NL two-tone € 45,00.

Size charts:
- [Champro pants](https://sskeurope.ccvshop.nl/Webwinkel-Page-3971189/Maten-Champro-Broeken.html): men S–2XL by waist, inseam long/short. Women BP11 knicker S–2XL. Girls S–XL. Youth S–XL.
- [Champro clothing](https://sskeurope.ccvshop.nl/Webwinkel-Page-4094654/Maten-Kleding-Champro.html): youth YXXS–YXL and adult XS–4XL by chest/waist in cm.

## 7. Product counts and price ranges by category

Prices are EUR incl. VAT as shown on the product page (base price before option surcharges). €0 items are club game jerseys shown only as placeholders, or gift cards.

| Category (my grouping) | Products | of which club-specific | Generic | Price min | Price max | Median |
|---|---|---|---|---|---|---|
| Jerseys | 485 | 463 | 22 | € 24,00 | € 60,00 | € 35,00 |
| Pants (broeken) | 112 | 106 | 6 | € 27,00 | € 70,00 | € 52,50 |
| Shorts | 11 | 11 | 0 | € 15,00 | € 27,50 | € 19,00 |
| Jackets (club/BP/softshell/satin) | 100 | 90 | 10 | € 59,95 | € 90,00 | € 80,00 |
| Windbreakers / warm-up | 195 | 185 | 10 | € 37,50 | € 50,00 | € 42,50 |
| Hoodies | 215 | 203 | 12 | € 33,75 | € 44,95 | € 37,50 |
| Sweaters / fleece | 1 | 0 | 1 | € 59,95 | € 59,95 | € 59,95 |
| T-shirts (incl. long-sleeve, raglan) | 88 | 88 | 0 | € 16,95 | € 24,95 | € 17,95 |
| Polos | 0 | – | – | – | – | – |
| Caps / hats / visors / beanies | 615 | 596 | 19 | € 9,00 | € 60,00 | € 16,00 |
| Socks | 36 | 31 | 5 | € 7,50 | € 45,00 | € 8,25 |
| Belts | 31 | 25 | 6 | € 8,25 | € 19,95 | € 10,95 |
| Undershirts / compression / sleeves | 65 | 32 | 33 | € 10,00 | € 39,95 | € 14,95 |
| Sliding shorts, toque/cup, sliding mitts & pads | 28 | 0 | 28 | € 7,50 | € 79,95 | € 34,00 |
| Bags | 152 | 0 | 152 | € 2,95 | € 299,95 | € 62,45 |
| Accessories (wristbands, towel, gift card) | 34 | 0 | 34 | € 3,00 | € 17,50 | € 9,95 |
| Fan items (non-apparel) | 3 | 0 | 3 | € 4,95 | € 10,00 | € 9,95 |
| **Total** | **2171** | 1830 | 341 | | | |

Notes:
- **Polos:** none found anywhere on the site.
- **Sweaters:** only one (SSK Fleece Quarterzip). The SSK Fleecejacks are grouped under jackets.
- **Hats:** there are no separate beanie/trucker categories. Under Armour beanies (UABEANIE, UABEANIE2) appear only in New Arrivals/Zomer Korting and are included under caps.
- **Stirrups:** none found. Only socks/kousen are sold.
- **Bags:** this group includes ball buckets and umpire/catcher equipment bags from the Tassen tree.

## 8. Club collections (Clubkleding)

There are **121 club subcategories** under Clubkleding (1,798 unique products in total), plus:
- **Hoofdklasse Holland Series 2026:** Rotterdam Neptunus (4) and Amsterdam Pirates (18).
- **Kleding > Kingdom:** Netherlands (P12 collector jersey) and Curaçao (8).

118 products appear in more than one club. These are mostly generic coloured items such as belts, socks, undershirts and Champro pants. In those records the JSON `club` field is a list.

### Typical club product template and price ranges (club-specific items)

| Template item | # club SKUs | Price range | Median |
|---|---|---|---|
| HC2 3D flex cap (3D-embroidered logo) | 23 | € 24,95 – € 25,00 | € 24,95 |
| HC4 3D snapback (3D-embroidered logo) | 16 | € 21,95 – € 21,95 | € 21,95 |
| HC2 Champro flex cap (embroidered logo) | 175 | € 12,00 – € 18,95 | € 18,95 |
| HC4 Champro adjustable snapback | 83 | € 15,45 – € 15,45 | € 15,45 |
| PTS65 Richardson sized woolcap | 80 | € 30,00 – € 30,00 | € 30,00 |
| TC/KEN sized woolcap | 77 | € 16,00 – € 16,00 | € 16,00 |
| TC open woolcap | 40 | € 14,00 – € 14,00 | € 14,00 |
| HV6 Champro visor | 93 | € 12,50 – € 17,50 | € 12,50 |
| Practice jersey | 212 | € 34,00 – € 39,00 | € 34,00 |
| BP (batting practice) jersey | 129 | € 32,50 – € 39,00 | € 34,00 |
| Game jersey | 132 | € 30,00 – € 55,00 | € 45,00 |
| Dry Gear T-shirt | 74 | € 16,95 – € 20,00 | € 17,95 |
| Hoodie | 204 | € 33,75 – € 44,95 | € 37,50 |
| Windbreaker short sleeve | 54 | € 39,95 – € 44,95 | € 39,95 |
| Windbreaker | 131 | € 37,50 – € 50,00 | € 42,50 |
| Softshell jacket | 10 | € 75,00 – € 85,00 | € 80,00 |
| Club jacket (satin/combination) | 80 | € 70,00 – € 90,00 | € 80,00 |
| Pants (club colour/pinstripe/trim) | 61 | € 35,00 – € 65,00 | € 47,50 |
| Belt | 25 | € 8,25 – € 19,95 | € 12,95 |
| Socks | 17 | € 7,50 – € 9,00 | € 7,50 |
| Undershirt / compression | 32 | € 12,95 – € 39,95 | € 17,50 |

Typical club page contents:
- Game jersey (often HB/SB variants for baseball/softball), practice jersey, BP mesh jersey.
- Dry Gear T-shirt, hoodie, windbreaker (long and/or short sleeve), club jacket.
- Caps: HC2 flex / HC4 snapback / PTS65 or TC/KEN woolcaps / HV6 visor, often with 3D-embroidered versions.
- Club-colour pants (Champro BP9/BP10/BP60/BP64/BP68/BP9U and SSK PA models incl. pinstripes), belts, socks, undershirts and a short.
- Several clubs say their official game jersey can only be ordered via the club. Those jerseys are listed at € 0,00 or as display-only.

### All clubs

Pants, belts, socks and undershirts in the per-club counts are often shared generic SKUs. "Other" mainly covers belts, socks, undershirts and shorts.

| Club | Category URL | Products | Jerseys | Caps | Hoodies | T-shirts | Windbr. | Jackets | Pants | Other |
|---|---|---|---|---|---|---|---|---|---|---|
| ABF | https://sskeurope.ccvshop.nl/Webwinkel-Category-8482659/ABF.html | 41 | 4 | 7 | 1 | 2 | 2 | 0 | 13 | 12 |
| Adegeest | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743465/Adegeest.html | 44 | 3 | 9 | 2 | 1 | 2 | 1 | 14 | 12 |
| Alcmaria Victrix | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743473/Alcmaria-Victrix.html | 49 | 5 | 8 | 1 | 1 | 3 | 1 | 15 | 15 |
| All In | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743477/All-In.html | 21 | 2 | 0 | 0 | 0 | 1 | 0 | 4 | 14 |
| Almere '90 | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743481/Almere-90.html | 63 | 5 | 13 | 2 | 2 | 2 | 0 | 16 | 23 |
| Alphians | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743483/Alphians.html | 33 | 4 | 7 | 2 | 1 | 2 | 1 | 2 | 14 |
| Amsterdam Pirates | https://sskeurope.ccvshop.nl/Amsterdam-Pirates | 18 | 0 | 0 | 4 | 10 | 2 | 0 | 0 | 2 |
| Arnhem Rhinos | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743491/Arnhem-Rhinos.html | 53 | 4 | 7 | 1 | 0 | 1 | 0 | 28 | 12 |
| Badhoevedorp Badgers | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743493/Badhoevedorp-Badgers.html | 18 | 4 | 2 | 2 | 2 | 2 | 1 | 5 | 0 |
| Batters Putte | https://sskeurope.ccvshop.nl/Batters-Putte | 24 | 2 | 0 | 2 | 1 | 2 | 1 | 7 | 9 |
| Bears | https://sskeurope.ccvshop.nl/Webwinkel-Category-5743497/Bears.html | 34 | 4 | 6 | 2 | 1 | 2 | 1 | 3 | 15 |
| Bedrocks | https://sskeurope.ccvshop.nl/Webwinkel-Category-5876951/Bedrocks.html | 35 | 4 | 1 | 1 | 1 | 1 | 1 | 14 | 12 |
| Biënto | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965189/Biënto.html | 36 | 4 | 7 | 1 | 1 | 2 | 1 | 14 | 6 |
| Blokes | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965849/Blokes.html | 42 | 4 | 6 | 2 | 1 | 2 | 1 | 14 | 12 |
| Blue Birds | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965851/Blue-Birds.html | 43 | 4 | 8 | 1 | 1 | 2 | 1 | 14 | 12 |
| Blue Devils | https://sskeurope.ccvshop.nl/Webwinkel-Category-6096307/Blue-Devils.html | 42 | 4 | 6 | 2 | 2 | 2 | 0 | 14 | 12 |
| Blue Hawks | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965853/Blue-Hawks.html | 33 | 4 | 8 | 1 | 2 | 2 | 2 | 2 | 12 |
| Blue Hitters | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965855/Blue-Hitters.html | 29 | 4 | 6 | 2 | 2 | 2 | 1 | 0 | 12 |
| Blue Socks | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965857/Blue-Socks.html | 42 | 0 | 0 | 0 | 0 | 2 | 0 | 14 | 26 |
| Boosters | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965859/Boosters.html | 43 | 4 | 6 | 2 | 2 | 2 | 1 | 14 | 12 |
| Braves | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965861/Braves.html | 29 | 4 | 0 | 2 | 2 | 2 | 1 | 4 | 14 |
| BSM | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965863/BSM.html | 40 | 4 | 3 | 1 | 2 | 1 | 0 | 14 | 15 |
| Bullfighters | https://sskeurope.ccvshop.nl/Webwinkel-Category-17939084/Bullfighters.html | 41 | 5 | 5 | 3 | 4 | 1 | 0 | 14 | 9 |
| Caps Hoogeveen | https://sskeurope.ccvshop.nl/Webwinkel-Category-6131919/Caps-Hoogeveen.html | 42 | 0 | 10 | 2 | 2 | 2 | 0 | 14 | 12 |
| Cardinals | https://sskeurope.ccvshop.nl/Webwinkel-Category-7507547/Cardinals.html | 18 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 15 |
| Caribe | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965865/Caribe.html | 60 | 7 | 10 | 3 | 4 | 4 | 1 | 17 | 14 |
| Catch | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965867/Catch.html | 34 | 3 | 8 | 2 | 0 | 2 | 1 | 6 | 12 |
| Centrals | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965869/Centrals.html | 32 | 5 | 7 | 1 | 1 | 2 | 1 | 1 | 14 |
| Cheetahs | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965871/Cheetahs.html | 28 | 3 | 1 | 0 | 0 | 1 | 2 | 14 | 7 |
| Curaçao | https://sskeurope.ccvshop.nl/Webwinkel-Category-7256375/Curaçao.html | 8 | 1 | 0 | 3 | 4 | 0 | 0 | 0 | 0 |
| Diamonds Nieuwegein | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965875/Diamonds-Nieuwegein.html | 39 | 4 | 6 | 2 | 0 | 2 | 1 | 11 | 13 |
| Domstad Dodgers | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965877/Domstad-Dodgers.html | 34 | 5 | 6 | 2 | 1 | 2 | 1 | 4 | 13 |
| Double Stars Heiloo | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965879/Double-Stars-Heiloo.html | 46 | 4 | 7 | 3 | 2 | 3 | 1 | 14 | 12 |
| Drachten Diamonds | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965881/Drachten-Diamonds.html | 31 | 4 | 7 | 1 | 1 | 2 | 1 | 3 | 12 |
| Ducks | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965883/Ducks.html | 36 | 4 | 6 | 3 | 2 | 3 | 1 | 4 | 13 |
| DVH | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965885/DVH.html | 41 | 3 | 6 | 2 | 1 | 2 | 1 | 14 | 12 |
| Eagles | https://sskeurope.ccvshop.nl/Eagles | 3 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| Euro Stars | https://sskeurope.ccvshop.nl/Webwinkel-Category-6327479/Euro-Stars.html | 47 | 4 | 11 | 2 | 1 | 2 | 1 | 14 | 12 |
| Falcons | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965887/Falcons.html | 40 | 7 | 6 | 3 | 2 | 4 | 1 | 3 | 14 |
| Flags | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965889/Flags.html | 41 | 4 | 7 | 1 | 1 | 2 | 1 | 14 | 11 |
| Flying Petrels | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965891/Flying-Petrels.html | 47 | 5 | 6 | 2 | 1 | 2 | 1 | 16 | 14 |
| Gemert | https://sskeurope.ccvshop.nl/Gemert | 39 | 3 | 2 | 4 | 2 | 1 | 1 | 14 | 12 |
| Giants | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965893/Giants.html | 41 | 4 | 4 | 2 | 0 | 1 | 1 | 14 | 15 |
| Green Hearts | https://sskeurope.ccvshop.nl/Webwinkel-Category-17713819/Green-Hearts.html | 19 | 4 | 5 | 1 | 1 | 1 | 1 | 1 | 5 |
| Grizzlies | https://sskeurope.ccvshop.nl/Webwinkel-Category-31997598/Grizzlies.html | 24 | 2 | 2 | 1 | 1 | 2 | 0 | 6 | 10 |
| Gryphons | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328217/Gryphons.html | 44 | 4 | 3 | 4 | 1 | 2 | 1 | 17 | 12 |
| H.C.A.W. | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965901/H.C.A.W.html | 39 | 3 | 2 | 1 | 5 | 1 | 1 | 14 | 12 |
| Harriërs | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965897/Harriërs.html | 46 | 6 | 5 | 1 | 1 | 2 | 1 | 18 | 12 |
| Hawks | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965899/Hawks.html | 37 | 5 | 1 | 1 | 1 | 2 | 1 | 14 | 12 |
| Hazenkamp | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328225/Hazenkamp.html | 35 | 0 | 6 | 0 | 0 | 0 | 0 | 14 | 15 |
| Hellevoet Athletics | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965903/Hellevoet-Athletics.html | 31 | 4 | 3 | 1 | 1 | 1 | 1 | 15 | 5 |
| Herons | https://sskeurope.ccvshop.nl/Webwinkel-Category-6267979/Herons.html | 21 | 2 | 1 | 2 | 1 | 2 | 0 | 1 | 12 |
| Hickory | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965905/Hickory.html | 45 | 4 | 7 | 1 | 1 | 2 | 1 | 14 | 15 |
| Hilversum Hurricanes | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965907/Hilversum-Hurricanes.html | 34 | 4 | 5 | 1 | 1 | 2 | 1 | 14 | 6 |
| Hitmanics | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965909/Hitmanics.html | 42 | 4 | 6 | 2 | 1 | 2 | 1 | 14 | 12 |
| Holy | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965911/Holy.html | 34 | 5 | 7 | 2 | 1 | 2 | 2 | 3 | 12 |
| Hoofddorp Pioniers | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965913/Hoofddorp-Pioniers.html | 39 | 2 | 6 | 2 | 1 | 2 | 0 | 14 | 12 |
| Houten Dragons | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965915/Houten-Dragons.html | 31 | 4 | 1 | 2 | 1 | 2 | 1 | 14 | 6 |
| Indians | https://sskeurope.ccvshop.nl/Webwinkel-Category-7507627/Indians.html | 44 | 4 | 6 | 2 | 1 | 2 | 1 | 14 | 14 |
| Kickers | https://sskeurope.ccvshop.nl/Webwinkel-Category-18655070/Kickers.html | 42 | 5 | 7 | 1 | 0 | 1 | 1 | 14 | 13 |
| Kinheim | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965917/Kinheim.html | 34 | 2 | 0 | 1 | 0 | 1 | 1 | 14 | 15 |
| Knickerbockers | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328237/Knickerbockers.html | 46 | 0 | 7 | 6 | 0 | 2 | 2 | 19 | 10 |
| Knights | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965919/Knights.html | 25 | 4 | 6 | 3 | 0 | 2 | 1 | 4 | 5 |
| Maastricht | https://sskeurope.ccvshop.nl/Webwinkel-Category-16635599/Maastricht.html | 52 | 7 | 7 | 2 | 0 | 1 | 3 | 16 | 16 |
| Matchmakers | https://sskeurope.ccvshop.nl/Webwinkel-Category-17688454/Matchmakers.html | 25 | 3 | 7 | 2 | 0 | 2 | 0 | 3 | 8 |
| Moorfielders | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965921/Moorfielders.html | 17 | 3 | 1 | 1 | 0 | 0 | 0 | 0 | 12 |
| MULO | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965923/MULO.html | 40 | 4 | 4 | 1 | 0 | 1 | 1 | 14 | 15 |
| Neptunus | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965927/Neptunus.html | 29 | 4 | 6 | 2 | 0 | 2 | 1 | 3 | 11 |
| Netherlands | https://sskeurope.ccvshop.nl/Webwinkel-Category-7256373/Netherlands.html | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Northern Stars | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965929/Northern-Stars.html | 30 | 3 | 4 | 2 | 0 | 1 | 1 | 14 | 5 |
| Nuenen | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965931/Nuenen.html | 27 | 6 | 0 | 2 | 0 | 2 | 1 | 4 | 12 |
| Odiz Frogs | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965933/Odiz-Frogs.html | 41 | 5 | 7 | 1 | 0 | 1 | 0 | 14 | 13 |
| Olympia Haarlem | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965935/Olympia-Haarlem.html | 35 | 4 | 6 | 2 | 0 | 1 | 1 | 14 | 7 |
| Onze Gezellen | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965937/Onze-Gezellen.html | 32 | 4 | 6 | 2 | 0 | 1 | 1 | 3 | 15 |
| Orioles | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965939/Orioles.html | 51 | 7 | 6 | 4 | 0 | 2 | 1 | 16 | 15 |
| Panters | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965941/Panters.html | 20 | 4 | 1 | 1 | 0 | 1 | 1 | 10 | 2 |
| Phoenix Zeist | https://sskeurope.ccvshop.nl/Webwinkel-Category-23847186/Phoenix-Zeist.html | 24 | 4 | 6 | 1 | 0 | 1 | 0 | 2 | 10 |
| Pioneers Assen | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328255/Pioneers-Assen.html | 43 | 4 | 7 | 1 | 0 | 1 | 1 | 14 | 15 |
| Portland Poema's | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965945/Portland-Poema&#039;s.html | 34 | 2 | 8 | 2 | 0 | 1 | 1 | 14 | 6 |
| PSV | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965949/PSV.html | 30 | 6 | 0 | 1 | 0 | 1 | 0 | 10 | 12 |
| Quick Amersfoort | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965951/Quick-Amersfoort.html | 29 | 4 | 6 | 2 | 0 | 1 | 1 | 3 | 12 |
| Quick Amsterdam | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965953/Quick-Amsterdam.html | 37 | 4 | 4 | 1 | 0 | 1 | 1 | 14 | 12 |
| Radboud Rangers | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965957/Radboud-Rangers.html | 40 | 4 | 7 | 1 | 0 | 1 | 1 | 14 | 12 |
| Rangers Schagen | https://sskeurope.ccvshop.nl/Webwinkel-Category-32132124/Rangers-Schagen.html | 23 | 2 | 2 | 1 | 0 | 0 | 0 | 7 | 11 |
| RCH-Pinguïns | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965959/RCH-Pinguïns.html | 38 | 5 | 5 | 2 | 0 | 1 | 1 | 14 | 10 |
| Red Caps | https://sskeurope.ccvshop.nl/Webwinkel-Category-15524499/Red-Caps.html | 33 | 0 | 17 | 3 | 0 | 1 | 1 | 4 | 7 |
| Red Lions | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965961/Red-Lions.html | 31 | 2 | 5 | 2 | 0 | 2 | 1 | 5 | 14 |
| Red Stars Vitesse | https://sskeurope.ccvshop.nl/Webwinkel-Category-7507983/Red-Stars-Vitesse.html | 18 | 1 | 0 | 0 | 0 | 1 | 1 | 3 | 12 |
| Ridderkerk Rowdies | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965965/Ridderkerk-Rowdies.html | 43 | 6 | 2 | 2 | 0 | 2 | 2 | 14 | 15 |
| Robur '58 | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965967/Robur-&#039;58.html | 36 | 4 | 6 | 3 | 0 | 1 | 0 | 17 | 5 |
| Roef! | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328259/Roef!.html | 43 | 9 | 8 | 2 | 0 | 2 | 1 | 15 | 6 |
| Rooswijk | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328263/Rooswijk.html | 18 | 5 | 4 | 1 | 0 | 1 | 0 | 2 | 5 |
| Rotterdam Neptunus | https://sskeurope.ccvshop.nl/Rotterdam-Neptunus | 4 | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 0 |
| Royals | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965971/Royals.html | 19 | 3 | 3 | 1 | 0 | 2 | 2 | 3 | 5 |
| Saints | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965973/Saints.html | 16 | 4 | 4 | 1 | 0 | 1 | 1 | 2 | 3 |
| Schiedam | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965975/Schiedam.html | 37 | 4 | 0 | 0 | 1 | 3 | 1 | 16 | 12 |
| Sittard Condors | https://sskeurope.ccvshop.nl/Webwinkel-Category-7150387/Sittard-Condors.html | 15 | 5 | 0 | 2 | 0 | 1 | 1 | 4 | 2 |
| Spaarnwoude | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965979/Spaarnwoude.html | 20 | 3 | 1 | 1 | 0 | 1 | 0 | 1 | 13 |
| Spikes | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965981/Spikes.html | 43 | 5 | 8 | 3 | 0 | 1 | 1 | 13 | 12 |
| Stags | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965983/Stags.html | 30 | 5 | 6 | 1 | 0 | 1 | 1 | 4 | 12 |
| Starlights | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965985/Starlights.html | 29 | 4 | 4 | 3 | 0 | 1 | 1 | 5 | 11 |
| Storks | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965987/Storks.html | 47 | 6 | 8 | 1 | 0 | 1 | 1 | 14 | 16 |
| Terrasvogels HB | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965989/Terrasvogels-HB.html | 37 | 4 | 4 | 1 | 0 | 1 | 0 | 14 | 13 |
| Terrasvogels SB | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965991/Terrasvogels-SB.html | 24 | 4 | 4 | 1 | 0 | 1 | 0 | 2 | 12 |
| Tex Town Tigers | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965993/Tex-Town-Tigers.html | 26 | 5 | 4 | 1 | 0 | 1 | 1 | 2 | 12 |
| Thamen | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965995/Thamen.html | 36 | 4 | 6 | 1 | 0 | 1 | 1 | 14 | 9 |
| The Islanders | https://sskeurope.ccvshop.nl/Webwinkel-Category-28063932/The-Islanders.html | 27 | 5 | 7 | 2 | 0 | 1 | 0 | 3 | 9 |
| Tilburg | https://sskeurope.ccvshop.nl/Webwinkel-Category-7507561/Tilburg.html | 38 | 4 | 7 | 1 | 0 | 1 | 0 | 13 | 12 |
| Twins | https://sskeurope.ccvshop.nl/Webwinkel-Category-5965999/Twins.html | 24 | 4 | 3 | 0 | 0 | 0 | 1 | 6 | 10 |
| Uden Red Sox | https://sskeurope.ccvshop.nl/Webwinkel-Category-6618095/Uden-Red-Sox.html | 33 | 7 | 6 | 3 | 0 | 2 | 1 | 4 | 10 |
| Unicorns | https://sskeurope.ccvshop.nl/Webwinkel-Category-20914166/Unicorns.html | 8 | 1 | 2 | 2 | 0 | 1 | 0 | 0 | 2 |
| United | https://sskeurope.ccvshop.nl/Webwinkel-Category-6108297/United.html | 21 | 3 | 0 | 2 | 0 | 2 | 0 | 13 | 1 |
| Urbanus | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328363/Urbanus.html | 36 | 4 | 4 | 1 | 0 | 1 | 0 | 14 | 12 |
| UVV | https://sskeurope.ccvshop.nl/Webwinkel-Category-5966001/UVV.html | 43 | 4 | 8 | 1 | 0 | 3 | 1 | 14 | 12 |
| Vennep Flyers | https://sskeurope.ccvshop.nl/Webwinkel-Category-5966003/Vennep-Flyers.html | 41 | 3 | 6 | 1 | 0 | 1 | 1 | 14 | 15 |
| Vrijbuiters | https://sskeurope.ccvshop.nl/Webwinkel-Category-8530229/Vrijbuiters.html | 41 | 4 | 7 | 1 | 0 | 1 | 0 | 14 | 14 |
| VUC | https://sskeurope.ccvshop.nl/Webwinkel-Category-7507975/VUC.html | 24 | 0 | 6 | 0 | 0 | 0 | 0 | 3 | 15 |
| W.H.S.C. | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328373/W.H.S.C.html | 27 | 0 | 0 | 0 | 0 | 1 | 0 | 14 | 12 |
| Wassenaar | https://sskeurope.ccvshop.nl/Webwinkel-Category-5966007/Wassenaar.html | 37 | 2 | 4 | 1 | 0 | 1 | 0 | 14 | 15 |
| Wizards of Boz | https://sskeurope.ccvshop.nl/Webwinkel-Category-5966009/Wizards-of-Boz.html | 36 | 7 | 4 | 2 | 0 | 2 | 1 | 14 | 6 |
| Wombats | https://sskeurope.ccvshop.nl/Webwinkel-Category-6328381/Wombats.html | 23 | 2 | 6 | 3 | 0 | 1 | 0 | 3 | 8 |
| WSB | https://sskeurope.ccvshop.nl/Webwinkel-Category-5966011/WSB.html | 42 | 4 | 7 | 1 | 0 | 1 | 1 | 14 | 14 |
| Wyck Lions | https://sskeurope.ccvshop.nl/Webwinkel-Category-32539989/Wyck-Lions.html | 31 | 4 | 3 | 2 | 0 | 1 | 0 | 7 | 14 |
| Zuidvogels | https://sskeurope.ccvshop.nl/Webwinkel-Category-5966013/Zuidvogels.html | 26 | 3 | 6 | 0 | 0 | 1 | 0 | 4 | 12 |
| Zwijndrecht | https://sskeurope.ccvshop.nl/Webwinkel-Category-5966015/Zwijndrecht.html | 35 | 8 | 5 | 2 | 0 | 2 | 1 | 3 | 14 |

## 9. Generic (non-club) catalogue, by category

These are the products not tied to a club. Each is a candidate base garment for a customizer. Full details (sizes, options, images, description) are in the JSON.

### Jerseys (22)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [BST62 - Two Button Placket Jersey](https://sskeurope.ccvshop.nl/BST62-Two-Button-Placket-Jersey) | BST62 | € 28,00 / 6 stuks 1e bestelling, daarna per stuk leverbaar |  | black,  scarlet (rood), navy, royal, dark green |  |
| [BST62 C - Two Button Placket Jersey](https://sskeurope.ccvshop.nl/BST62-C-Two-Button-Placket-Jersey) | BST62 C | € 30,00 / 6 stuks 1e bestelling |  | black,  scarlet (rood), navy, royal,  forest green, grey, purple, orange |  |
| [Champro Wildcard Two Button Jersey Black](https://sskeurope.ccvshop.nl/Champro-Wildcard-Two-Button-Jersey-Black) | BS63BW | € 24,00 | YS, YM, YL, YXL, S, M, L, XL, XXL, 3XL | Black |  |
| [Champro Wildcard Two Button Jersey Dark Green](https://sskeurope.ccvshop.nl/Champro-Wildcard-Two-Button-Jersey-Dark-Green) | BS63FGW | € 24,00 | YS, YM, YL, YXL, S, M, L, XL, XXL, 3XL | Dark Green |  |
| [Champro Wildcard Two Button Jersey Maroon](https://sskeurope.ccvshop.nl/Champro-Wildcard-Two-Button-Jersey-Maroon) | BS63MAW | € 24,00 | YS, YM, YL, YXL, S, M, L, XL, XXL, 3XL | Maroon |  |
| [Champro Wildcard Two Button Jersey Navy](https://sskeurope.ccvshop.nl/Champro-Wildcard-Two-Button-Jersey-Navy) | BS63NW | € 24,00 | YS, YM, YL, YXL, S, M, L, XL, XXL, 3XL | Navy |  |
| [Champro Wildcard Two Button Jersey Royal](https://sskeurope.ccvshop.nl/Champro-Wildcard-Two-Button-Jersey-Royal) | BS63RYW | € 24,00 | YS, YM, YL, YXL, S, M, L, XL, XXL, 3XL | Royal |  |
| [Champro Wildcard Two Button Jersey Scarlet](https://sskeurope.ccvshop.nl/Champro-Wildcard-Two-Button-Jersey-Scarlet) | BS63SCW | € 24,00 | YS, YM, YL, YXL, S, M, L, XL, XXL, 3XL | Scarlet |  |
| [Crew neck sublimatie Baseball/softball jersey](https://sskeurope.ccvshop.nl/Crew-neck-sublimatie-Baseball/softball-jersey) | JE SUBLI CREW NECK | € 40,00 / 6 stuks 1e bestelling |  |  |  |
| [JE 2 Button NL - Baseball/softball jersey](https://sskeurope.ccvshop.nl/JE-2-Button-NL-Baseball/softball-jersey) | JE 2 Button NL | € 39,50 / 6 stuks 1e bestelling |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [JE BUTTON - Baseball/softball jersey](https://sskeurope.ccvshop.nl/JE-BUTTON-Baseball/softball-jersey) | JE BUTTON | € 29,50 / 6 stuks 1e bestelling |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [JE BUTTON - Baseball/softball jersey 100% MESH](https://sskeurope.ccvshop.nl/JE-BUTTON-Baseball/softball-jersey-100-MESH) | JE BUTTON MESH | € 29,50 / 6 stuks 1e bestelling |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [JE BUTTON - White Baseball/softball jersey](https://sskeurope.ccvshop.nl/JE-BUTTON-White-Baseball/softball-jersey) | JE BUTTON White | € 29,50 / 6 stuks 1e bestelling |  | White |  |
| [JE FULL Button down model NL - Baseball/softball jersey](https://sskeurope.ccvshop.nl/Webwinkel-Product-140737271/JE-FULL-Button-down-model-NL-Baseball-softball-jersey.html) | JE FULL Button NL | € 45,00 / 6 stuks 1e bestelling |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [JE PIN - Baseball/softball jersey pinstripe](https://sskeurope.ccvshop.nl/JE-PIN-Baseball/softball-jersey-pinstripe) | JE PIN | € 45,00 / 6 stuks 1e bestelling |  |  |  |
| [JE SUBLI 2 BT Two button sublimatie - Baseball/softball jersey](https://sskeurope.ccvshop.nl/Webwinkel-Product-866002350/JE-SUBLI-2-BT-Two-button-sublimatie-Baseball-softball-jersey.html) | JE SUBLI 2 BT | € 60,00 / 6 stuks 1e bestelling |  |  |  |
| [JE SUBLI FULL Button down sublimatie - Baseball/softball jersey](https://sskeurope.ccvshop.nl/Webwinkel-Product-866002320/JE-SUBLI-FULL-Button-down-sublimatie-Baseball-softball-jersey.html) | JE SUBLI FULL | € 60,00 / 6 stuks 1e bestelling |  |  |  |
| [JE SUBLI LADIES Two button dames sublimatie Softball jersey](https://sskeurope.ccvshop.nl/JE-SUBLI-LADIES-Two-button-dames-sublimatie-Softball-jersey) | JE SUBLI LADIES | € 60,00 / 6 stuks 1e bestelling |  |  |  |
| [JE-MESH-2 - SSK Baseball/softball jersey](https://sskeurope.ccvshop.nl/JE-MESH-2-SSK-Baseball/softball-jersey) | JE-MESH-2 SSK | € 29,50 / 6 stuks 1e bestelling |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [Pro Mesh Full Button Sleeveless Jersey](https://sskeurope.ccvshop.nl/Webwinkel-Product-182058111/Pro-Mesh-Full-Button-Sleeveless-Jersey.html) | SSK sleeveless | € 39,50 / 6 stuks 1e bestelling |  | black,  scarlet (rood), navy, white, gold (goudgeel), royal blue. Andere kleuren op aanvraag |  |
| [Scheidsrechters Shirt Honkbal en Softbal](https://sskeurope.ccvshop.nl/Scheidsrechters-Shirt-Honkbal-en-Softbal) | BSR1 | € 35,00 | Adult Small, Adult Medium, Adult Large, Adult XLarge, Adult XXLarge, Adult XXXLarge | Black, Navy |  |
| [V neck sublimatie Baseball/softball jersey](https://sskeurope.ccvshop.nl/V-neck-sublimatie-Baseball/softball-jersey) | JE SUBLI V NECK | € 40,00 / 6 stuks 1e bestelling |  |  |  |

### Pants (broeken) (6)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [BP60DG - Champro Open Bottom Pants Dark Grey](https://sskeurope.ccvshop.nl/BP60-Champro-Open-Bottom-Pants-Dark-Grey) | BP60DG | € 45,00 | YXS, YS, YM, YL, YXL, S, M, L, XL, XXL, 3XL, 4XL | Dark Grey |  |
| [BP68DG - Champro Knicker/Short Pants Dark Grey](https://sskeurope.ccvshop.nl/BP68-Champro-Knicker-Pants-Dark-Grey) | BP68DG | € 47,50 | YXL, S, M, L, XL, XXL, 3XL, 4XL | Dark Grey |  |
| [BPR2 - Champro The Field Baseball Umpire Pants](https://sskeurope.ccvshop.nl/BPR2-Champro-The-Field-Baseball-Umpire-Pants) | BPR2 | € 45,00 | 30, 32, 34, 36, 38, 40, 42, 44, 46 |  |  |
| [PA S ME - Heavy Mesh Short (SSK)](https://sskeurope.ccvshop.nl/PA-S-ME-Heavy-Mesh-Short-(SSK)) | PA-S-ME | € 27,00 |  | Zwart, Navy, Grijs, Wit,  Goud, Scarlet, Cardinal, Oranje, Teal, Kelly groen, Paars, Donker groen, Maroon, Royal |  |
| [PA S ME NL - Heavy Mesh Short (SSK)](https://sskeurope.ccvshop.nl/PA-S-ME-NL-Heavy-Mesh-Short-(SSK)) | PA S ME NL | € 32,50 |  | Zwart, Navy, Grijs, Wit,  Goud, Scarlet, Cardinal, Oranje, Teal, Kelly groen, Paars, Donker groen, Maroon, Royal |  |
| [SSK PA PRO Pants Kelly Green](https://sskeurope.ccvshop.nl/PA-PRO-SSK-Polyester-Baseball/Softball-Pants-Kelly-Green) | PA-PRO-KG | € 52,50 | YXS, YS, YM, YL, YXL, XXS, XS, S, M, L, XL, XXL, 3XL, 4XL | Kelly Green | Lengte: +10 cm (Standaard lengte), +20 cm +€ 7,50, 0 cm +€ 7,50 |

### Jackets (club/BP/softshell/satin) (10)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [JA PERS - Self-assembled Baseball Jackets](https://sskeurope.ccvshop.nl/JA-PERS-Self-assembled-Baseball-Jackets) | JA-PERS | € 60,00 |  | Jeugd maten: YS - YXL |  |
| [JA-COM - Combinatie Honkbal Jas](https://sskeurope.ccvshop.nl/JA-COM-Combinatie-Honkbal-Jas) | JA-COM | € 75,00 |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [JA-COM-NL - Combinatie Honkbal Jas Model NL](https://sskeurope.ccvshop.nl/JA-COM-NL-Combinatie-Honkbal-Jas-Model-NL) | JA-COM-NL | € 80,00 |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [JA-COM-NL-T - Combinatie Honkbal Jas Model NL met trim](https://sskeurope.ccvshop.nl/JA-COM-NL-T-Combinatie-Honkbal-Jas-Model-NL-met-trim) | JA-COM-NL-T | € 90,00 |  | black,  scarlet (rood), navy, royal,  forest green, white, grey, purple, gold, orange, colombia blue, electric orange |  |
| [JA-PERS-NL - Self-assembled Baseball Jacket NL model](https://sskeurope.ccvshop.nl/JA-PERS-NL-Self-assembled-Baseball-Jacket-NL-model) | JA-PERS-NL | € 69,00 | YS, YM, YL, YXL, XXS, XS, S, M, L, XL, XXL, 3XL, 4XL | Jeugd maten: YS - YXL |  |
| [JE SOFTSHELL NL - Softshell Honkbal Jas Model NL](https://sskeurope.ccvshop.nl/JE-SOFTSHELL-NL-Softshell-Honkbal-Jas-Model-NL) | JE SOFTSHELL NL | € 75,00 |  | black, white, royal, navy, scarlet (rood), grey, orange, green, gold |  |
| [JE SOFTSHELL NL-T - Softshell Honkbal Jas Model NL met trim](https://sskeurope.ccvshop.nl/JE-SOFTSHELL-NL-T-Softshell-Honkbal-Jas-Model-NL-met-trim) | JE SOFTSHELL NL-T | € 85,00 |  | black, white, royal, navy, scarlet (rood), grey, orange, green, gold |  |
| [JE-SATIN-NL-T - Nylon Satijn Honkbal Jas Model NL met trim](https://sskeurope.ccvshop.nl/JE-SATIN-NL-T-Nylon-Satijn-Honkbal-Jas-Model-NL-met-trim) | JE SATIN NL-T | € 80,00 |  | gold, white, navy, scarlet (rood), orange, kelly green, purple, maroon, royal |  |
| [SSK Fleecejack Black/Gold](https://sskeurope.ccvshop.nl/SSK-Fleecejack-Black/Gold) | BWF230PL-90 | € 59,95 |  | Black |  |
| [SSK Fleecejack Navy/Gold](https://sskeurope.ccvshop.nl/SSK-Fleecejack-Navy/Gold) | BWF230PL-70 | € 59,95 |  | Navy |  |

### Windbreakers / warm-up (10)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [Champro Short Sleeve Warm-Up Jacket Black](https://sskeurope.ccvshop.nl/Champro-Short-Sleeve-Warm-Up-Jacket-Black) | BSJ200B | € 37,50 |  | Black |  |
| [Champro Short Sleeve Warm-Up Jacket Navy](https://sskeurope.ccvshop.nl/Champro-Short-Sleeve-Warm-Up-Jacket-Navy) | BSJ200NY | € 37,50 |  | Navy |  |
| [Champro Short Sleeve Warm-Up Jacket Royal](https://sskeurope.ccvshop.nl/Champro-Short-Sleeve-Warm-Up-Jacket-Royal) | BSJ200RY | € 37,50 |  | Royal |  |
| [Champro Short Sleeve Warm-Up Jacket Scarlet](https://sskeurope.ccvshop.nl/Champro-Short-Sleeve-Warm-Up-Jacket-Scarlet) | BSJ200SC | € 37,50 |  | Scarlet |  |
| [SSK Long Sleeve Softshell Windbreaker Dark Green](https://sskeurope.ccvshop.nl/SSK-Long-Sleeve-Softshell-Windbreaker-Dark-Green) | SSK-WB-DG | € 38,00 |  | Dark Green |  |
| [SSK Long Sleeve Softshell Windbreaker Maroon](https://sskeurope.ccvshop.nl/SSK-Long-Sleeve-Softshell-Windbreaker-Maroon) | SSK-WB-MR | € 38,00 |  | Maroon |  |
| [SSK Long Sleeve Softshell Windbreaker Navy](https://sskeurope.ccvshop.nl/SSK-Long-Sleeve-Softshell-Windbreaker-Navy) | SSK-WB-NY | € 38,00 |  | Navy |  |
| [SSK Long Sleeve Softshell Windbreaker Royal](https://sskeurope.ccvshop.nl/SSK-Long-Sleeve-Softshell-Windbreaker-Royal) | SSK-WB-RY | € 38,00 |  | Royal |  |
| [SSK Long Sleeve Softshell Windbreaker Scarlet](https://sskeurope.ccvshop.nl/SSK-Long-Sleeve-Softshell-Windbreaker-Scarlet) | SSK-WB-SC | € 38,00 |  | Scarlet |  |
| [Umpire Windbreaker](https://sskeurope.ccvshop.nl/Webwinkel-Product-338702664/Umpire-Windbreaker.html) | UMPWIN | € 47,50 | YS, YM, YL, YXL, XXS, XS, S, M, L, XL, XXL, XXXL, 4XL |  | Rugnummer: Geen Nummer, Ja +€ 7,00; Mouwnummer: Geen Nummer, Ja +€ 5,00; Naam: Geen Naam, Ja +€ 8,50; Nummer: free text; Naam: free text |

### Hoodies (12)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [Champro DRI-GEAR Hoodie Black](https://sskeurope.ccvshop.nl/Champro-DRI-GEAR-Hoodie-Black) | FLH2-BK | € 37,95 |  | Black |  |
| [Champro DRI-GEAR Hoodie Navy](https://sskeurope.ccvshop.nl/Champro-DRI-GEAR-Hoodie-Navy) | FLH2-NY | € 37,95 |  | Navy |  |
| [Custom Hoodie](https://sskeurope.ccvshop.nl/Webwinkel-Product-134526483/Custom-Hoodie.html) | Hoodie 2 | € 37,50 | 104, 116, 128, 140, 152, S, M, L, XL, XXL, 3XL | black, navy, scarlet (rood), royal, dark green, pink, grey | Rugnummer: Geen Nummer, Ja +€ 7,00; Borstnummer: Geen Nummer, Ja +€ 4,00; Naam: Geen Naam, Ja +€ 8,50; Nummer: free text; Naam: free text |
| [Russell Athletic Premium Hoodie Black](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Black) | Z265-BK | € 37,95 | 104, 116, 128, 140, 152, 164, XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL | Black |  |
| [Russell Athletic Premium Hoodie Burgandy](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Burgandy) | Z265-BG | € 37,95 |  | Burgandy |  |
| [Russell Athletic Premium Hoodie Dark Green](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Dark-Green) | Z265-DG | € 37,95 |  | Dark Green |  |
| [Russell Athletic Premium Hoodie Grey](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Grey) | Z265-GR | € 37,95 |  | Grey |  |
| [Russell Athletic Premium Hoodie Navy](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Navy) | Z265-NY | € 37,95 |  | Navy |  |
| [Russell Athletic Premium Hoodie Pink](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Pink) | Z265-FS | € 37,95 |  | Pink |  |
| [Russell Athletic Premium Hoodie Red](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Red) | Z265-RD | € 37,95 |  | Red |  |
| [Russell Athletic Premium Hoodie Royal](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-Royal) | Z265-RY | € 37,95 |  | Royal |  |
| [Russell Athletic Premium Hoodie White](https://sskeurope.ccvshop.nl/Russell-Athletic-Premium-Hoodie-White) | Z265-WT | € 37,95 |  | White |  |

### Sweaters / fleece (1)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [SSK Fleece Quarterzip Navy/Gold](https://sskeurope.ccvshop.nl/SSK-Fleece-Quarterzip-Navy/Gold) | BWF230HZJ-70 | € 59,95 |  | Navy |  |

### Caps / hats / visors / beanies (19)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [AWC - TC Open Wool Cap](https://sskeurope.ccvshop.nl/AWC-TC-Open-Wool-Cap) | AWC | € 14,00 |  | royal, scarlet (rood), dark green, maroon, kelly green |  |
| [AWCS Ken/TC Sized Woolcap](https://sskeurope.ccvshop.nl/Webwinkel-Product-144764039/AWCS-Ken-TC-Sized-Woolcap.html) | AWCS | € 16,00 | 53 cm (= 6 5/8), 53,9 cm (=6 3/4), 54,9 cm (=6 7/8), 55,8 cm (=7), 56,8 cm (=7 1/8), 57,7 cm (=7 1/4), 58,7 cm (=7 3/8), 59,6 cm (=7 1/2), 60,6 cm (=7 5/8), 61,5 cm (=7 3/4) | Scarlet (= rood), Black, Royal, Navy, Dark Green | Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Champro HC2 Flex Cap Black](https://sskeurope.ccvshop.nl/Champro-HC2-Flex-Cap-Black) | Champro HC2 Black | € 14,95 | XS / S (6 1/2 - 7), S / M (7 - 7 1/4), L / XL (7 3/8 - 7 5/8) | Black | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Champro HC2 Flex Cap Navy](https://sskeurope.ccvshop.nl/Champro-HC2-Flex-Cap-Navy) | Champro HC2 Navy | € 14,95 | XS / S (6 1/2 - 7), S / M (7 - 7 1/4), L / XL (7 3/8 - 7 5/8) | Navy | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Champro HC2 Flex Cap Royal](https://sskeurope.ccvshop.nl/Champro-HC2-Flex-Cap-Royal) | Champro HC2 Royal | € 14,95 | XS / S (6 1/2 - 7), S / M (7 - 7 1/4), L / XL (7 3/8 - 7 5/8) | Royal | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Champro HC2 Flex Cap Scarlet](https://sskeurope.ccvshop.nl/Champro-HC2-Flex-Cap-Scarlet) | Champro HC2 Scarlet | € 14,95 | XS / S (6 1/2 - 7), S / M (7 - 7 1/4), L / XL (7 3/8 - 7 5/8) | Scarlet | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Champro Sun Visor](https://sskeurope.ccvshop.nl/CMSV-Champro-Sun-Visor) | CMSV | € 20,00 |  |  |  |
| [FiveStar Custom Sized Woolcap with Stitched Logo](https://sskeurope.ccvshop.nl/FiveStar-Custom-Sized-Woolcap-with-Stitched-Logo) | FiveStar | € 35,00 | 20.6" / 53cm / 6 5/8, 21" / 54cm / 6 3/4, 21.4" / 55cm / 6 7/8, 22.4" / 57cm / 7 1/8, 22.6" / 58cm / 7 1/4, 23" / 59cm / 7 3/8, 23.4" / 60cm / 7 1/2, 23.8" / 61cm / 7 5/8, 24.2" / 62cm / 7 3/4 |  |  |
| [HC4 Champro Open Snapback Cap](https://sskeurope.ccvshop.nl/Webwinkel-Product-807446037/HC4-Champro-Open-Snapback-Cap.html) | HC4 | € 11,45 | S (6 1/2 - 7 1/8), M-XL (7 - 7¾) | Black, Scarlet (= rood), Royal | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [HV6 - Champro Adjustable Visor](https://sskeurope.ccvshop.nl/HV6-Champro-Adjustable-Visor) | HV6 | € 12,50 | S/M, L/XL | Scarlet (= rood), Maroon, Black, Navy, Orange, Dark Green, Royal, Gold, Kelly Green |  |
| [Richardson Sized Woolcap Black](https://sskeurope.ccvshop.nl/Richardson-Sized-Woolcap-Black) | PTS65 Black | € 27,50 |  | Black |  |
| [Richardson Sized Woolcap Navy](https://sskeurope.ccvshop.nl/Richardson-Sized-Woolcap-Navy) | PTS65 Navy | € 27,50 | 21" / 54cm / 6 3/4, 21.4" / 55cm / 6 7/8, 22" / 56cm / 7, 22.4" / 57cm / 7 1/8, 22.6" / 58cm / 7 1/4, 23" / 59cm / 7 3/8, 23.4" / 60cm / 7 1/2, 23.8" / 61cm / 7 5/8, 24.2" / 62cm / 7 3/4 | Navy | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Richardson Sized Woolcap Royal](https://sskeurope.ccvshop.nl/Richardson-Sized-Woolcap-Royal) | PTS65 Royal | € 27,50 | 21" / 54cm / 6 3/4, 21.4" / 55cm / 6 7/8, 22" / 56cm / 7, 22.4" / 57cm / 7 1/8, 22.6" / 58cm / 7 1/4, 23" / 59cm / 7 3/8, 23.4" / 60cm / 7 1/2, 23.8" / 61cm / 7 5/8, 24.2" / 62cm / 7 3/4 | Royal | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Richardson Sized Woolcap Scarlet](https://sskeurope.ccvshop.nl/Richardson-Sized-Woolcap-Scarlet) | PTS65 Scarlet | € 27,50 | 21" / 54cm / 6 3/4, 21.4" / 55cm / 6 7/8, 22" / 56cm / 7, 22.4" / 57cm / 7 1/8, 22.6" / 58cm / 7 1/4, 23" / 59cm / 7 3/8, 23.4" / 60cm / 7 1/2, 24.2" / 62cm / 7 3/4 | Scarlet | Club Embleem: Ja +€ 2,50, Nee; Naam Club: .geen clubnaam (zonder opdruk), Adegeest, Alcmaria Vitrix, Almere '90, Alphians, Arnhem Rhinos; Naam Pet + Locatie: Nee, Ja, Achter +€ 4,00, Ja, Links +€ 4,00; Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [UABEANIE - Under Armour Pom Muts](https://sskeurope.ccvshop.nl/UABEANIE-Under-Armour-Pom-Muts) | UABEANIE | € 15,00 | Boys, Men | Scarlet (= rood), Black, Royal, Navy, Grey |  |
| [UABEANIE2 - Under Armour Muts](https://sskeurope.ccvshop.nl/UABEANIE2-Under-Armour-Muts) | UABEANIE2 | € 15,00 | Boys, Men | Scarlet (= rood), Black, Royal, Navy, Grey |  |
| [Umpire Woolcap Korte Klep](https://sskeurope.ccvshop.nl/Umpire-Woolcap-Korte-Klep) | Umpire Woolcap Korte Klep | € 20,00 | 21" / 54cm / 6 3/4, 21.4" / 55cm / 6 7/8, 22" / 56cm / 7, 22.4" / 57cm / 7 1/8, 22.6" / 58cm / 7 1/4, 23" / 59cm / 7 3/8, 23.4" / 60cm / 7 1/2, 23.8" / 61cm / 7 5/8, 24.2" / 62cm / 7 3/4, 24.6" / 63cm / 7 7/8, 25.0 / 64cm / 8 | Navy, Black | Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [Umpire Woolcap Lange Klep](https://sskeurope.ccvshop.nl/Umpire-Woolcap-Lange-Klep) | Umpire Woolcap Lange Klep | € 20,00 | 21" / 54cm / 6 3/4, 21.4" / 55cm / 6 7/8, 22" / 56cm / 7, 22.4" / 57cm / 7 1/8, 22.6" / 58cm / 7 1/4, 23" / 59cm / 7 3/8, 23.4" / 60cm / 7 1/2, 23.8" / 61cm / 7 5/8, 24.2" / 62cm / 7 3/4, 24.6" / 63cm / 7 7/8, 25.0 / 64cm / 8 | Navy, Black | Nummer Pet + Locatie: Nee, Ja, Achter +€ 3,00, Ja, Links +€ 3,00; Nummer: geen nummer |
| [WOOL - Pro twill cap](https://sskeurope.ccvshop.nl/WOOL-Pro-twill-cap) | WOOL | € 9,00 |  | navy, black, royal, scarlet (rood) |  |

### Socks (5)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [Champro Socks Hot Pink](https://sskeurope.ccvshop.nl/Champro-Socks-Hot-Pink) | AS2H | € 7,50 / paar | XS (t/m maat 37), S (maat 38-42), M (maat 42-46), L (maat 44-48) | Hot Pink |  |
| [Champro Socks Kelly Green](https://sskeurope.ccvshop.nl/Champro-Socks-Kelly-Green) | AS2K | € 7,50 / paar | S, M, L | Kelly Green |  |
| [Champro Socks Orange](https://sskeurope.ccvshop.nl/Champro-Socks-Orange) | AS2O | € 7,50 / paar | XS, S, M, L | Orange |  |
| [Grey Kousen](https://sskeurope.ccvshop.nl/Grey-Kousen) | Kous Grey | € 7,50 / paar | Adult (size 39 to 44) | Grey |  |
| [Maroon Kousen](https://sskeurope.ccvshop.nl/Maroon-Kousen) | Kous Maroon | € 7,50 / paar | Jeugd (t/m maat 38), Adult (size 39 to 44) | Maroon |  |

### Belts (6)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [Champro Belt Colombia Blue](https://sskeurope.ccvshop.nl/Champro-Belt-Colombia-Blue) | A060CB | € 8,25 |  | Colombia Blue |  |
| [Champro Belt Grey](https://sskeurope.ccvshop.nl/Grijze-Riem) | A060GR | € 8,25 |  | Grey |  |
| [Champro Belt Optic Pink](https://sskeurope.ccvshop.nl/Champro-Belt-Optic-Pink) | A060-OP | € 8,25 |  | Optic Pink |  |
| [Champro Belt Orange](https://sskeurope.ccvshop.nl/Oranje-Riem) | A060OR | € 8,25 |  | Orange |  |
| [Champro Belt Teal](https://sskeurope.ccvshop.nl/Teal-Riem) | A060T | € 8,25 |  | Teal |  |
| [Champro Belt White](https://sskeurope.ccvshop.nl/Witte-Riem) | A060W | € 8,25 |  | White |  |

### Undershirts / compression / sleeves (33)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [BST12 - Champro Black Gunner Shooter Shirt](https://sskeurope.ccvshop.nl/BST12-Champro-Black-Gunner-Shooter-Shirt) | BST12Black | € 15,00 | Small, Medium, Large, XLarge, XXLarge, XXXLarge, XXXXLarge | Black |  |
| [Champro Arm Sleeve with Elbow Padding Scarlet](https://sskeurope.ccvshop.nl/Champro-Arm-Sleeve-with-Elbow-Padding-Scarlet) | FCAP Scarlet | € 12,50 | Large | Scarlet |  |
| [Champro Arm Sleeve with Elbow Padding White](https://sskeurope.ccvshop.nl/Champro-Arm-Sleeve-with-Elbow-Padding-White) | FCAP White | € 12,50 | Small, Medium, Large | White |  |
| [Champro Custom Compression Arm Sleeve](https://sskeurope.ccvshop.nl/Champro-Custom-Compression-Arm-Sleeve) | JAS2 | € 14,95 | XS, S, M, L, XL |  |  |
| [Champro Pro-Plus Low Profile Knee Pad Black](https://sskeurope.ccvshop.nl/A2001B-Champro-Pro-Plus-Low-Profile-Knee-Pad) | A2001B | € 19,95 / paar | Small, Medium, Large | Black |  |
| [Champro Pro-Plus Low Profile Knee Pad White](https://sskeurope.ccvshop.nl/Champro-Pro-Plus-Low-Profile-Knee-Pad-White) | A2001W | € 19,95 / paar | M, L | White |  |
| [Champro Vision DRI-GEAR Long Sleeve White](https://sskeurope.ccvshop.nl/Champro-Vision-DRI-GEAR-Long-Sleeve-White) | BST99LSW | € 14,95 | YXS, YS, YM, YL, S, M, L, XL, XXL, XXXL, 4XL | White |  |
| [Champro Vision DRI-GEAR Short Sleeve Purple](https://sskeurope.ccvshop.nl/Champro-Vision-DRI-GEAR-Short-Sleeve-Purple) | BST99PU | € 12,95 |  | Purple |  |
| [Champro Vision DRI-GEAR Short Sleeve White](https://sskeurope.ccvshop.nl/Champro-Vision-DRI-GEAR-Short-Sleeve-White) | BST99W | € 12,95 |  | White |  |
| [CJ2 - Champro Compression Undershirt White](https://sskeurope.ccvshop.nl/CJ2-Champro-Compression-Undershirt-White) | CJ2 white | € 27,50 | YSmall, YMedium, YLarge, Small, XXLarge, XXXLarge | White |  |
| [EvoShield Solid Compression Sleeve Black](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-Black) | WB6001201 | € 24,95 | L/XL | Black |  |
| [EvoShield Solid Compression Sleeve Charcoal](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-Grey) | WB6001202 | € 24,95 | S/M, L/XL | Charcoal |  |
| [EvoShield Solid Compression Sleeve Hot Pink](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-Pink) | WB6001207 | € 24,95 | S/M, L/XL | Hot Pink |  |
| [EvoShield Solid Compression Sleeve Navy](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-Navy) | WB6001203 | € 24,95 | S/M, L/XL | Navy |  |
| [EvoShield Solid Compression Sleeve Royal](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-Royal) | WB6001204 | € 24,95 | S/M, L/XL | Royal |  |
| [EvoShield Solid Compression Sleeve Scarlet](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-Scarlet) | WB6001205 | € 24,95 | S/M | Scarlet |  |
| [EvoShield Solid Compression Sleeve Victory Blue](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-Colombia-Blue) | WB6001208 | € 24,95 | S/M, L/XL | Victory Blue |  |
| [EvoShield Solid Compression Sleeve White](https://sskeurope.ccvshop.nl/EvoShield-Solid-Compression-Sleeve-White) | WB6001206 | € 24,95 | S/M, L/XL | White |  |
| [FCAS - Champro Compression Arm Sleeve](https://sskeurope.ccvshop.nl/FCAS-Champro-Compression-Arm-Sleeve) | FCAS | € 10,00 | Small, Medium, Large |  |  |
| [SSK X1 Compression Arm Sleeve Black](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Black) | SSKX1ASB | € 14,95 |  | Black |  |
| [SSK X1 Compression Arm Sleeve Colombia Blue](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Colombia-Blue) | SSKX1ASCOL | € 14,95 |  | Colombia Blue |  |
| [SSK X1 Compression Arm Sleeve Green](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Green) | SSKX1ASGRN | € 14,95 |  | Green |  |
| [SSK X1 Compression Arm Sleeve Navy](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Navy) | SSKX1ASNVY | € 14,95 |  | Navy |  |
| [SSK X1 Compression Arm Sleeve Orange](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Orange) | SSKX1ASORG | € 14,95 |  | Orange |  |
| [SSK X1 Compression Arm Sleeve Pink](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Pink) | SSKX1ASPNK | € 14,95 |  | Pink |  |
| [SSK X1 Compression Arm Sleeve Purple](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Purple) | SSKX1ASPUR | € 14,95 |  | Purple |  |
| [SSK X1 Compression Arm Sleeve Royal](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Royal) | SSKX1ASRYL | € 14,95 |  | Royal |  |
| [SSK X1 Compression Arm Sleeve Scarlet](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Scarlet) | SSKX1ASSCA | € 14,95 |  | Scarlet |  |
| [SSK X1 Compression Arm Sleeve White](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-White) | SSKX1ASWHT | € 14,95 |  | White |  |
| [SSK X1 Compression Arm Sleeve Yellow](https://sskeurope.ccvshop.nl/SSK-X1-Compression-Arm-Sleeve-Yellow) | SSKX1ASYEL | € 14,95 |  | Yellow |  |
| [UASLEEVE - Under Armour Compression Arm Sleeve](https://sskeurope.ccvshop.nl/UASLEEVE-Under-Armour-Compression-Arm-Sleeve) | UASLEEVE | € 15,00 | S/M, L/XL | Black, Red, Grey, Optic Green |  |
| [Under Armour Knee Pad Sleeves Black](https://sskeurope.ccvshop.nl/Under-Armour-Knee-Pad-Sleeves-Black) | UAKNEE Black | € 20,00 / paar | M | Black |  |
| [Under Armour Knee Pad Sleeves White](https://sskeurope.ccvshop.nl/Under-Armour-Knee-Pad-Sleeves-White) | UAKNEE White | € 20,00 / paar | Youth, S | White |  |

### Sliding shorts, toque/cup, sliding mitts & pads (28)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [BPS14CN - Champro Compressie Boxer Short met Toque](https://sskeurope.ccvshop.nl/BPS14CN-Champro-Compressie-Boxer-Short-met-Toque) | BPS14CN | € 32,00 / set | YXS, YS, YM, YL, S, M, L, XL |  |  |
| [BPS15C - Champro Wind-Up Compression Sliding Short met Toque](https://sskeurope.ccvshop.nl/BPS15C-Champro-Wind-Up-Compression-Sliding-Short-met-Toque) | BPS15C | € 36,00 / set | YXS, YS, YM, YL, S, M, L, XL, XXL |  |  |
| [BPS15G - Champro Wind-Up Compression Sliding Short Grey](https://sskeurope.ccvshop.nl/BPS15G-Champro-Wind-Up-Compression-Sliding-Short-Grey) | BPS15G | € 30,00 / set | YXS, YS, YL, S, XL, XXL | Grey | Inclusief toque: Nee, XS +€ 7,50, S +€ 7,50, M +€ 7,50, L +€ 7,50 |
| [BPS15W - Champro Wind-Up Compression Sliding Short White](https://sskeurope.ccvshop.nl/BPS15W-Champro-Wind-Up-Compression-Sliding-Short-White) | BPS15W | € 30,00 / set | YXS, YS, YM, YL, S, M, L, XL, XXL | White | Inclusief toque: Nee, XS +€ 7,50, S +€ 7,50, M +€ 7,50, L +€ 7,50 |
| [BPS16 - Champro Windmill Women's Sliding Short](https://sskeurope.ccvshop.nl/BPS16-Champro-Windmill-Womens-Sliding-Short) | BPS16 | € 28,50 | XS, S, M, L, XL, XXL | White, Grey |  |
| [CG101 - Champro Sliding Pad](https://sskeurope.ccvshop.nl/CG101-Champro-Sliding-Pad) | CG101 | € 7,50 |  |  |  |
| [Champro C-Flex Cup L](https://sskeurope.ccvshop.nl/Champro-C-Flex-Cup-L) | A5C-L | € 7,50 |  |  |  |
| [Champro C-Flex Cup M](https://sskeurope.ccvshop.nl/Champro-C-Flex-Cup-M) | A5C-M | € 7,50 |  |  |  |
| [Champro C-Flex Cup S](https://sskeurope.ccvshop.nl/Champro-C-Flex-Cup-S) | A5C-S | € 7,50 |  |  |  |
| [Champro C-Flex Cup XS](https://sskeurope.ccvshop.nl/Champro-C-Flex-Cup-XS) | A5C-XS | € 7,50 |  |  |  |
| [Champro Take Out Sliding Short Black](https://sskeurope.ccvshop.nl/Champro-Take-Out-Sliding-Short-Black) | BPS19B | € 29,95 / set | YS, YM, YL, S, M, L, XL, XXL | Black | Inclusief toque: Nee, XS +€ 7,50, S +€ 7,50, M +€ 7,50, L +€ 7,50 |
| [Champro Take Out Sliding Short White](https://sskeurope.ccvshop.nl/Champro-Take-Out-Sliding-Short-White) | BPS19W | € 29,95 / set |  | White |  |
| [Champro Toque](https://sskeurope.ccvshop.nl/A5C-Champro-Toque) | A5C Toque | € 7,50 / set | Medium |  |  |
| [Champro Toque Band met Cup](https://sskeurope.ccvshop.nl/A54C-Champro-Toque-Band-met-Cup) | A54C | € 17,50 / set |  |  |  |
| [EKNPAD - Easton Sliding Knee Pad](https://sskeurope.ccvshop.nl/EKNPAD-Easton-Sliding-Knee-Pad) | EKNPAD BK | € 17,95 / paar |  |  |  |
| [EvoShield Sliding Mitt 2.0 Black](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Black) | WB5753701AD | € 79,95 |  | Black |  |
| [EvoShield Sliding Mitt 2.0 Grey](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Grey) | WB5753705AD | € 79,95 |  | Grey |  |
| [EvoShield Sliding Mitt 2.0 Hot Pink](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Pink) | WB5753704AD | € 79,95 |  | Hot Pink |  |
| [EvoShield Sliding Mitt 2.0 Light Gold](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Yellow) | WB5753702AD | € 79,95 |  | Light Gold |  |
| [EvoShield Sliding Mitt 2.0 Navy](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Navy) | WB5753703AD | € 79,95 |  | Navy |  |
| [EvoShield Sliding Mitt 2.0 Royal](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Royal) | WB5753706AD | € 79,95 |  | Royal |  |
| [EvoShield Sliding Mitt 2.0 Scarlet](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Scarlet) | WB5753708AD | € 79,95 |  | Scarlet |  |
| [EvoShield Sliding Mitt 2.0 Seafoam Green](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Seafoam-Green) | WB5753707AD | € 79,95 |  | Seafoam Green |  |
| [EvoShield Sliding Mitt 2.0 Victory Blue](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-Colombia-Blue) | WB5753709AD | € 79,95 |  | Victory Blue |  |
| [EvoShield Sliding Mitt 2.0 White](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-2.0-White) | WB5753710AD | € 79,95 |  | White |  |
| [EvoShield Sliding Mitt Youth](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-Youth) | WB5733801YH | € 64,95 |  |  |  |
| [EvoShield Sliding Mitt Youth Navy](https://sskeurope.ccvshop.nl/EvoShield-Sliding-Mitt-Youth-Navy) | WB5733801YHNY | € 64,95 |  | Navy |  |
| [Rawlings Sliding Mitt](https://sskeurope.ccvshop.nl/Rawlings-Sliding-Mitt) | GUARDSL | € 64,95 | Adult |  |  |

### Bags (152)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [Champro 12-Bat Fence Bag](https://sskeurope.ccvshop.nl/E20B-Champro-12-Knuppel-Fence-Bag) | E20B | € 42,00 |  |  |  |
| [Champro 8-Helmet Fence Bag](https://sskeurope.ccvshop.nl/E21B-Champro-8-Helmet-Fence-Bag) | E21B | € 65,00 |  |  |  |
| [Champro A305B Champro Laundry Bag Black](https://sskeurope.ccvshop.nl/Champro-A305B-Champro-Laundry-Bag-Black) | A305 Laundry Bag | € 2,95 |  | Black |  |
| [Champro Ball Bucket (22.7 liters) Optic Blue](https://sskeurope.ccvshop.nl/Champro-Optic-Blue-Ball-Bucket-(22.7-liters)) | BUCKETOB | € 30,00 |  |  |  |
| [Champro Ball Bucket w/2Dz CSB24Y 12" Slowpitch Softball](https://sskeurope.ccvshop.nl/Champro-Bucket-w/2Dz-CSB24Y-12-Slowpitch-Softball) | CSB-GSP12X | € 149,95 |  |  |  |
| [Champro Base Knock Duffle Pack Black](https://sskeurope.ccvshop.nl/Champro-Base-Knock-Duffle-Pack-Black) | E49 Black | € 42,50 |  | Black |  |
| [Champro Base Knock Duffle Pack Green](https://sskeurope.ccvshop.nl/Champro-Base-Knock-Duffle-Pack-Green) | E49 Green | € 42,50 |  | Green |  |
| [Champro Base Knock Duffle Pack Royal](https://sskeurope.ccvshop.nl/Champro-Base-Knock-Duffle-Pack-Royal) | E49 Royal | € 42,50 |  | Royal |  |
| [Champro Base Knock Duffle Pack Scarlet](https://sskeurope.ccvshop.nl/Champro-Base-Knock-Duffle-Pack-Scarlet) | E49 Scarlet | € 42,50 |  | Scarlet |  |
| [Champro Boss Wheeled Catcher's Bag Black](https://sskeurope.ccvshop.nl/Champro-Boss-Wheeled-Catchers-Bag-Black) | E92 Black | € 114,95 |  | Black |  |
| [Champro Boss Wheeled Catcher's Bag Green](https://sskeurope.ccvshop.nl/Champro-Boss-Wheeled-Catchers-Bag-Green) |  | € 114,95 |  | Green |  |
| [Champro Boss Wheeled Catcher's Bag Navy](https://sskeurope.ccvshop.nl/Champro-Boss-Wheeled-Catchers-Bag-Navy) |  | € 114,95 |  | Navy |  |
| [Champro Boss Wheeled Catcher's Bag Royal](https://sskeurope.ccvshop.nl/Champro-Boss-Wheeled-Catchers-Bag-Royal) |  | € 114,95 |  | Royal |  |
| [Champro Boss Wheeled Catcher's Bag Scarlet](https://sskeurope.ccvshop.nl/Champro-Boss-Wheeled-Catchers-Bag-Scarlet) | E92 Scarlet | € 114,95 |  | Scarlet |  |
| [Champro Boss Wheeled Catcher's Bag Yellow](https://sskeurope.ccvshop.nl/Champro-Boss-Wheeled-Catchers-Bag-Yellow) | E92 Yellow | € 114,95 |  | Yellow |  |
| [Champro Deluxe Ball Bag](https://sskeurope.ccvshop.nl/Champro-Deluxe-Ball-Bag) | E7 | € 35,00 |  |  |  |
| [Champro Deluxe Umpire/Catcher Equipment Bag](https://sskeurope.ccvshop.nl/Champro-Deluxe-Umpire/Catcher-Equipment-Bag) | E52 | € 192,50 |  |  |  |
| [Champro Deluxe XL Ballen Tas](https://sskeurope.ccvshop.nl/Champro-Deluxe-XL-Ballen-Tas) | E5 | € 25,00 |  |  |  |
| [Champro Drawstring Sackpack](https://sskeurope.ccvshop.nl/Champro-Drawstring-Sackpack) | E73 | € 6,50 |  |  |  |
| [Champro E11 Oversize All-Purpose Tas](https://sskeurope.ccvshop.nl/Champro-E11-Oversize-All-Purpose-Tas) | E11 | € 40,00 |  |  |  |
| [Champro Extra Large Capacity Bag Black](https://sskeurope.ccvshop.nl/Champro-Extra-Large-Capacity-Bag-Black) | E40 Black | € 37,00 |  | Black |  |
| [Champro Extra Large Capacity Bag Navy](https://sskeurope.ccvshop.nl/Champro-Extra-Large-Capacity-Bag-Navy) | E40 Navy | € 37,00 |  | Navy |  |
| [Champro Extra Large Capacity Bag Royal](https://sskeurope.ccvshop.nl/Champro-Extra-Large-Capacity-Bag-Royal) | E40 Royal | € 37,00 |  | Royal |  |
| [Champro Extra Large Capacity Bag Scarlet](https://sskeurope.ccvshop.nl/Champro-Extra-Large-Capacity-Bag-Scarlet) | E40 Scarlet | € 37,00 |  | Scarlet |  |
| [Champro Fortress 2 Backpack Black](https://sskeurope.ccvshop.nl/Champro-Fortress-2-Backpack-Black) | E81 Black | € 49,95 |  | Black |  |
| [Champro Fortress 2 Backpack Grey](https://sskeurope.ccvshop.nl/Champro-Fortress-2-Backpack-Grey) | E81 Grey | € 49,95 |  | Grey |  |
| [Champro Fortress 2 Backpack Navy](https://sskeurope.ccvshop.nl/Champro-Fortress-2-Backpack-Navy) | E81 Navy | € 49,95 |  | Navy |  |
| [Champro Fortress 2 Backpack Royal](https://sskeurope.ccvshop.nl/Champro-Fortress-2-Backpack-Royal) | E81 Royal | € 49,95 |  | Royal |  |
| [Champro Fortress 2 Backpack Scarlet](https://sskeurope.ccvshop.nl/Champro-Fortress-2-Backpack-Scarlet) | E81 Scarlet | € 49,95 |  | Scarlet |  |
| [Champro Jumbo Wheeled All-Purpose Bag Black](https://sskeurope.ccvshop.nl/Champro-Jumbo-Wheeled-All-Purpose-Bag-Black) | E50 Black | € 99,95 |  | Black |  |
| [Champro Jumbo Wheeled All-Purpose Bag Navy](https://sskeurope.ccvshop.nl/Champro-Jumbo-Wheeled-All-Purpose-Bag-Navy) | E50 Navy | € 99,95 |  | Navy |  |
| [Champro Large Canvas Duffle Bag](https://sskeurope.ccvshop.nl/Champro-Large-Canvas-Duffle-Bag) | E14 | € 42,00 |  |  |  |
| [Champro Oversize All-Purpose Tas Royal](https://sskeurope.ccvshop.nl/Champro-Oversize-All-Purpose-Tas-Royal) | E10 Royal | € 40,00 |  | Royal |  |
| [Champro Prodigy Youth Backpack Black](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Black) | E87 Black | € 39,95 |  | Black |  |
| [Champro Prodigy Youth Backpack Green](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Green) | E87 Green | € 39,95 |  | Green |  |
| [Champro Prodigy Youth Backpack Grey](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Grey) | E87 Grey | € 39,95 |  | Grey |  |
| [Champro Prodigy Youth Backpack Navy](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Navy) | E87 Navy | € 39,95 |  | Navy |  |
| [Champro Prodigy Youth Backpack Pink](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Pink) | E87 Pink | € 39,95 |  | Pink |  |
| [Champro Prodigy Youth Backpack Purple](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Purple) | E87 Purple | € 39,95 |  | Purple |  |
| [Champro Prodigy Youth Backpack Royal](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Royal) | E87 Royal | € 39,95 |  | Royal |  |
| [Champro Prodigy Youth Backpack Scarlet](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Scarlet) | E87 Scarlet | € 39,95 |  | Scarlet |  |
| [Champro Prodigy Youth Backpack USA](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-USA) | E87 USA | € 39,95 |  |  |  |
| [Champro Prodigy Youth Backpack Vegas Gold](https://sskeurope.ccvshop.nl/Champro-Prodigy-Youth-Backpack-Vegas-Gold) | E87 Vegas Gold | € 39,95 |  | Vegas Gold |  |
| [Champro Siege Backpack Black](https://sskeurope.ccvshop.nl/Champro-Siege-Backpack-Black) | E91 Black | € 64,95 |  | Black |  |
| [Champro Siege Backpack Colombia Blue](https://sskeurope.ccvshop.nl/Champro-Siege-Backpack-Colombia-Blue) | E91 Colombia Blue | € 64,95 |  | Colombia Blue |  |
| [Champro Siege Backpack Grey](https://sskeurope.ccvshop.nl/Champro-Siege-Backpack-Grey) |  | € 64,95 |  | Grey |  |
| [Champro Siege Backpack Navy](https://sskeurope.ccvshop.nl/Champro-Siege-Backpack-Navy) | E91 Navy | € 64,95 |  | Navy |  |
| [Champro Siege Backpack Purple](https://sskeurope.ccvshop.nl/Champro-Siege-Backpack-Purple) | E91 Purple | € 64,95 |  | Purple |  |
| [Champro Siege Backpack Royal](https://sskeurope.ccvshop.nl/Champro-Siege-Backpack-Royal) | E91 Royal | € 64,95 |  | Royal |  |
| [Champro Siege Backpack Scarlet](https://sskeurope.ccvshop.nl/Champro-Siege-Backpack-Scarlet) | E91 Scarlet | € 64,95 |  | Scarlet |  |
| [Champro Ultimate Carry-All Equipment Bag Black](https://sskeurope.ccvshop.nl/Champro-Ultimate-Carry-All-Equipment-Bag-Black) | E85 Black | € 55,00 |  | Black |  |
| [Champro Ultimate Carry-All Equipment Bag Navy](https://sskeurope.ccvshop.nl/Champro-Ultimate-Carry-All-Equipment-Bag-Navy) | E85 Navy | € 55,00 |  | Navy |  |
| [Champro Ultimate Carry-All Equipment Bag Royal](https://sskeurope.ccvshop.nl/Champro-Ultimate-Carry-All-Equipment-Bag-Royal) | E85 Royal | € 55,00 |  | Royal |  |
| [Champro Ultimate Carry-All Equipment Bag Scarlet](https://sskeurope.ccvshop.nl/Champro-Ultimate-Carry-All-Equipment-Bag-Scarlet) | E85 Scarlet | € 55,00 |  | Scarlet |  |
| [Demarini Voodoo JR Backpack Black](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-Black-Backpack) | VOODOO JR Black | € 44,95 |  | Black |  |
| [Demarini Voodoo JR Backpack Navy](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-Navy-Backpack) | VOODOO JR Navy | € 44,95 |  | Navy |  |
| [Demarini Voodoo JR Backpack Orange](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-Orange-Backpack) | VOODOO JR Orange | € 44,95 |  | Orange |  |
| [Demarini Voodoo JR Backpack Pink](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-Pink-Backpack) | VOODOO JR Pink | € 44,95 |  | Pink |  |
| [Demarini Voodoo JR Backpack Purple](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-Purple-Backpack) | VOODOO JR Purple | € 44,95 |  | Purple |  |
| [Demarini Voodoo JR Backpack Royal](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-Royal-Backpack) | VOODOO JR Royal | € 44,95 |  | Royal |  |
| [Demarini Voodoo JR Backpack Scarlet](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-Scarlet-Backpack) | VOODOO JR Scarlet | € 44,95 |  | Scarlet |  |
| [Demarini Voodoo JR Backpack USA](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-USA-Backpack) | VOODOO JR USA | € 44,95 |  |  |  |
| [Demarini Voodoo JR Backpack White](https://sskeurope.ccvshop.nl/Demarini-Voodoo-JR-White-Backpack) | VOODOO JR White | € 44,95 |  | White |  |
| [Demarini Voodoo OG Backpack Royal](https://sskeurope.ccvshop.nl/Demarini-Voodoo-OG-Backpack-Royal) | VOODOO OG Royal | € 89,95 |  | Royal |  |
| [Demarini Voodoo OG Backpack Scarlet](https://sskeurope.ccvshop.nl/Demarini-Voodoo-OG-Backpack-Scarlet) | VOODOO OG Scarlet | € 89,95 |  | Scarlet |  |
| [Demarini Voodoo OG Backpack USA](https://sskeurope.ccvshop.nl/Demarini-Voodoo-OG-Backpack-USA) | VOODOO OG USA | € 89,95 |  |  |  |
| [E30 - Champro Player's Tas](https://sskeurope.ccvshop.nl/E30-Champro-Players-Tas) | E30 | € 40,00 |  |  |  |
| [Easton 5 Tool Phenom Wheeled Bag Black](https://sskeurope.ccvshop.nl/Easton-5-Tool-Phenom-Black-Wheeled-Bag) | 5TPHENOMWB Black | € 189,95 |  | Black |  |
| [Easton Traveler Wheeled Bag](https://sskeurope.ccvshop.nl/Easton-Traveler-Wheeled-Bag) | TRVLR | € 89,95 |  |  |  |
| [EQ bag - Diamond Players Materiaal Tas](https://sskeurope.ccvshop.nl/EQ-bag-Diamond-Players-Materiaal-Tas) | EQ bag | € 30,00 |  |  |  |
| [EvoShield Exec Backpack Black](https://sskeurope.ccvshop.nl/EvoShield-Exec-Backpack-Black) | EVO EXEC BACKPACK Black | € 139,95 |  | Black |  |
| [EvoShield Exec Backpack Navy](https://sskeurope.ccvshop.nl/EvoShield-Exec-Backpack-Navy) | EVO EXEC BACKPACK Navy | € 139,95 |  | Navy |  |
| [EvoShield Recruit Backpack Black](https://sskeurope.ccvshop.nl/EvoShield-Recruit-Backpack-Black) | WB5742701 | € 149,95 |  | Black |  |
| [EvoShield Takeover Backpack Black](https://sskeurope.ccvshop.nl/EvoShield-Takeover-Backpack-Black) | WB5757101 | € 199,95 |  | Black |  |
| [EvoShield Takeover Backpack Grey](https://sskeurope.ccvshop.nl/EvoShield-Takeover-Grey-Backpack) | WB5757102 | € 199,95 |  | Grey |  |
| [EvoShield Takeover Backpack Scarlet](https://sskeurope.ccvshop.nl/EvoShield-Takeover-Scarlet-Backpack) | WB5757105 | € 199,95 |  | Scarlet |  |
| [EvoShield Takeover Backpack Victory Blue](https://sskeurope.ccvshop.nl/EvoShield-Takeover-Colombia-Blue-Backpack) | WB5757107 | € 199,95 |  | Victory Blue |  |
| [EvoShield Takeover Backpack White](https://sskeurope.ccvshop.nl/EvoShield-Takeover-White-Backpack) | WB5757106 | € 199,95 |  | White |  |
| [EvoShield Takeover Wheeled Bag Grey](https://sskeurope.ccvshop.nl/EvoShield-Takeover-Grey-Wheeled-Bag) | WB5757202 | € 199,95 |  | Grey |  |
| [EvoShield Takeover Wheeled Bag Navy](https://sskeurope.ccvshop.nl/EvoShield-Takeover-Navy-Wheeled-Bag) | WB5757203 | € 199,95 |  | Navy |  |
| [EvoShield Takeover Wheeled Bag Scarlet](https://sskeurope.ccvshop.nl/EvoShield-Takeover-Scarlet-Wheeled-Bag) | WB5757205 | € 199,95 |  | Scarlet |  |
| [EvoShield Tone Set Backpack Orange](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-Orange) | WB5730411 | € 99,95 |  | Orange |  |
| [EvoShield Tone Set Backpack Purple](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-Purple) | WB5730412 | € 99,95 |  | Purple |  |
| [EvoShield Tone Set Backpack Royal](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-Royal) | WB5730404 | € 99,95 |  | Royal |  |
| [EvoShield Tone Set Backpack Scarlet](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-Scarlet) | WB5730405 | € 99,95 |  | Scarlet |  |
| [EvoShield Tone Set Backpack Texas Orange](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-Texas-Orange) | WB5730414 | € 99,95 |  | Orange |  |
| [EvoShield Tone Set Backpack USA](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-USA) | WB5730407 | € 99,95 |  |  |  |
| [EvoShield Tone Set Backpack Victory Blue](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-Colombia-Blue) | WB5730413 | € 99,95 |  | Victory Blue |  |
| [EvoShield Tone Set Backpack White](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-White) | WB5730406 | € 99,95 |  | White |  |
| [EvoShield Tone Set Backpack Yellow](https://sskeurope.ccvshop.nl/EvoShield-Tone-Set-Backpack-Yellow) | WB5730409 | € 99,95 |  | Yellow |  |
| [Louisville Slugger Omaha Stick Pack Navy](https://sskeurope.ccvshop.nl/Louisville-Slugger-Omaha-Stick-Pack-Navy) | LS OMAHA STICK Navy | € 75,00 |  | Navy |  |
| [Louisville Slugger Omaha Stick Pack Scarlet](https://sskeurope.ccvshop.nl/Louisville-Slugger-Omaha-Stick-Pack-Scarlet) | LS OMAHA STICK Scarlet | € 75,00 |  | Scarlet |  |
| [Louisville Slugger Party Animals Backpack](https://sskeurope.ccvshop.nl/Louisville-Slugger-Party-Animals-Powerized-Stick-Backpack-Black) | LS PARTY ANIMALS STICK PACK | € 54,95 |  |  |  |
| [LSGB2 - Louisville Slugger Oversized Materiaal Tas](https://sskeurope.ccvshop.nl/LSGB2-Louisville-Slugger-Oversized-Materiaal-Tas) | LSGB2 | € 35,00 |  |  |  |
| [Rawlings Ball Bucket (22.7 liters) White](https://sskeurope.ccvshop.nl/Rawlings-Ball-Bucket-(22.7-liters)-White) | BUCKET6G | € 39,95 |  | White |  |
| [Rawlings Ball Bucket (37.8 liters) White](https://sskeurope.ccvshop.nl/Rawlings-Ball-Bucket-(37.8-liters)-White) | BIGBUCK | € 79,95 |  | White |  |
| [Rawlings Chaos Youth Backpack Black](https://sskeurope.ccvshop.nl/Rawlings-Chaos-Youth-Backpack-Black) | AMACHAOS-B | € 49,95 |  | Black |  |
| [Rawlings Chaos Youth Backpack Black/Optic Yellow](https://sskeurope.ccvshop.nl/Rawlings-Chaos-Youth-Backpack-Black/Optic-Yellow) | AMACHAOS-B/OY | € 49,95 |  | Yellow |  |
| [Rawlings Chaos Youth Backpack Grey](https://sskeurope.ccvshop.nl/Rawlings-Chaos-Youth-Backpack-Grey) | AMACHAOS-G | € 49,95 |  | Grey |  |
| [Rawlings Chaos Youth Backpack Scarlet](https://sskeurope.ccvshop.nl/Rawlings-Chaos-Youth-Backpack-Scarlet) | AMACHAOS-S/B | € 49,95 |  | Scarlet |  |
| [Rawlings Chaos Youth Backpack USA](https://sskeurope.ccvshop.nl/Rawlings-Chaos-Youth-Backpack-USA) | AMACHAOS-R/W/B | € 49,95 |  |  |  |
| [Rawlings Fence Bat Rack](https://sskeurope.ccvshop.nl/Rawlings-Fence-Bat-Rack) | BR | € 27,95 / set |  |  |  |
| [Rawlings Gold Collection Wheeled Bag White](https://sskeurope.ccvshop.nl/Rawlings-Gold-Collection-Wheeled-Bag-White) | GCWHBG-WH | € 299,95 |  | White |  |
| [Rawlings Youth Players Team Backpack Pink](https://sskeurope.ccvshop.nl/Rawlings-Youth-Players-Team-Backpack-Pink) | R400-NPK | € 54,95 |  | Pink |  |
| [SSK Ball Bag Black](https://sskeurope.ccvshop.nl/SSK-Japan-ballentas) | BH2003-90 | € 39,95 |  | Black |  |
| [SSK Embroided Drawstring Bag Maroon](https://sskeurope.ccvshop.nl/SSK-Embroided-Drawstring-Bag-Maroon) | FYNF2302-22 | € 9,95 |  | Maroon |  |
| [SSK Embroided Drawstring Bag Navy](https://sskeurope.ccvshop.nl/SSK-Embroided-Drawstring-Bag-Navy) | FYNF2302-70 | € 9,95 |  | Navy |  |
| [SSK Embroided Drawstring Bag Royal](https://sskeurope.ccvshop.nl/SSK-Embroided-Drawstring-Bag-Royal) | FYNF2302-63 | € 9,95 |  | Royal |  |
| [SSK Japan All-purpose Tas](https://sskeurope.ccvshop.nl/SSK-Japan-All-purpose-Tas) | BH9921 | € 8,95 |  |  |  |
| [SSK Junior Backpack Navy](https://sskeurope.ccvshop.nl/SSK-Junior-Backpack-Navy) | BJ1021-70 | € 64,95 |  | Navy |  |
| [SSK ProEdge Ball Bag White/Navy](https://sskeurope.ccvshop.nl/SSK-ProEdge-Ball-Bag-White/Navy) | BH2001-1070 | € 69,95 |  | White |  |
| [SSK ProEdge Duffle Bag Black](https://sskeurope.ccvshop.nl/SSK-ProEdge-Duffle-Bag-Black) | BA4007-90 | € 59,95 |  | Black |  |
| [SSK ProEdge Duffle Bag Navy](https://sskeurope.ccvshop.nl/SSK-ProEdge-Duffle-Bag-Navy) | BA4007-70 | € 59,95 |  | Navy |  |
| [SSK ProEdge Enamel Backpack Black/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Backpack-Black) | BA1010-9038 | € 89,95 |  | Black |  |
| [SSK ProEdge Enamel Backpack Navy/Red](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Backpack-Navy/Red) | BA1010-7020 | € 89,95 |  | Navy |  |
| [SSK ProEdge Enamel Backpack Red/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Backpack-Red/Gold) | BA1010-2238 | € 89,95 |  | Gold |  |
| [SSK ProEdge Enamel Backpack Royal/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Backpack-Royal/Gold) | BA1010-6338 | € 89,95 |  | Royal |  |
| [SSK ProEdge Enamel Shoulder Bag Black](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Shoulder-Bag-Black) | BA8000-9090 | € 69,95 |  | Black |  |
| [SSK ProEdge Enamel Shoulder Bag Black/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Shoulder-Bag-Black/Gold) | BA8000-9038 | € 69,95 |  | Black |  |
| [SSK ProEdge Enamel Shoulder Bag Maroon](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Shoulder-Bag-Maroon) | BA8000-22 | € 69,95 |  | Maroon |  |
| [SSK ProEdge Enamel Shoulder Bag Navy/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Shoulder-Bag-Navy/Gold) | BA8000-7038 | € 69,95 |  | Navy |  |
| [SSK ProEdge Enamel Shoulder Bag Navy/White/Red](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Shoulder-Bag-Navy/White/Red) | BA8000-7010 | € 69,95 |  | White |  |
| [SSK ProEdge Enamel Shoulder Bag Royal](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Shoulder-Bag-Royal) | BA8000-63 | € 69,95 |  | Royal |  |
| [SSK ProEdge Enamel Shoulder Bag White/Navy](https://sskeurope.ccvshop.nl/SSK-ProEdge-Enamel-Shoulder-Bag-White/Navy) | BA8000-1070 | € 69,95 |  | White |  |
| [SSK ProEdge Leather Backpack Black](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Backpack-Black) | EBA1012 | € 99,95 |  | Black |  |
| [SSK ProEdge Leather Backpack Royal](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Backpack-Royal) | EBA1012 | € 99,95 |  | Royal |  |
| [SSK ProEdge Leather Ball Bag Black/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Ball-Bag-Black/White) | EBH2012-9010 | € 129,95 |  | Black |  |
| [SSK ProEdge Leather Ball Bag Navy/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Ball-Bag-Navy/White) | EBH2012-7010 | € 129,95 |  | White |  |
| [SSK ProEdge Leather Large Backpack Black](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Large-Backpack-Black) | EBA1014-90 | € 129,95 |  | Black |  |
| [SSK ProEdge Leather Large Backpack Maroon](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Large-Backpack-Maroon) | EBA1014-22 | € 129,95 |  | Maroon |  |
| [SSK ProEdge Leather Large Backpack Navy](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Large-Backpack-Navy) | EBA1014-70 | € 129,95 |  | Navy |  |
| [SSK ProEdge Leather Large Backpack Royal](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Large-Backpack-Royal) | EBA1014-63 | € 129,95 |  | Royal |  |
| [SSK ProEdge Leather Shoe/Equipment Bag Black/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Shoe/Equipment-Bag-Black/Gold) | EBA9012-9010 | € 44,95 |  | Black |  |
| [SSK ProEdge Leather Shoulder Bag Black/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Shoulder-Bag-Black/Gold) | EBA4012-9038 | € 129,95 |  | Black |  |
| [SSK ProEdge Leather Shoulder Bag Navy/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Leather-Shoulder-Bag-Navy/Gold) | EBA4012-7038 | € 129,95 |  | Navy |  |
| [SSK ProEdge Mini Shoulder Bag Black/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Mini-Shoulder-Bag-Black) | BA6100-9038 | € 49,95 |  | Black |  |
| [SSK ProEdge Mini Shoulder Bag Maroon/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Mini-Shoulder-Bag-Maroon) | BA6100-2238 | € 49,95 |  | Maroon |  |
| [SSK ProEdge Mini Shoulder Bag Navy](https://sskeurope.ccvshop.nl/SSK-ProEdge-Mini-Shoulder-Bag-Navy) | BA6100-7070 | € 49,95 |  | Navy |  |
| [SSK ProEdge Mini Shoulder Bag Royal/Gold](https://sskeurope.ccvshop.nl/SSK-ProEdge-Mini-Shoulder-Bag-Royal) | BA6100-6338 | € 49,95 |  | Royal |  |
| [SSK ProEdge Personal Bat Bag (For 1 Bat) Black/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Personal-Bat-Bag-(For-1-Bat)-Black/White) | EBH5007-9010 | € 39,95 |  | Black |  |
| [SSK ProEdge Personal Bat Bag (For 1 Bat) Navy/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Series-Personal-1-Bat-Bag-Navy/White) | EBH5007-7010 | € 39,95 |  | White |  |
| [SSK ProEdge Personal Bat Bag (For 2/3 Bats) Black/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Personal-2-3-Bat-Bag-Black/White) | EBH5008-9010 | € 54,95 |  | Black |  |
| [SSK ProEdge Personal Bat Bag (For 2/3 Bats) Navy/White](https://sskeurope.ccvshop.nl/SSK-Japan-ProEdge-series-Personal-Navy-Bat-Bag-for-2-3-bats) | EBH5008-7010 | € 54,95 |  | White |  |
| [SSK ProEdge Personal Bat Bag (For 5/6 Bats) White/Navy](https://sskeurope.ccvshop.nl/SSK-Japan-ProEdge-5-6-Bat-Bag-White/Navy) | BH5001-1070 | € 69,95 |  | White |  |
| [SSK ProEdge Personal Bat Bag (For 5/6 Bats) White/Red](https://sskeurope.ccvshop.nl/SSK-ProEdge-Personal-Bat-Bag-(For-5/6-Bats)-White/Red) | BH5001-1020 | € 69,95 |  | White |  |
| [SSK ProEdge Personal Bat Bag (For 5/6 Bats) White/Royal](https://sskeurope.ccvshop.nl/SSK-ProEdge-Personal-Bat-Bag-(For-5/6-Bats)-White/Royal) | BH5001-1063 | € 69,95 |  | White |  |
| [SSK ProEdge Personal Wheeled Catcher's Bag Black/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Personal-Wheeled-Catchers-Bag-Black/White) | EBH3012-9010 | € 199,95 |  | Black |  |
| [SSK ProEdge Personal Wheeled Catcher's Bag Navy/White](https://sskeurope.ccvshop.nl/SSK-ProEdge-Personal-Wheeled-Catchers-Bag-Navy/White) | EBH3012-7010 | € 199,95 |  | White |  |
| [SSK ProEdge Wheeled Travel Bag Black](https://sskeurope.ccvshop.nl/SSK-ProEdge-Wheeled-Travel-Bag-Black) | BH3002-90 | € 189,95 |  | Black |  |
| [SSK Professional Umpire Bag](https://sskeurope.ccvshop.nl/SSK-Professional-Umpire-Bag) | SSKUMPBAG | € 15,99 |  |  |  |
| [United Athletic Deluxe Personal Gear Bag Green](https://sskeurope.ccvshop.nl/United-Athletic-Deluxe-Personal-Gear-Bag-Green) | U-E86F Green | € 15,00 |  | Green |  |
| [United Athletic Deluxe Personal Gear Bag Scarlet](https://sskeurope.ccvshop.nl/United-Athletic-Deluxe-Personal-Gear-Bag-Scarlet) | U-E86F Scarlet | € 15,00 |  | Scarlet |  |

### Accessories (wristbands, towel, gift card) (34)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [Cadeau bon SSK](https://sskeurope.ccvshop.nl/cadeau-bon-SSK) | Cadeau bon | € 0,00 |  |  | Waarde Kadobon: €10,- +€ 10,00, €15,- +€ 15,00, €20,- +€ 20,00, €25,- +€ 25,00, €30,- +€ 30,00, €35,- +€ 35,00 |
| [Champro Beschermende Pols Band](https://sskeurope.ccvshop.nl/AWG01-Champro-Beschermende-Pols-Band) | AWG01 | € 17,50 | S, M, L |  |  |
| [Champro Wristband Playbook Adult - Single Black](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Single-Black) | AF49 Black | € 7,50 |  | Black |  |
| [Champro Wristband Playbook Adult - Single Camo Black](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Single-Camo-Black) | AF49 Camo Black | € 7,50 |  | Black |  |
| [Champro Wristband Playbook Adult - Single Navy](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Adult-Single-Navy) | AF49 Navy | € 7,50 |  | Navy |  |
| [Champro Wristband Playbook Adult - Single White](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Single-White) | AF49 White | € 7,50 |  | White |  |
| [Champro Wristband Playbook Adult - Triple Black](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Adult-Triple-Black) | AF50 Black | € 10,00 |  | Black |  |
| [Champro Wristband Playbook Adult - Triple Camo Black](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Adult-Triple-Camo-Black) | AF50 Camo Black | € 10,00 |  | Black |  |
| [Champro Wristband Playbook Adult - Triple Camo White](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Adult-Triple-Camo-White) | AF50 Camo White | € 10,00 |  | White |  |
| [Champro Wristband Playbook Adult - Triple Navy](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Adult-Triple-Navy) | AF50 Navy | € 10,00 |  | Navy |  |
| [Champro Wristband Playbook Adult - Triple Optic Pink](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Adult-Triple-Optic-Pink) | AF50 Optic Pink | € 10,00 |  | Optic Pink |  |
| [Champro Wristband Playbook Youth - Single Black](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Youth-Single-Black) | AF49Y Black | € 7,50 |  | Black |  |
| [Champro Wristband Playbook Youth - Single Navy](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Youth-Single-Navy) | AF49Y Navy | € 7,50 |  | Navy |  |
| [Champro Wristband Playbook Youth - Triple Black](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Youth-Triple-Black) | AF50Y Black | € 10,00 |  | Black |  |
| [Champro Wristband Playbook Youth - Triple Navy](https://sskeurope.ccvshop.nl/Champro-Wristband-Playbook-Youth-Triple-Navy) | AF50Y Navy | € 10,00 |  | Navy |  |
| [Franklin XVent Reversible Wristband Royal](https://sskeurope.ccvshop.nl/Franklin-XVent-Reversible-Wristband-Royal) | XVENT Royal | € 13,50 |  | Royal |  |
| [Franklin XVent Reversible Wristband Scarlet](https://sskeurope.ccvshop.nl/Franklin-XVent-Reversible-Wristband-Scarlet) | XVENT Scarlet | € 13,50 |  | Scarlet |  |
| [Kadobon SSK](https://sskeurope.ccvshop.nl/Kadobon-SSK) | Kadobon | € 0,00 |  |  | Waarde Kadobon: €10,- +€ 10,00, €15,- +€ 15,00, €20,- +€ 20,00, €25,- +€ 25,00, €30,- +€ 30,00, €35,- +€ 35,00 |
| [SSK Striped Wristband Black/White](https://sskeurope.ccvshop.nl/SSK-Striped-Wristband-Black/White) | YA33-9010 | € 9,95 |  | Black |  |
| [SSK Striped Wristband Navy/White](https://sskeurope.ccvshop.nl/SSK-Striped-Wristband-Navy/White) | YA33-7010 | € 9,95 |  | White |  |
| [SSK Striped Wristband Pink/White](https://sskeurope.ccvshop.nl/SSK-Striped-Wristband-Pink/White) | YA33-2510 | € 9,95 |  | White |  |
| [SSK Striped Wristband Royal/White](https://sskeurope.ccvshop.nl/SSK-Striped-Wristband-Royal/White) | YA33-6310 | € 9,95 |  | White |  |
| [SSK Striped Wristband Scarlet/White](https://sskeurope.ccvshop.nl/SSK-Striped-Wristband-Scarlet/White) | YA33-2010 | € 9,95 |  | Scarlet |  |
| [SSK Striped Wristband White/Navy](https://sskeurope.ccvshop.nl/SSK-Striped-Wristband-White) | YA33-1070 | € 9,95 |  | White |  |
| [SSK Wristband Black](https://sskeurope.ccvshop.nl/SSK-Wristband-Black) | YA34-90 | € 8,95 |  | Black |  |
| [SSK Wristband Navy](https://sskeurope.ccvshop.nl/SSK-Wristband-Navy) | YA34-70 | € 8,95 |  | Navy |  |
| [SSK Wristband Pink](https://sskeurope.ccvshop.nl/SSK-Wristband-Pink) | YA34-25 | € 8,95 |  | Pink |  |
| [SSK Wristband Royal](https://sskeurope.ccvshop.nl/SSK-Wristband-Royal) | YA34-63 | € 8,95 |  | Royal |  |
| [SSK Wristband Scarlet](https://sskeurope.ccvshop.nl/SSK-Wristband-Scarlet) | YA34-20 | € 8,95 |  | Scarlet |  |
| [SSK Wristband White](https://sskeurope.ccvshop.nl/SSK-Wristband-White) | YA34-10 | € 8,95 |  | White |  |
| [Under Armour 1" Wristbands 4-Pack Royal](https://sskeurope.ccvshop.nl/Under-Armour-1-Wristbands-4-Pack-Royal) | UAWRIST Royal | € 10,00 |  | Royal |  |
| [Under Armour 1" Wristbands 4-Pack Scarlet](https://sskeurope.ccvshop.nl/Under-Armour-1-Wristbands-4-Pack-Scarlet) | UAWRIST Scarlet | € 10,00 |  | Scarlet |  |
| [Under Armour 1" Wristbands 4-Pack White](https://sskeurope.ccvshop.nl/Under-Armour-1-Wristbands-4-Pack-White) | UAWRIST White | € 10,00 |  | White |  |
| [UTOWEL - Under Armour Spelers Handdoek](https://sskeurope.ccvshop.nl/Webwinkel-Product-498065406/UTOWEL-Under-Armour-Spelers-Handdoek.html) | UATOWEL | € 3,00 |  | White, Pink, Black |  |

### Fan items (non-apparel) (3)

| Product | SKU | Price | Sizes | Colours | Options |
|---|---|---|---|---|---|
| [BHDR - Souvenir Ballenhouder](https://sskeurope.ccvshop.nl/BHDR-Souvenir-Ballenhouder) | BHDR | € 4,95 |  |  |  |
| [Sportcraft Tee Ball Bal & Knuppel Set](https://sskeurope.ccvshop.nl/TEEBALL-Sportcraft-Tee-Ball-Bal-Knuppel-Set) | TEEBALL | € 10,00 |  |  |  |
| [SSK Wooden Bat Ball Stand](https://sskeurope.ccvshop.nl/SSK-Wooden-Bat-Ball-Stand) | BT06 | € 9,95 |  |  |  |

## 10. JSON record format (`ssk-shop-apparel.json`)

Each array element has these fields:
- `id`: CCV product id, when the URL contains one.
- `name`, `url`, `sku`.
- `category`: my grouping.
- `site_categories`: the site's own category paths.
- `club`: a string, or a list for products shared by several clubs.
- `brand`: may be inferred.
- `price_eur`: incl. VAT, base price before options. `price_incl_vat` is always true. `price_unit` is "stuk", "paar", "set", or "6 stuks 1e bestelling".
- `sizes`.
- `size_and_fit_options`: the full size/length selects with surcharges.
- `colours`, `colours_available_per_description`, `colour_variants` (linked sibling products).
- `personalisation`: name/number/logo options. Each has `label`, `required`, `input` and `options[{value, surcharge_eur}]`.
- `other_options`: for example Kleur, Adult/Jeugd, Inclusief toque.
- `images`: full-size 1200x1800 URLs.
- `description`: original Dutch text.
- `notes`.
