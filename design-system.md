# SSK Europe configurator — design system

Extracted from the shipped code in `glove_builder/customiser/`, not from a
style guide. Every value below was read out of `app.css`, `app.js`,
`glove-engine.js`, `index.html` or `ds/tokens/*.css`, and the file:line is
given wherever it matters. Where the codebase contradicts itself, it says so
and names the value to standardise on — see [Where this contradicts
itself](#where-this-contradicts-itself). Nothing here was invented to fill a
gap; gaps are listed as gaps in [What this system does not answer
yet](#what-this-system-does-not-answer-yet).

Companion files: **`tokens.css`** — the same system as plain custom
properties. One `<link>`, no build step, no framework. **`tokens-teamwear.css`**
— the black / red / white theme of the teamwear configurator (see
[Themes](#themes)), same token names, linked after `tokens.css`.

**Two configurators now stand on this system**: the glove configurator
(`glove_builder/customiser/`, navy) and the teamwear configurator
(`ssk-custom-kleding`, ink). Sections that describe only one say so. Where the
teamwear configurator answered a question this document used to list as open,
the gap is marked *answered* in [What this system does not answer
yet](#what-this-system-does-not-answer-yet) and the pattern is described under
[Patterns from the teamwear configurator](#patterns-from-the-teamwear-configurator).

---

## Reference material

| What | Where | Use it for |
|---|---|---|
| **SSK 2026 baseball general catalogue** ("2026年SSK野球総合カタログ", Japanese, e-book) | <https://my.ebook5.net/ssksports/26sougou/> | The manufacturer's own product range, model names and photography. The source to check when a model, colour name or product photo in either configurator is in doubt. It is the maker's book, not SSK Europe's price list: prices and what is actually stocked come from Pim and the SSK Europe shop. |

Rules for using it:

- **Colours and shapes**: match the booklet's colour names to the catalogue
  entries (`COLOURS`, photo sets) rather than inventing a name.
- **Never copy a price from it.** Prices in the configurators come from the
  SSK Europe shop and Pim's list (see `docs/pim-assortment.md` in the teamwear
  repo).
- **Photography stays licensed material.** Link to the booklet; do not copy its
  pages into either repository.

---

## The five ideas the interface is built on

These are behavioural, and they matter more than any hex value. A second
configurator that copies the palette but not these will not feel like this
one.

1. **One decision per step.** Eight steps over 36 form questions
   (`app.js:164-183`). The step is not a page of settings; it is a question.
2. **The product is a control, not a picture.** Clicking a panel on the
   canvas selects that panel *and* jumps to the colour step
   (`app.js:713-714`). The canvas is a navigation surface.
3. **Everything on the paper form gets asked, even what cannot be drawn.**
   Five fields the back view cannot show are still collected and are labelled
   with a plain sentence explaining why they are not in the picture
   (`OFFSTAGE`, `glove-catalog.js:76-84`). Never drop a question to protect
   the render.
4. **Unavailable is explained, not greyed out.** Webs that do not exist at the
   chosen size are absent from the list, not disabled (`app.js:297`); a merged
   panel is relabelled rather than removed (`app.js:321-322`).
5. **State is portable, and a link describes the product — not the person.**
   The configuration is packed into a human-readable reference code
   (`glove-engine.js:379-389`) and can be written into a link on demand.
   Sharing is not a feature bolted on; it is the state model. Two rules go
   with it, and both were learned the hard way:

   - **The address bar is not a save file.** Work in progress belongs in
     `localStorage`, which survives a refresh *and* a browser restart. Writing
     it to the URL on every repaint produced an 830-character address that
     changed on every click, helped nothing — `replaceState` makes no history
     entry, so not even the back button — and looked broken to a customer.
     Write a URL only when someone asks for one.
   - **Personal data never goes in a shareable link.** Name and phone are
     answers on the order form, not part of the design. A configuration gets
     pasted into WhatsApp; contact details must not travel with it. The
     exclusion list is `PRIVATE` in `app.js`, and anything added to state that
     identifies a person belongs on it.

---

## Themes

One component layer, two sets of values. A theme is a file that redefines the
**same semantic token names**; no component ever changes.

| | **Glove** (`tokens.css`) | **Teamwear** (`tokens-teamwear.css`) |
|---|---|---|
| Brand ground | Navy `#0B1F3A` | Ink `#0B0B0C` — there is no navy anywhere |
| Greys | Warm (tan bias, sits with leather) | Neutral (the shop is black and white) |
| Action | Stitch red `#C8102E` | Stitch red `#C8102E` — unchanged |
| Selection | Navy ring / navy fill | Ink ring / ink fill |
| The rule | Red acts, navy selects | Red acts, **black** selects |
| Focus ring | Blue `rgb(31 72 120 / .55)` | Red `rgb(200 16 46 / .6)` |
| Accent | Leather tan (advisory callout) | None |
| Dark mode | None | `prefers-color-scheme: dark`, stage stays light |
| High contrast | None | `prefers-contrast: more` |
| Languages | NL / EN | NL / EN (DE written, switched off) |

**Rule for a new theme:** change values, never names; keep "one colour acts,
one colour selects"; and keep the product's own colour world (photographs,
the customer's palette) out of the UI palette — that rule is theme-independent.

**Dark mode, as shipped in teamwear, and its three traps:**

1. The **stage stays light**. It shows product photos cut out on white; a dark
   ground makes every garment look wrong. Chips that sit on the stage (tag,
   tool bar) stay light with it.
2. `--ink-*` flips (headings are ink on light, paper on dark), so
   `--surface-inverse`, which follows `--ink-900`, would become light. Surfaces
   that must stay dark — the header — take `--ink-950` literally in dark mode.
3. **Never override `--white`.** Components use it for "text on a red or black
   fill"; a dark `--white` turns every button label invisible. Set
   `--text-inverse` explicitly instead.

---

## Colour

*(Glove theme values. The teamwear equivalents are in
[Themes](#themes) and `tokens-teamwear.css`.)*

Four ramps and a semantic layer on top. The ramps are the vocabulary; the
semantic names are what components should reach for.

### Ramps

| Ramp | Steps | What it is for |
|---|---|---|
| **Navy** | `950 #081526` · `900 #0B1F3A` · `800 #10294C` · `700 #16375F` · `600 #1F4878` · `500 #2C5A90` · `100 #D9E2EE` · `50 #EDF2F8` | The brand. Header ground, all selection ink, dark text on light. |
| **Stitch red** | `700 #A00D24` · `600 #C8102E` · `500 #D6304A` · `100 #F9DCE1` · `50 #FCEEF0` | Action and attention: the primary button, the progress fill, "still needed". |
| **Leather tan** | `600 #A96E3F` · `500 #B97E4B` · `200 #E8D3BC` · `100 #F2E7D8` | Heritage accent, used sparingly — in practice only the advisory callout. |
| **Warm grey** | `900 #1C1F24` · `700 #3E434C` · `600 #565D68` · `500 #737B87` · `400 #9AA1AB` · `300 #C4C9D0` · `200 #DDE0E5` · `100 #ECEEF1` · `50 #F5F6F8` · `chalk #F6F4EE` · `white #FFFFFF` | Text, borders, grounds. Warm, not neutral — the greys carry a slight tan bias to sit with the leather. |

### Roles, and when each is used

| Role | Value | Used where |
|---|---|---|
| `--surface-page` | chalk | The page ground. The canvas composites straight onto it — there is no separate stage backdrop. |
| `--surface-card` | white | Every raised band: step rail, control panel, footer bar, summary sheet. |
| `--surface-inverse` | navy-900 | The header, and only the header. |
| `--surface-sunken` | grey-50 | *Intended* for recessed wells. Currently unused — see the contradictions. |
| `--text-heading` | navy-900 | Step titles, field labels. |
| `--text-body` | grey-700 | Running text and control labels. |
| `--text-muted` | grey-500 | Secondary and helper text, captions, spec keys. |
| `--text-inverse` | chalk | Text on the navy header. |
| `--border-default` | grey-200 | Every resting control and band divider. |
| `--border-strong` | grey-300 | Hover only. Borders darken on hover; they do not change colour. |
| `--action-primary` | red-600 | The one primary button per view. |
| `--action-secondary` | navy-900 | Ghost buttons and secondary emphasis. |
| `--state-selected` | navy-900 | **Selection, everywhere.** See the contradictions — one component currently uses red. |
| `--status-success` | `#2E7D46` | Step complete. |
| `--status-danger` | red-600 | Step incomplete, required-but-empty, invalid input. |

**On dark ground** the header inverts to its own small set: `--navy-100` for
secondary text and icon glyphs, `--white` for primary values, `--navy-600` for
borders, `--navy-500` for the one dashed border (the reference chip).

### The canvas is a separate colour world

`glove-engine.js` never touches the ramp, and should not. It composites
photographs: a `multiply` pass tints the diffuse layer with the customer's
chosen hex, and a `lighter` pass adds the specular highlight back
(`glove-engine.js:62-88`). Its only literals are pure white and black poles
and a couple of fallback greys. Keep product rendering out of the UI palette —
they answer to different physics.

**Rule:** UI colour comes from tokens. Rendered-product colour comes from the
customer's palette selection. Never let one leak into the other.

---

## Typography

Three faces, and the split between them is the strongest rule in the system —
the code follows it almost perfectly.

| Face | Stack | Rule |
|---|---|---|
| **Display** | Barlow Condensed | **Only** uppercase, tracked chrome: step chips, field labels, buttons, panel titles, kickers. Never running text. |
| **Body** | Barlow | Prose, control labels, inputs. Sentence case. |
| **Mono** | IBM Plex Mono | **Anything a human reads as data, not language**: reference codes, prices, step numbers, swatch codes, spec values, counters. |

The mono rule is the one to state carefully, because the current code stretches
it: `.hdr-title i` (`app.css:36`) sets a line of prose in mono. That is the
single exception; treat it as a mistake, not a licence.

### Scale

| Token | Size | What it is for |
|---|---|---|
| `--text-3xs` | 10px | Eyebrows and kickers — uppercase, widest tracking. Reference label, price label, step number, card kicker. |
| `--text-2xs` | 11px | Helper text: "still needed", "optional", card sub-captions, figure captions. |
| `--text-xs` | 12px | The workhorse label size. Step chips, field labels, swatch rows, part chips, counters, notes. |
| `--text-sm` | 13px | Secondary body: option buttons, card names, panel lead, spec rows, button labels. |
| `--text-base` | 15px | Body default and input text. |
| `--text-md` | 17px | Price value, reference code in the summary sheet. |
| `--text-lg` | 20px | The wordmark. |
| `--display-sm` | 24px | Step title and summary heading. The largest type in the product. |

`--text-3xs` and `--text-2xs` are **new**. The shipped scale bottoms out at
12px, but ten labels render at 10px or 11px (`app.css:36, 62, 69, 92, 161,
165, 184, 197, 205, 330`) — roughly a third of the small text lives off-scale.
These two steps name what is already there rather than adding anything.

`--display-md/lg/xl` (32/44/64px) are declared and never used. They belong to a
marketing page, not a configurator. Keep them for a landing page; do not reach
for them here.

**Weights:** 400 body · 500 medium · 600 semibold (selected option buttons) ·
700 display · 800 display-heavy (wordmark, panel title).

**Leading:** `--leading-tight 1.05` for display, `--leading-body 1.55` for
everything else. **Tracking:** `--tracking-caps .08em` for uppercase labels,
`--tracking-wide-caps .14em` for 10px eyebrows — the smaller the caps, the
wider the tracking.

---

## Spacing

A 4px scale, of which this product uses six steps.

| Token | Value | Used for |
|---|---|---|
| `--space-1` | 4px | Hairline separations. |
| `--space-1-5` | 6px | **Compact gaps and vertical padding on small controls.** New — see below. |
| `--space-2` | 8px | The default gap. Inside controls, between chips, between a label and its field. |
| `--space-3` | 12px | Horizontal padding on controls; gap between cards. |
| `--space-4` | 16px | Mobile panel inset; gaps in the header. |
| `--space-5` | 20px | **The panel inset.** Desktop padding for the panel and the stage, and the gap between fields. |
| `--space-6` | 24px | Summary sheet padding. |

`--space-8` through `--space-20` (32–80px) are declared and entirely unused.
This is a dense tool; nothing in it needs 32px of air. Keep them available,
expect not to use them.

`--space-1-5: 6px` is **new**, and it is the honest name for a step that is
already load-bearing: `.swatches` and `.parts` both use a literal `gap: 6px`
(`app.css:207, 219`), and compact controls pad vertically at 5–7px. See the
contradictions for the standardisation.

### The layout primitive

**Spacing is `gap` on the parent, not margins on children.** The panel body is
a flex column with `gap: var(--space-5)` (`app.css:148`); every field is a
flex column with `gap: var(--space-2)` (`app.css:152`); every collection is a
grid or flex row with its own gap. Margins appear in only four places, all of
them the panel head/title/lead block, which sits outside the scroller.

Copy this. It is why the panel never has a collapsed-margin bug.

### Control heights

`--control-h-sm: 32px` (step chips, icon buttons) · `--control-h-md: 40px`
(option buttons, inputs, buttons) · `--control-h-lg: 48px` (declared, unused).

Two 32px boxes hard-code the number instead of using the token
(`app.css:50, 277`).

---

## Shape and elevation

### Radii

| Token | Value | Used on |
|---|---|---|
| `--radius-sm` | 3px | The default. Every control, input, badge and colour chip. |
| `--radius-md` | 6px | Cards, the reference-code block, reference photographs. |
| `--radius-lg` | 10px | The summary sheet only. |
| `--radius-pill` | 999px | Step chips and part chips — anything that reads as a tag. |

The rule is size-graded: the bigger the surface, the bigger the radius.
Controls 3, cards 6, dialogs 10, tags fully round.

### Borders

Almost everything is `1px solid var(--border-default)`. Two deliberate
exceptions carry meaning:

- **Dashed** = provisional or machine-generated. The reference chip
  (`app.css:58`) and the summary code block (`app.css:289`).
- **A 3px left rule** = advisory. `.note` (`app.css:168`), the only callout
  component, in tan on tan.

### Elevation

Three levels, and the product is deliberately flat — each is used exactly
once.

| Token | Signals | Applied to |
|---|---|---|
| `--shadow-card` | A chip floating over the product | `.stage-tag`, the label over the canvas |
| `--shadow-raised` | Lift on hover | `.card:hover` |
| `--shadow-overlay` | Detached from the page | `.sheet`, the summary modal |

Resting controls have **no** shadow. Separation comes from a 1px border and a
white ground. That is a choice, and it is why the interface reads as a tool
rather than a store.

`--focus-ring: 0 0 0 3px rgba(31,72,120,.35)` — a 3px navy halo, applied to
every interactive element through one shared selector (`app.css:234-238`).

---

## Motion

Almost nothing moves, on purpose. Three transitions exist in the entire
product.

| Token | Value | For |
|---|---|---|
| `--dur-fast` | 120ms | Feedback on a control the pointer is touching. |
| `--dur-med` | 200ms | A value changing on screen — the progress bar filling. |
| `--ease-out` | `cubic-bezier(.2,.7,.3,1)` | Everything. There is no ease-in and no spring. |

**The rule:** transition what the user is *causing* (hover feedback, a
progress value moving). Do not transition what the user is *reading* — the
canvas repaints instantly, options appear instantly, steps swap instantly. In
a configurator, latency between a click and the product changing reads as
lag, not polish.

Two behavioural timings are currently magic numbers and belong in the system:
`--dur-confirm: 1600ms` (how long a "Copied" label persists, `app.js:613`) and
`--debounce-input: 250ms` (text input settle, `app.js:524`).

`@media (prefers-reduced-motion: reduce)` kills all transitions
(`app.css:323`). Note it only covers `transition` — the product happens to
have no `@keyframes`, so this is currently sufficient by accident. Any
animation added later needs adding here too.

### Teamwear: motion for orientation, never for the product

The teamwear configurator has keyframes, so the "accident" above no longer
holds there, and the rule is restated: **move what tells people where they
are; never delay what they are reading.** The product still repaints at once.

| Token | Value | What moves |
|---|---|---|
| `--dur-panel` | 380ms | The panel slides in (28px, fade) when the *phase* changes — not on a section change inside a phase. |
| `--dur-sheet` | 250ms | Phone sheet height; toast in and out. |
| `--dur-stage` | 450ms | The previous photo fades out *over* the new one when a colour, view or model changes. The new state is already there underneath; the fade is a cover, not a wait. |
| `--dur-land` | 500ms | A print landing on the cloth (a small settle). |
| *price* | ~400ms | The total counts to its new value. |

Every one of these is switched off under `prefers-reduced-motion: reduce`, and
the opening screen is not shown at all. Tests run with reduced motion for the
same reason a user might: so nothing is in the way of the first click.

---

## Breakpoints

**One.** `900px`. Above it, side by side; below it, stacked.

```css
@media (max-width: 900px) { … }
```

CSS cannot use a custom property in a media query, so `--bp-stack` in
`tokens.css` is documentation — the literal must be repeated in the query.
That is a limitation, not an oversight; keep the two in sync by hand.

What flips at 900px, and it must be all four together:

```css
.wrap   { flex-direction: column; }
.stage  { flex: none; padding: var(--space-3); }
#glove  { max-height: 34vh; }
.panel  { flex: 1 1 auto; border-left: 0; border-top: 1px solid var(--border-default); }
```

Ownership of the slack **inverts**. On desktop the stage is fluid and the
panel is fixed; on mobile the canvas is capped at a third of the viewport and
the panel takes everything left. That inversion is the whole mobile strategy.

Also at mobile: the header wraps and loses its subtitle, divider and price;
the reference chip drops onto its own centred row; the panel inset drops
20px → 16px; the ambient hint and the question counter disappear. The
contextual stage label survives — it is the one thing you need on a small
screen.

---

## Interaction states

| | Default | Hover | Active | Focus-visible | Selected | Disabled |
|---|---|---|---|---|---|---|
| **Step chip** | white, grey-200 border, grey-600 label | border-strong + navy-900 label | — | focus ring | navy-900 fill, white label | — |
| **Option button** | white, grey-200 border | border-strong | — | focus ring | navy-900 border + inset ring + semibold | `opacity: .4`, `not-allowed` |
| **Card** | white, grey-200 border | `--shadow-raised` | — | focus ring | **red-600** border + inset ring | *none — see contradictions* |
| **Swatch** | white, grey-200 border | border-strong | — | focus ring | navy-900 border + inset ring | — |
| **Part chip** | white, grey-200 border | *none* | — | focus ring | navy-900 border + inset ring + navy label | — |
| **Icon button** | transparent, navy-600 border | navy-800 fill, white glyph | — | focus ring | — | `opacity: .35`, `default` |
| **Primary button** | red-600 fill | red-700 fill | — | focus ring | — | `opacity: .4`, `default` |
| **Ghost button** | white, border-strong | grey-50 fill | — | focus ring | — | `opacity: .4`, `default` |
| **Input** | white, grey-200 border | — | — | focus ring | — | — |

### The rules behind the table

- **Selection is a ring, not a fill** — except for navigation (step chips,
  language toggle), which fills. Options are ringed; where-you-are is filled.
- **The ring is `border-color` plus `box-shadow: inset 0 0 0 1px`** in the same
  colour. Two coincident 1px lines read as a crisp 2px edge and cost no
  layout, so nothing reflows when you select something. This is the single
  most copyable detail in the system.
- **Hover darkens the border, it does not colour it.** grey-200 → grey-300.
  Default, hover and selected are three darknesses of the *same* channel.
- **There is no `:active` state anywhere in the product.** Nothing depresses
  on mousedown.
- **Disabled is opacity + cursor**, never a colour change.

### On the canvas

The canvas has its own selection feedback: the selected zone is redrawn as a
white-tinted copy of itself, composited `screen` at **alpha 0.16**
(`app.js:158`, `glove-engine.js:357-364`). It is a luminance-proportional
lift, not a flat overlay, which is what lets it show up on both white and
black leather. It is painted last, over everything.

Hover on the canvas changes only the cursor — `pointer` over a mapped zone,
`default` over background (`app.js:715-721`).

---

## Pattern: the swatch picker

The colour picker. One function renders all four palettes (`swatchGrid`,
`app.js:484-499`).

### Anatomy

```
.field
├── .field-lab            label, uppercase display, + "still needed" / "optional"
├── .note                 (optional) why this part is not in the picture
└── .swatches             grid, repeat(auto-fill, minmax(112px, 1fr)), gap 6px
    └── .sw               <button>: [chip] [code.] [name]
```

### Numbers

- Chip **20×20px**, `--radius-sm`, `1px solid rgba(0,0,0,.25)`.
- Row padding `5px 7px`, gap `--space-2`, `1px` border, `--radius-sm`.
- Row height **32px** — *derived from the chip, not declared*. Changing the
  chip size silently changes the row height.
- Grid: inside the 440px panel this always resolves to 3 columns at ~129px.
  It responds to panel width, not to content.

### Rules

- **A swatch is a real `<button type="button">`.** Enter/Space activation and
  tab-stop membership come from the element. Do not rebuild it from divs.
- **Content order is fixed: chip, code, name.** The SSK code is shown with a
  trailing period (`10.`) in mono, the name in body grey. Customers order by
  code; the code comes first for that reason.
- The chip's background is the **only** inline style in the component
  (`app.js:492`). Everything else is class-driven.
- **Selection is string equality against state**, applied at construction:
  `value === num` (`app.js:490`). There is no live toggle — the grid is
  rebuilt.
- **Snapshot before mutating.** `onPick` calls `snapshot()` *first*
  (`app.js:503`), then writes, then propagates supported linked fields. Get the order
  wrong and undo skips a step.
- **Palm and Back 2 remain independent**, matching the separate questions on
  the order form. Under a flag, Back 3 and Back 4 still move together.
- **The offstage note goes between the label and the grid**, never below.

### Known weaknesses — fix these when you copy it

- **Focus is destroyed on every pick.** `onPick` ends in `paint()`, which
  clears and rebuilds the panel body and resets `scrollTop` to 0
  (`app.js:647`). The text inputs avoid this by calling `paint(false)`; the
  swatch path does not. Picking a colour with the keyboard drops focus to
  `<body>` and scrolls to the top.
- **No group semantics.** No `role="radiogroup"`, no `aria-checked`, no roving
  tabindex. A screen reader hears "10. White, button" with no indication of
  what is chosen, and the last lace colour is 29 tab stops away. This is the
  biggest accessibility gap in the product.

---

## Pattern: the option card

Anything chosen from pictures rather than from a colour chip: hand, size,
finger pad, web type, bullet, flag. One function builds all of them
(`cardField`, `app.js`).

### Anatomy

```
.field
├── .field-lab            label, uppercase display, + "still needed" / "optional"
└── .cards                grid, repeat(auto-fill, minmax(120px, 1fr)), gap --space-3
    └── .card             <button>: [picture] [.cap > .nm]
```

### Numbers

- Picture: `width: 100%`, `aspect-ratio: 4/3`, `object-fit: cover`, on
  `--gray-50` so a slow image does not shift the layout.
- Caption padding `--space-2 --space-3`, `--text-xs`.
- Selected: `border-color: --state-selected` plus `inset 0 0 0 1px` of the
  same, exactly as a swatch. Hover raises the shadow; disabled drops to
  `--state-disabled-opacity` with `cursor: not-allowed`.

### The portrait variant

`cardField(..., 'portrait')` puts `is-portrait` on the grid: **3/4** pictures
at `minmax(108px, 1fr)`. One field uses it — the web picker — for a
substantive reason rather than a decorative one. A web is a tall narrow thing
occupying the right third of the glove, and in a landscape card the five webs
the configurator can draw came out too small to tell apart, which is the only
thing the picker is for.

### Rules

- **The picture is `<img>` or `<canvas>`, and they are styled together.** The
  web picker replaces the `<img>` with a canvas rendered from the compositor
  for every web that can be drawn, so the customer compares two pictures of
  their own glove instead of two photographs of someone else's. Any rule that
  applies to one has to apply to both or the row jumps when the canvas lands.
- **A card is a real `<button type="button">`,** same as a swatch, with the
  same selected/focus split: selection is the inset box-shadow, focus is a
  real outline. See *Interaction states*.
- **Never let the picture carry the meaning alone.** Every card has a text
  caption under it, because several of the supplied photographs are of a
  different glove in a different colour and one of them has a NEW badge burned
  into the pixels.

---

## Pattern: part selection

How you choose *which* part you are colouring. Three surfaces kept in sync by
one state field, `S.part`.

```
.parts                    flex wrap, gap 6px
└── .part                 <button> pill: [12×12 chip] [label]
.swatches                 the picker below re-points at the selected part
#glove                    the selected zone lifts on the canvas
```

### The two-way link

**Chip → canvas.** Selecting a chip sets `S.part`; `draw()` passes
`{ id: FIELD_TO_LAYER[S.part], amount: 0.16 }` to the renderer, which lifts
that zone. Guarded three ways — the step must be the colour step, the field
must map to a layer, and the layer must have a bounding box. Any failure
yields no glow and no error.

**Canvas → chip.** A click is hit-tested against a preloaded ID bitmap, not
geometry: `idmap.png` is drawn once into a `willReadFrequently` canvas and its
`ImageData` retained; `zoneAt` reads the red channel at the pixel and matches
it to a zone number (`glove-engine.js:367-373`). Client coordinates are
converted with `(clientX - rect.left) * cv.width / rect.width` because the
canvas is CSS-scaled. A hit sets **both** `S.step = 3` and `S.part`; a miss
does nothing at all.

### Rules

- **The chip's own swatch is live.** Each chip's 12×12 chip is filled from
  `hexOf(field)` on every repaint, so recolouring a part immediately restains
  its own chip. An unset field falls back to a literal grey.
- **Chips are generated from an ordered list, never authored.** Parts are
  removed from the list, not disabled, when they stop being separate questions
  — the pad colour lives on another step, and Back 4 disappears entirely when
  a flag merges it into Back 3.
- **Merged parts are relabelled, not hidden.** The Back 3 chip becomes
  "Back 3+4 — index finger, one piece" and its picker carries a note saying
  why.
- **Parts the render cannot show keep their chip** and gain a plain-English
  note. Never drop the question.
- **Selecting a part is not undoable.** Only value commits push onto the undo
  stack. This is deliberate — undo should step back through *decisions*, not
  through navigation. Note the side effect: undo can move the selected part
  out from under you.
- **Selecting a back panel reveals a contextual bulk action** — "same colour
  on all back panels" — which writes all nine at once.

---

## Pattern: the product canvas and the controls

### Shell

Four bands in a flex **column** on `body`. Not a grid.

```
body  display:flex; flex-direction:column; height:100%; overflow:hidden
├── header.hdr      flex:none, 60px
├── nav.steps       flex:none, horizontal scroll, scrollbar hidden
├── main.wrap       flex:1 1 auto; min-height:0
│   ├── .stage      flex:1 1 auto; min-width:0   ← fluid, never scrolls
│   └── .panel      flex:0 0 440px               ← fixed, scrolls internally
└── footer.bar      flex:none
```

- **`overflow: hidden` on body. Exactly one element scrolls** — `.panel-body`.
  The stage has no overflow rule and never scrolls.
- **The chrome is pinned with `flex: none`, not `position: sticky`.** The only
  fixed element in the stylesheet is the summary scrim.
- **The step rail is its own full-bleed band above the split**, not inside the
  panel. Chips are `flex: none` so they overflow horizontally rather than
  compress; the scrollbar is hidden in both engines.
- **The step identity stays out of the scroller.** The step counter, title and
  lead are `flex: none` siblings *above* `.panel-body`, so they stay put while
  options scroll under them.
- **The panel scroller resets on every step change** — the body is torn down,
  re-rendered by the step's own render function, and `scrollTop` set to 0.

### Fitting the canvas

```html
<canvas id="glove" width="929" height="1100"></canvas>
```
```css
.stage { display:flex; align-items:center; justify-content:center; position:relative; }
#glove { max-width:100%; max-height:100%; height:auto; width:auto; }
```

- Intrinsic size goes on the **element**, not in CSS, and matches the `w`/`h`
  in the asset bundle — the renderer sizes its offscreen buffers from the same
  numbers.
- Those four properties give contain-fit against the 929:1100 ratio inside the
  centring flex parent. **Do not add `aspect-ratio` or `object-fit`** — neither
  is present and both would change the result.
- There is **no** devicePixelRatio scaling and **no** ResizeObserver. The
  backing store is always 929×1100 and is downscaled on desktop, which is what
  keeps it sharp. It also means the image is soft on a retina display; see the
  gaps below.
- Two overlays sit absolutely inside the stage: a contextual label top-left
  (white chip, `--shadow-card`) and an ambient hint bottom-left (muted, no
  chrome).

### Progress, three ways

Deliberately three independent affordances, because they answer different
questions:

1. **A dot per step chip** — green complete, red incomplete. Only for steps
   that own required fields.
2. **`01 / 08` plus a state line** in the panel head — where am I.
3. **`0 / 36` plus a 4px bar** in the footer — how much is left overall,
   driven by *answered questions*, not by step count.

The price sits top-right in the inverse header, label above value, value in
mono. The finish action appears twice: the footer primary button, whose label
changes on the last step, and a second primary button inside the review body.

---

## Patterns from the teamwear configurator

Everything below exists and is tested in `ssk-custom-kleding`. Class and
attribute names are given so a second implementation can match them.

### Phases and sections

Three **phases** — Club → Design → Quote — and inside Design **six sections on
one scrolling panel** (product, model, colours, logos, names, sizes). This
keeps idea 1 (one decision at a time) while ending the page-per-step feel:

- The section chips (`.subnav`) scroll-spy; a click scrolls, a scroll lights
  the chip. On phones the chips are a single scroll row, not a sticky wrap.
- **The Next button names what comes next and what is still missing**
  ("Verder: Namen & nummers (nog geen logo)"). It is the cheapest, most-read piece of
  guidance in the product.
- A section **summarises itself in one mono line** under its title (`.sec-sum`)
  and a click on the title **folds it** to that line. Sections above the
  current one with nothing missing get a tick instead of a number.
- A **checklist** in the step bar (`.todo`: logo, colours, product, players,
  contact) is a row of jump links, each ticking itself. It is hidden below
  1100px; the Next button carries the same information there.
- Phase changes make history entries; the browser's Back walks them.

### The stage

The product is a control (idea 2), extended:

- **Hotspots** are polygons on the photo (`.hot[data-hot][data-pl]`), keyboard
  focusable, with an accessible name. A click opens that spot's section.
- **Hover link, both ways.** Hovering a print spot or part in the panel
  lights it on the garment, and the reverse (`.is-spot`). Pointer devices
  only.
- **Tools** sit top-right, one row: Compare, Lens, Team, Kit, Variants, Note,
  Background. A tool that cannot apply is *absent*, not greyed (idea 4).
- **Multi views replace the single garment** and share one container
  (`.multi`): *Team* (three players of the roster, each with own name and
  number), *Kit* (every piece of the order side by side, the one being edited
  marked), *Variants* (A/B/C side by side). A click on a pane opens it.
- **Notes** are numbered pins in an overlay layer (`#pins`) positioned from
  fractions of the photo, so they survive resizes; they live on the item and
  therefore travel in links, mail and the quote, where they are drawn into the
  picture.
- **Background** cycles studio / pitch / dark. It is a presentation choice,
  stored, and it never changes what is ordered.
- **Keyboard:** the stage takes focus (`tabindex=0`); Tab walks the print
  spots, Enter opens one, arrows turn the garment. Single keys outside text
  fields: `1`–`6` sections, `N` note, `T` team, `K` kit, `B` background,
  `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo, `?` lists them.

### Messages: toast, error bar, offline bar

The glove configurator listed "no confirmation pattern" and "no error states"
as gaps. Teamwear's answer is four things with four jobs, so a message never
has to guess its own weight:

| Pattern | Element | `role` | Lasts | Use for |
|---|---|---|---|---|
| **Toast** | `.toast` | `status` (polite) | 4s; 10s with an action | A result, and at most **one** next step: "Logo staat op het shirt → Verder naar ontwerp". |
| **Error bar** | `.errbar` | `alert` | until closed | Once per session. Says the design is saved and offers a report by mail. |
| **Offline bar** | `.offline` | `status` | while offline | "Je bent offline. Bewerken kan gewoon; versturen zodra je weer verbinding hebt." |
| **Live region** | `.sr-only#live` | `polite` | — | The total and the section, for screen readers that cannot watch the price tween. |

A toast is dismissed by navigation. A toast never carries a destructive
action. An error report contains the message, page, browser and the local
usage counter — **never a logo and never a roster**.

### Overlays

| | Element | Rule |
|---|---|---|
| **Opening screen** | `#intro` | Wordmark, one line, ~2.2s; any key or tap skips. Replays on every homepage load; never on a deep link, never with reduced motion. `[hidden]` must beat `display:flex` — a hidden overlay that still intercepts pointer events is the bug to test for. |
| **Tour** | `#tour` | Four spotlights, first visit only (`ssk-tour-seen`), skippable, restartable from the shortcuts sheet. The hole is a `box-shadow: 0 0 0 9999px` cut-out, not four rectangles. |
| **Shortcuts** | `<dialog id="keys">` | Native `<dialog>` + `showModal()`: focus move, focus trap, Escape and inert background come for free. This closes most of the "modal semantics stop at the visual" gap below. |
| **Demo** | `.demobar` | A twenty-second scripted run on a demo club; the visitor's own state is backed up first and restored after, and input is blocked while it runs. |

### The phone: panel as a sheet

At ≤900px the layout does **not** stack and scroll the page; the body is fixed
and the panel is a **sheet** over the stage:

- The stage is absolutely positioned and shrinks to `bottom: var(--sheet)`;
  the panel is `height: var(--sheet)` with a 44×5 drag handle.
- Three snaps: `--sheet-low 34%`, `--sheet-mid 56%`, `--sheet-high 88%`. A tap
  on the handle flips mid ↔ high; a drag snaps to the nearest.
- While dragging, transitions are off (`.is-dragging`); otherwise 250ms.
- The panel title shrinks and the lead is hidden — the Next button and the
  section summaries carry the guidance.
- Print, quote and player pages opt out (`position: static`).
- A web app manifest (`manifest.webmanifest`, 192 and 512 icons) makes it
  installable; one toast offers it, never on the first step.

### Variants

A **variant** is a named snapshot of the item being built (A, B, C … up to F).
The current one stays in sync on every save; switching stores the item being
edited back into its slot; removing one never deletes the item you are
editing. Variants travel in the draft and the design file, not in links, and
the **vote link** carries two of them so a team can choose between whole
designs rather than just colours.

### Links, and what travels in them

Hash forms, all handled by one pack/unpack pair (deflate-raw → base64url, `z`
prefix; `j` + URI-encoded JSON as fallback):

| Hash | Opens |
|---|---|
| `#d=…` | The design (cart, item, club) |
| `#d=…&r=<section>` | The design **at a section**: the *role links* — board (design), coach (sizes), treasurer (`#q=1&d=…`, the quote page) |
| `#p=…` | A one-row player form (name, number, size) that returns one line to paste |
| `#v=…` | A vote page: two colours, or two variants; returns one line |
| `#c=…` | A club card: name, colours, language. The logo is uploaded again |
| `#stats` | The usage counter of this browser as a page |

**Logos never travel in a link.** Idea 5 ("personal data never goes in a
link") is *not* fully met here: see the departures below.

### Printable outputs

The glove configurator listed "no print stylesheet" as a gap. Teamwear prints
three things through one mechanism — build into `#printsheet`, add `body.printing`
(which hides everything else), call `window.print()`, clean up on `afterprint`:

- **Quote sheet** — club, each product with mockups, article codes, totals,
  the needed-by date, notes, and a **QR of the quote link** so the paper
  reopens the design.
- **Fitting-night form** — one A4: the model's sizes as chips, 24 rows to
  write names, numbers, sizes and initials, and the size chart as a QR.
- **Club card** — name, colour dots, QR; next season's one-scan start.

QR codes use a vendored MIT library (`vendor/qrcode.js`), imported only when a
sheet is built, so the first screen pays nothing for it.

### Measuring without tracking

A usage counter lives in the browser (`ssk-stats`), is shown at `#stats`, is
attached to a feedback or error mail only when the visitor sends one, and is
never transmitted by the page itself. Add a counter for a new feature with
`track('name')`; do not add a network call.

### Lean mode

On `saveData` or a 2g connection the page skips pre-rendering the other
colours and the crossfades, and says so in the stage tag. It is a mode, not a
second UI.

---

## Where this contradicts itself

Listed worst first. Each names the value to standardise on. `tokens.css`
implements these recommendations; the comment on each token says so.

### Contradictory — these are bugs, not preferences

**1. The focus ring erases the selection ring.**
Selection and focus are both painted with `box-shadow`, on the same elements,
at equal specificity (0,2,0), with the focus rule declared later
(`app.css:182, 193, 214, 227` vs `app.css:234-238`). Verified in a browser:
a selected option button reads `rgb(11,31,58) 0 0 0 1px inset` unfocused and
`rgba(31,72,120,.35) 0 0 0 3px` focused — the inset ring is gone. The
`border-color` survives, so selection is not invisible, but the emphasis
collapses on exactly the control a keyboard user is standing on.
→ **Split them across two properties — but this way round.** Selection keeps
`box-shadow: inset 0 0 0 1px`; focus becomes a real `outline`. Moving
selection to the outline instead looks right and fails, because the shared
`:focus-visible` rule sets `outline: none` to suppress the browser default and
erases it again — I made exactly that mistake and the browser check caught it.
Outline is what focus is for, it draws outside the box, and it cannot collide
with an inset shadow. **Fixed**: both now draw together.

**2. Selected is navy on three controls and red on the fourth.**
`.opt-btn`, `.sw` and `.part` ring in `--navy-900`; `.card` rings in
`--red-600` (`app.css:193`).
→ **Navy, via a new `--state-selected` alias.** **Fixed.** Red is the action colour —
using it for selection means the picked card competes with the primary button.
Navigation (step chips, language toggle) keeps its *filled* treatment, but the
fill should come from the same token.

**3. A selected card never shows hover.**
`.card:hover` and `.card.is-on` both write `box-shadow` at equal specificity,
`.is-on` last (`app.css:192-193`).
→ Resolved by #1: focus no longer writes `box-shadow`, so `.card:hover` and `.card.is-on` no longer fight. **Fixed.**

**4. Disabled cards look enabled.**
`app.js:355` sets `c.disabled = true` on the two parked silicone bullets, but
there is no `.card:disabled` rule. The other two disableable controls do have
one — at two different opacities and two different cursors (`.opt-btn` `.4` /
`not-allowed`, `.icon-btn` `.35` / `default`).
→ **`opacity: .4; cursor: not-allowed`** on all three, and add the card rule. **Fixed**, via `--state-disabled-opacity`.
`.4` is the majority and the more legible; `not-allowed` is the honest cursor.

**5. A transition that animates nothing.**
`.step` transitions `background`, but `.step:hover` changes `border-color` and
`color` and never touches `background` (`app.css:89-91`).
→ **`transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)`. Fixed.**

**6. Two fallback greys for the same failure.**
A palette lookup that misses returns `#888888` in one place
(`glove-engine.js:59`) and `#cccccc` in another (`app.js:444`). Neither is on
the ramp.
→ **`--gray-300 #C4C9D0`**, as `--swatch-unset`. **Fixed** in both files. It is on the ramp and reads
as "nothing chosen" rather than as a colour.

**7. Hand-expanded token values.**
`--navy-950` is never referenced, but its exact channels appear as
`rgba(8,21,38,.55)` in the scrim (`app.css:268`). `--border-focus` is never
referenced, but its value is re-typed inside `--focus-ring`.
→ **Add `--scrim`, derived from the ramp.** Never hand-expand a token's
channels. **Fixed**, along with `--chip-border`.

### Inconsistent — visible if you look

**8. Compact padding is 5, 6 or 7px depending on the component**, always
hard-coded, usually mixed into the same declaration as a tokenised horizontal
value (`app.css:45, 59, 112, 209, 222, 330`).
→ **6px, as `--space-1-5`.** The scale has no step between 4 and 8, and this
one is load-bearing.

**9. Gaps run 6 / 8 / 12px across five sibling collections in the same panel**,
with 6px off-scale entirely (`app.css:186, 207, 219`).
→ **`--space-1-5` (6px) for chip-density collections** (swatches, part chips),
**`--space-3` (12px) for cards.** Two densities, both named.

**10. A third of the small text is off-scale** — ten labels at 10px or 11px
against a scale that stops at 12px.
→ **Add `--text-3xs: 10px` and `--text-2xs: 11px`.** They are already in use;
name them.

**11. `border-radius: 3px` is hard-coded three times**, exactly duplicating
`--radius-sm`, and `.bar-track` uses an off-scale 2px (`app.css:215, 226, 249`,
`app.js:461`).
→ **`--radius-sm` for the chips; `--radius-pill` for the 4px progress track**
(at that height, pill is what 2px was approximating).

**12. Every control paints itself `--white` on a container painted
`--surface-card`** — the same `#FFFFFF`. Unselected controls have no ground
contrast at all; `--surface-sunken` is declared and never used.
→ Keep white-on-white *inside the panel* — the border does the work and it
keeps the panel calm. But **use `--surface-sunken` for the disabled and empty
states** that currently have no ground of their own.

**13. The semantic layer is bypassed.** `--navy-900` is used directly 18 times
while its aliases are used 3; every danger surface reaches past
`--status-danger` and `--text-danger` to raw `--red-600`; `--action-secondary`
is unused while the control that *is* a secondary action hard-references the
navy it aliases. 34 of 107 tokens are never referenced.
→ **Components reference semantic names; semantic names reference the ramp;
nothing references the ramp directly.** This is the rule the whole token layer
exists for, and it is the one most often broken.

**14. `#F2F0EA` is written out three times across two files** and sits 4/4/4
away from `--chalk`, the page background.
→ **`--chalk`.** Two off-whites four units apart is not a decision, it is
drift.

**15. `ds/styles.css` — the file that assembles the token layer — is loaded by
nothing.** `index.html` links the five token files individually. Two of those
"token" files also ship component CSS: `typography.css` styles `body`,
`effects.css` styles `a` and `a:hover` — the only link styling in the product,
living in the effects file.
→ **Tokens declare custom properties and nothing else.** Base and component
CSS belong in their own layers. `tokens.css` here holds that line.

### Cosmetic

**16.** `--shadow-card` is used once, and not on a card. `.card` has no
resting shadow. The name lies; either rename it `--shadow-chip` or give cards
a resting elevation. **17.** `.price` sets `line-height: 1.1`, which is on
neither end of the leading scale, while `--leading-snug: 1.25` is declared and
unused. **18.** Two image aspect ratios inside the same `.card` element —
`4/3` in CSS, `200/237` set from JS for starter thumbnails.

### Teamwear: where it departs from the rules above

These are the places the teamwear configurator does not meet this document,
named so they are decisions and not drift.

**T1. Personal data does travel in a teamwear link.** Idea 5 says a link
describes the product, not the person. `shareUrl` in teamwear sends the club
block (contact person, e-mail, phone, notes) and every roster row (names and
numbers) — the treasurer and coach role links need the roster, but the
WhatsApp share button sends the same payload to a group chat. **Recommended:**
two payloads. A *design link* (default, WhatsApp, vote, board role) with colours,
placements and notes only; a *work link* (coach, treasurer) with the roster,
shown with a one-line warning. Not yet changed.

**T2. Two dark-mode literals.** The header and the stage chips use literals
(`#050505`, `#FFFFFF`) in dark mode because the semantic tokens that would
carry them have just flipped. Honest, documented above, but still literals.

**T3. Toast z-index equals the glove scrim.** `60` for both; fine because they
never coexist, wrong if a modal ever opens over a toast.

**T4. `ds/tokens/effects.css` in the teamwear repo used to carry navy
shadows, a blue focus ring and a `var(--navy-900)` link hover** — which is an
undefined variable in the ink theme, so hovered links lost their colour.
**Fixed** (shadows black, ring red, hover `--ink-900`). The remaining
duplication is that the repo keeps its own copy of the token files; the next
step is to link `tokens.css` + `tokens-teamwear.css` from here instead.

---

## What this system does not answer yet

> **Answered by the teamwear configurator** (details under [Patterns from the
> teamwear configurator](#patterns-from-the-teamwear-configurator)): dark
> theme (see Themes); a z-index scale above the glove one; a confirmation
> pattern (toast + live region); error and offline states; modal semantics
> (native `<dialog>` for the shortcuts sheet); a print stylesheet (three
> outputs); a text-overflow strategy for the stage tag (ellipsis, capped width). **Still open in both:** icon system, form
> semantics, canvas pixel-density rule, naming convention, a longer-rail rule.
> The paragraphs below are the original glove-era wording and are kept as the
> record of what was missing.

Honest gaps. A second configurator will hit all of these, and this codebase has
no opinion to copy.

**No dark theme.** No `prefers-color-scheme` block anywhere, in any file. The
palette is single-mode and the canvas composites onto a light ground.

**No z-index scale.** Exactly two values exist, both bare integers: `2` on the
stage tag and `60` on the scrim. The gap between them encodes a system nobody
wrote down. `tokens.css` proposes one.

**No loading, error or empty states.** Asset load failures are swallowed
silently (`glove-engine.js:18`); the boot promise has no `.catch`; the only
error affordance in the product is an inline `borderColor` set on a bad
reference code, with no message, no `aria-invalid`, and no code path that ever
clears it.

**No confirmation pattern.** The one instance is a button label swapped on a
1600ms timer. No toast, no `aria-live` region — a screen reader hears nothing.

**Modal semantics stop at the visual.** `role="dialog"` and `aria-modal` are
declared, but there is no focus move on open, no focus restore on close, no
focus trap, no Escape handler, and the background stays scrollable and
tabbable. `keydown`, `Escape`, `focus()`, `tabindex` and `inert` appear **zero
times** in `app.js`.

**No icon system.** Three HTML entities inlined in markup, sized by ad-hoc
font-size.

**No form semantics.** There is no `<form>` element. Required-ness is data
rendered as a text suffix; no input carries `required` or `aria-required`, and
no `.note` is linked to its field with `aria-describedby`.

**No print stylesheet**, despite the spec sheet being exactly what a customer
prints or forwards to a dealer.

**No devicePixelRatio handling on the canvas.** The backing store is fixed at
929×1100 at any density. The hit-testing assumes it. A second team with a
different asset size has no rule to follow.

**No rule for a longer control rail.** The panel is a hard 440px with no
min/max. The step rail's hidden horizontal scroll has no fade or arrow — with
eight steps it happens to fit, so the overflow path is untested.

**No text-overflow strategy.** Three rules set `white-space: nowrap` with no
`text-overflow: ellipsis`. Labels are user-facing strings that change length
substantially between Dutch and English.

**No naming convention.** Classes are two-to-four-letter abbreviations with no
prefix or structure, and `.opt` (the word "optional") sits one character from
`.opts`/`.opt-btn` (the option row), meaning something unrelated.
