// SSK Europe teamwear customiser. Same "one decision per step" flow as the
// glove builder: pick a garment, a model, colours, logos, names and numbers,
// sizes, then gather everything into one team order.
import { COLOURS, CATEGORIES, METHODS, LOGO_SIZES, PRICES, DISCOUNT, PHOTO_COLOURS, PHOTO_BACK, PRODUCTS, colourById, priceCode, productById, specFor, sizesFor } from './catalog.js';
import { renderGarment, hasBack, setPhotos } from './garments.js';

const STORE = 'ssk-teamwear-v1';
const MAX_LOGO = 1.5 * 1024 * 1024;

const T = {
  nl: {
    builder: 'Teamkleding samenstellen', total: 'Totaal', order: 'Teamorder', back: 'Terug', next: 'Verder',
    pending: 'Prijs volgt', perPiece: 'per stuk', front: 'Voorkant', backView: 'Achterkant',
    steps: { product: 'Product', model: 'Model', colours: 'Kleuren', logos: "Logo's & tekst", names: 'Namen & nummers', sizes: 'Maten & aantallen', order: 'Bestelling' },
    leads: {
      product: 'Kies wat je team wil laten maken. Elk product stel je apart samen en komt in één teamorder.',
      model: 'Kies het model.', colours: 'Klik een onderdeel op de afbeelding of in de lijst, kies dan de kleur.',
      logos: 'Upload jullie clublogo of zet een tekst op het kledingstuk. Per plek kies je bedrukken of borduren.',
      names: 'Namen en rugnummers per speler. De tekst komt uit de spelerslijst bij de volgende stap.',
      sizes: 'Vul per speler maat en aantal in. Zonder namen? Vul alleen maat en aantal in.',
      order: 'Alles wat je hebt samengesteld, in één aanvraag naar SSK Europe.',
    },
    material: 'Materiaal', part: 'Onderdeel', none: 'Niets', logo: 'Logo', text: 'Tekst', method: 'Techniek',
    upload: 'Logo uploaden', uploadHint: 'PNG of SVG met transparante achtergrond werkt het best (max. 1,5 MB).',
    tooBig: 'Dit bestand is groter dan 1,5 MB.', textPh: 'Bijv. clubnaam',
    namesOn: 'Namen en nummers op de rug', font: 'Letterstijl', fill: 'Letterkleur', outline: 'Rand', noOutline: 'Geen rand',
    fonts: { block: 'Block', varsity: 'Varsity', script: 'Script' },
    clash: 'Bij namen en nummers op de rug is de grote rugbedrukking niet mogelijk.',
    rosterName: 'Naam', rosterNo: 'Nr.', rosterSize: 'Maat', rosterQty: 'Aantal', addRow: '+ Speler toevoegen', remove: 'Verwijder',
    pieces: 'stuks', minQty: (n, m) => `Borduren kan vanaf ${n} stuks. Nu: ${m}.`,
    addToOrder: 'Toevoegen aan teamorder', update: 'Bijwerken in teamorder', newItem: '+ Nog een product', empty: 'Nog niets in de teamorder.',
    edit: 'Bewerken', club: 'Club / team', contact: 'Contactpersoon', email: 'E-mail', phone: 'Telefoon', notes: 'Opmerkingen (deadline, levering)',
    send: 'Aanvraag versturen', download: 'Specificatie downloaden', images: 'Afbeeldingen downloaden',
    sendNote: 'Je mailprogramma opent met de aanvraag. Voeg de gedownloade specificatie en je logobestanden toe als bijlage.',
    needClub: 'Vul clubnaam en e-mail in.', priceNote: 'Prijzen voor kleding, bedrukking en borduring volgen. SSK Europe stuurt een offerte op je aanvraag.',
    zoneHint: 'Klik op een onderdeel om de kleur te kiezen', variant: 'Model', decoration: 'Bedrukking',
    namesNumbers: 'Namen & nummers', yes: 'Ja', no: 'Nee', qtyTotal: 'Totaal aantal',
    garment: 'kledingstuk', colourCount: 'kleur(en)', inLogo: 'in het logo', nameplate: 'Naamplaat', number8: '8 inch nummer (rug)', number3: '3 inch nummer (voor)',
    discount: (n, p) => `${p}% korting vanaf ${n} stuks (indicatief)`, stillPending: 'Prijs volgt', colour: 'Kleur',
    photoNote: 'Productfoto. Kleur, logo en letters zie je op het echte kledingstuk.',
    notOnPhoto: 'Deze plek staat niet op de foto, maar wordt wel gemaakt.', logoSize: 'Logomaat',
    coloursHint: 'Elke kleur in het logo is een aparte laag. Twee kleuren is onze standaard; drie kan alleen bij een groot logo.',
    backNotOnPhoto: 'De achterkant staat niet op de foto; namen en nummers worden gemaakt zoals besteld.',
    whatOn: 'Wat komt erop', namesHint: 'Prijs per stuk; met rand telt het als 2 kleuren. Namen en nummers vul je in bij de volgende stap.',
  },
  en: {
    builder: 'Build your teamwear', total: 'Total', order: 'Team order', back: 'Back', next: 'Next',
    pending: 'Price to follow', perPiece: 'each', front: 'Front', backView: 'Back',
    steps: { product: 'Product', model: 'Model', colours: 'Colours', logos: 'Logos & text', names: 'Names & numbers', sizes: 'Sizes & quantities', order: 'Order' },
    leads: {
      product: 'Choose what your team needs. Each product is built on its own and goes into one team order.',
      model: 'Choose the model.', colours: 'Click a part on the picture or in the list, then pick its colour.',
      logos: 'Upload your club logo or put text on the garment. Pick print or embroidery per position.',
      names: 'Player names and numbers. The text comes from the roster in the next step.',
      sizes: 'Enter size and quantity per player. No names? Just fill in size and quantity.',
      order: 'Everything you built, in one request to SSK Europe.',
    },
    material: 'Material', part: 'Part', none: 'Nothing', logo: 'Logo', text: 'Text', method: 'Technique',
    upload: 'Upload logo', uploadHint: 'PNG or SVG with a transparent background works best (max. 1.5 MB).',
    tooBig: 'This file is larger than 1.5 MB.', textPh: 'E.g. team name',
    namesOn: 'Names and numbers on the back', font: 'Lettering', fill: 'Letter colour', outline: 'Outline', noOutline: 'No outline',
    fonts: { block: 'Block', varsity: 'Varsity', script: 'Script' },
    clash: 'With names and numbers on the back, the full back print is not available.',
    rosterName: 'Name', rosterNo: 'No.', rosterSize: 'Size', rosterQty: 'Qty', addRow: '+ Add player', remove: 'Remove',
    pieces: 'pieces', minQty: (n, m) => `Embroidery starts at ${n} pieces. Now: ${m}.`,
    addToOrder: 'Add to team order', update: 'Update in team order', newItem: '+ Another product', empty: 'Nothing in the team order yet.',
    edit: 'Edit', club: 'Club / team', contact: 'Contact person', email: 'E-mail', phone: 'Phone', notes: 'Notes (deadline, delivery)',
    send: 'Send request', download: 'Download specification', images: 'Download images',
    sendNote: 'Your mail app opens with the request. Attach the downloaded specification and your logo files.',
    needClub: 'Fill in club name and e-mail.', priceNote: 'Prices for garments, printing and embroidery to follow. SSK Europe replies to your request with a quote.',
    zoneHint: 'Click a part to choose its colour', variant: 'Model', decoration: 'Decoration',
    namesNumbers: 'Names & numbers', yes: 'Yes', no: 'No', qtyTotal: 'Total quantity',
    garment: 'garment', colourCount: 'colour(s)', inLogo: 'in the logo', nameplate: 'Name plate', number8: '8 inch number (back)', number3: '3 inch number (front)',
    discount: (n, p) => `${p}% discount from ${n} pieces (indicative)`, stillPending: 'Price to follow', colour: 'Colour',
    photoNote: 'Product photo. Colour, logo and lettering are shown on the real garment.',
    notOnPhoto: 'This position is not visible in the photo, but it is made.', logoSize: 'Logo size',
    coloursHint: 'Every colour in the logo is a separate layer. Two colours is our standard; three only for a large logo.',
    backNotOnPhoto: 'The back of this garment is not in the photo; names and numbers are made as ordered.',
    whatOn: 'What goes on it', namesHint: 'Price per piece; with an outline it counts as 2 colours. Names and numbers come from the roster in the next step.',
  },
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function freshItem(productId) {
  const product = productById(productId) || PRODUCTS[0];
  const colors = {};
  product.zones.forEach(z => { colors[z.id] = colourById(z.def).hex; });
  return {
    productId: product.id, variantId: product.variants[0].id, material: product.materials?.[0].id || null,
    colors, photoColour: 'black', deco: {},
    names: { enabled: !!product.names, name: true, back: true, front: false, font: 'block', fill: '#FFFFFF', outline: '#C8102E' },
    lettering: { fill: '#FFFFFF', outline: 'none', font: 'block' },
    roster: [{ name: '', number: '', size: sizesFor(product, product.variants[0].id)[2] || sizesFor(product, product.variants[0].id)[0], qty: 1 }],
  };
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE));
    if (raw && raw.item && productById(raw.item.productId)) {
      // Drafts from before names had their own switches had both on.
      for (const it of [raw.item, ...(raw.cart || [])]) {
        if (it.names.name === undefined) Object.assign(it.names, { name: true, back: true, front: false });
        it.photoColour ||= 'black';
      }
      return raw;
    }
  } catch { /* storage blocked or corrupt: start clean */ }
  return null;
}

const saved = load();
const S = saved || { lang: 'nl', step: 'product', item: freshItem('jersey'), editing: null, cart: [], club: { name: '', contact: '', email: '', phone: '', notes: '' } };
S.view = 'front';
S.zone = null;
let notice = '';

function save() {
  try { localStorage.setItem(STORE, JSON.stringify({ lang: S.lang, step: S.step, item: S.item, editing: S.editing, cart: S.cart, club: S.club })); }
  catch { notice = S.lang === 'nl' ? 'Opslaan in de browser lukt niet (logo te groot?). Je ontwerp blijft tot je de pagina sluit.' : 'Could not save in this browser (logo too large?). Your design stays until you close the page.'; }
}

const t = () => T[S.lang];
const L = o => o?.[S.lang] ?? o?.nl ?? '';
const product = () => productById(S.item.productId);
const spec = () => specFor(product(), S.item.variantId);

function stepsFor() {
  const p = product();
  const s = ['product', 'model', 'colours'];
  if (spec().placements.length) s.push('logos');
  if (p.names) s.push('names');
  s.push('sizes', 'order');
  return s;
}

// ------------------------------------------------------------------ pricing
function money(n) { return new Intl.NumberFormat(S.lang === 'nl' ? 'nl-NL' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(n); }

function qtyOf(item) { return item.roster.reduce((a, r) => a + (Number(r.qty) || 0), 0); }

// One item's price as lines with Pim's article codes. Anything without a
// price yet goes in `pending` and is shown as such, never guessed.
function decoChoice(item, pl) {
  const d = item.deco[pl.id];
  if (!d || d.kind === 'none' || (d.kind === 'text' && !d.text)) return null;
  const size = d.size || pl.size || 'md';
  const max = Math.max(...Object.keys(PRICES.logo[size]).map(Number));
  const colours = d.kind === 'text' ? 1 : Math.min(d.colours || 1, max);
  return { ...d, method: d.method || pl.methods[0], size, colours };
}

function nameColours(item) { return item.names.outline === 'none' ? 1 : 2; }

function priceOf(item) {
  const p = productById(item.productId);
  const sp = specFor(p, item.variantId);
  const q = qtyOf(item);
  const lines = []; const pending = [];
  if (p.price == null) pending.push(`${L(p)} (${t().garment})`);
  else lines.push({ code: p.id.toUpperCase(), label: L(p), unit: p.price, qty: q });
  sp.placements.forEach(pl => {
    const d = decoChoice(item, pl);
    if (!d || (pl.clashesWithNames && p.names && item.names.enabled)) return;
    if (!METHODS[d.method].priced) { pending.push(`${L(METHODS[d.method])} · ${L(pl)}`); return; }
    lines.push({ code: priceCode.logo(d.size, d.colours), label: `${L(pl)} · ${L(LOGO_SIZES[d.size])} · ${d.colours} ${t().colourCount}`, unit: PRICES.logo[d.size][d.colours], qty: q });
  });
  if (p.names && item.names.enabled) {
    const nc = nameColours(item);
    const count = f => item.roster.reduce((a, r) => a + (r[f] ? Number(r.qty) || 0 : 0), 0);
    if (item.names.name && count('name')) lines.push({ code: priceCode.name(nc), label: t().nameplate, unit: PRICES.name[nc], qty: count('name') });
    if (item.names.back && count('number')) lines.push({ code: priceCode.number(8, nc), label: t().number8, unit: PRICES.number[8][nc], qty: count('number') });
    if (item.names.front && count('number')) lines.push({ code: priceCode.number(3, nc), label: t().number3, unit: PRICES.number[3][nc], qty: count('number') });
  }
  const sub = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const discount = q >= DISCOUNT.minQty ? Math.round(sub * DISCOUNT.pct) / 100 : 0;
  return { lines, pending, sub, discount, total: sub - discount };
}

function priceLabel(items) {
  let sum = 0; let pending = false;
  items.forEach(i => { const p = priceOf(i); sum += p.total; pending = pending || p.pending.length > 0; });
  if (pending) return sum > 0 ? `${money(sum)} + …` : t().pending;
  return money(sum);
}

function breakdown(item) {
  const pr = priceOf(item);
  const rows = pr.lines.map(l => `<tr><td class="code">${esc(l.code)}</td><td>${esc(l.label)}</td><td class="num">${l.qty} × ${money(l.unit)}</td><td class="num">${money(l.qty * l.unit)}</td></tr>`).join('');
  return `<table class="price-table">${rows}
    ${pr.discount ? `<tr class="disc"><td></td><td>${t().discount(DISCOUNT.minQty, DISCOUNT.pct)}</td><td></td><td class="num">− ${money(pr.discount)}</td></tr>` : ''}
    <tr class="tot"><td></td><td>${t().total}</td><td></td><td class="num">${money(pr.total)}</td></tr></table>
    ${pr.pending.length ? `<p class="hint">${t().stillPending}: ${pr.pending.map(esc).join(', ')}</p>` : ''}`;
}

function minQtyProblems(item) {
  const sp = specFor(productById(item.productId), item.variantId);
  const q = qtyOf(item);
  const out = [];
  sp.placements.forEach(pl => {
    const d = item.deco[pl.id];
    if (!d || d.kind === 'none') return;
    const method = d.method || pl.methods[0];
    const min = pl.minQty?.[method];
    if (min && q < min) out.push(t().minQty(min, q));
  });
  return [...new Set(out)];
}

// ------------------------------------------------------------------ render
function previewState(item) {
  const first = item.roster.find(r => r.name || r.number) || {};
  return { colors: item.colors, photoColour: item.photoColour, deco: item.deco, names: item.names, lettering: item.lettering, preview: { name: first.name, number: first.number } };
}

function drawStage() {
  const sp = spec();
  const back = hasBack(sp);
  if (!back) S.view = 'front';
  $('stagesvg').innerHTML = renderGarment(sp, previewState(S.item), S.view, { label: `${L(product())} — ${L(sp.variant)}` });
  $('stageview').innerHTML = back
    ? ['front', 'back'].map(v => `<button type="button" data-view="${v}" class="${S.view === v ? 'is-on' : ''}">${v === 'front' ? t().front : t().backView}</button>`).join('')
    : '';
  $('stagetag').textContent = `${L(product())} · ${L(sp.variant)}`;
  $('stagesvg').querySelectorAll('[data-zone]').forEach(el => {
    if (S.zone && el.dataset.zone === S.zone) el.classList.add('is-zone');
  });
  $('stagehint').textContent = t().zoneHint;
}

function drawHeader() {
  document.documentElement.lang = S.lang;
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t()[el.dataset.t]; });
  $('lang-nl').classList.toggle('is-on', S.lang === 'nl');
  $('lang-en').classList.toggle('is-on', S.lang === 'en');
  $('price').textContent = priceLabel([...S.cart.filter((_, i) => i !== S.editing), S.item]);
  $('cartcount').textContent = S.cart.length;
}

function drawSteps() {
  const steps = stepsFor();
  if (!steps.includes(S.step)) S.step = 'product';
  $('steps').innerHTML = steps.map((s, i) => `<button type="button" class="step ${s === S.step ? 'is-on' : ''}" data-step="${s}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${t().steps[s]}</button>`).join('');
  const i = steps.indexOf(S.step);
  $('stepnum').textContent = String(i + 1).padStart(2, '0');
  $('steptot').textContent = String(steps.length).padStart(2, '0');
  $('steptitle').textContent = t().steps[S.step];
  $('steplead').textContent = t().leads[S.step];
  $('prev').disabled = i === 0;
  $('next').hidden = S.step === 'order';
  $('next').textContent = i < steps.length - 1 ? `${t().next}: ${t().steps[steps[i + 1]]}` : t().next;
  $('barfill').style.width = `${((i + 1) / steps.length) * 100}%`;
}

function thumb(p, variantId) {
  const it = freshItem(p.id);
  if (variantId) it.variantId = variantId;
  return renderGarment(specFor(p, it.variantId), { ...previewState(it), names: { enabled: false } }, 'front');
}

const BODY = {
  product() {
    const order = id => CATEGORIES.findIndex(c => c.id === id);
    const items = [...PRODUCTS].sort((a, b) => order(a.category) - order(b.category));
    return `<div class="cards">${items.map(p => `
      <button type="button" class="card ${S.item.productId === p.id ? 'is-on' : ''}" data-product="${p.id}">
        <span class="card-art">${thumb(p)}</span>
        <span class="cap"><span class="kick">${esc(L(CATEGORIES.find(c => c.id === p.category)))}</span><span class="nm">${esc(L(p))}</span><span class="sub">${esc(L(p.blurb))}</span></span>
      </button>`).join('')}</div>`;
  },
  model() {
    const p = product();
    let html = `<div class="field"><span class="field-lab">${t().variant}</span><div class="cards">${p.variants.map(v => `
      <button type="button" class="card ${S.item.variantId === v.id ? 'is-on' : ''}" data-variant="${v.id}">
        <span class="card-art">${thumb(p, v.id)}</span><span class="cap"><span class="nm">${esc(L(v))}</span></span>
      </button>`).join('')}</div></div>`;
    if (p.materials) {
      html += `<div class="field"><span class="field-lab">${t().material}</span><div class="opts">${p.materials.map(m => `
        <button type="button" class="opt-btn ${S.item.material === m.id ? 'is-on' : ''}" data-material="${m.id}">${esc(L(m))}</button>`).join('')}</div></div>`;
    }
    return html;
  },
  colours() {
    const sp = spec();
    if (sp.variant.photo) {
      const avail = Object.keys(PHOTOS[sp.variant.photo] || {});
      return `<div class="field"><span class="field-lab">${t().colour}</span><div class="swatches">${avail.map(slug => {
        const c = colourById(PHOTO_COLOURS[slug]) || { hex: '#ccc', nl: slug, en: slug };
        return `<button type="button" class="sw ${S.item.photoColour === slug ? 'is-on' : ''}" data-photocolour="${slug}"><span class="chip" style="background:${c.hex}"></span>${esc(L(c))}</button>`;
      }).join('')}</div></div><p class="note">${t().photoNote}</p>`;
    }
    const zones = sp.zones;
    if (!S.zone || !zones.some(z => z.id === S.zone)) S.zone = zones[0].id;
    const cur = S.item.colors[S.zone];
    return `<div class="field"><span class="field-lab">${t().part}</span><div class="zones">${zones.map(z => `
        <button type="button" class="zone-btn ${S.zone === z.id ? 'is-on' : ''}" data-zonepick="${z.id}">
          <span class="chip" style="background:${S.item.colors[z.id]}"></span>${esc(L(z))}
          <small>${esc(L(COLOURS.find(c => c.hex === S.item.colors[z.id])) || '')}</small>
        </button>`).join('')}</div></div>
      <div class="field"><span class="field-lab">${esc(L(zones.find(z => z.id === S.zone)))}</span>${swatches('zonecolour', cur)}</div>`;
  },
  logos() {
    const sp = spec();
    const names = product().names && S.item.names.enabled;
    return sp.placements.map(pl => {
      const d = S.item.deco[pl.id] || { kind: 'none' };
      const blocked = pl.clashesWithNames && names;
      const kinds = ['none', 'logo', ...(pl.text ? ['text'] : [])];
      let html = `<div class="field place" data-place="${pl.id}"><span class="field-lab">${esc(L(pl))}${pl.view === 'back' ? ` <span class="opt">(${t().backView.toLowerCase()})</span>` : ''}</span>`;
      if (blocked) return `${html}<p class="note">${t().clash}</p></div>`;
      html += `<div class="opts">${kinds.map(k => `<button type="button" class="opt-btn ${d.kind === k ? 'is-on' : ''}" data-kind="${k}" data-pl="${pl.id}">${t()[k]}</button>`).join('')}</div>`;
      if (d.kind === 'logo') {
        html += `<label class="upload"><input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" data-upload="${pl.id}"><span class="btn btn-ghost">${t().upload}</span>
          <span class="upload-name">${esc(d.fileName || '')}</span></label><p class="hint">${t().uploadHint}</p>`;
      }
      if (d.kind === 'text') {
        html += `<input class="input" type="text" maxlength="24" placeholder="${t().textPh}" value="${esc(d.text || '')}" data-text="${pl.id}">
          <span class="field-lab">${t().fill}</span>${swatches(`decofill:${pl.id}`, d.fill || S.item.lettering.fill)}`;
      }
      if (spec().variant.photo && pl.photoBox === null) html += `<p class="hint">${t().notOnPhoto}</p>`;
      if (d.kind !== 'none') {
        const ch = decoChoice(S.item, pl) || { size: d.size || pl.size || 'md', colours: 1, method: d.method || pl.methods[0] };
        if (METHODS[ch.method].priced) {
          html += `<span class="field-lab">${t().logoSize}</span><div class="opts">${Object.keys(LOGO_SIZES).map(sz => `
            <button type="button" class="opt-btn ${ch.size === sz ? 'is-on' : ''}" data-size="${sz}" data-pl="${pl.id}">${esc(L(LOGO_SIZES[sz]))}</button>`).join('')}</div>`;
          if (d.kind === 'logo') {
            html += `<span class="field-lab">${t().colourCount} ${t().inLogo}</span><div class="opts">${Object.keys(PRICES.logo[ch.size]).map(n => `
              <button type="button" class="opt-btn ${ch.colours === Number(n) ? 'is-on' : ''}" data-colours="${n}" data-pl="${pl.id}">${n}
              <small>${money(PRICES.logo[ch.size][n])} ${t().perPiece}</small></button>`).join('')}</div>
              <p class="hint">${t().coloursHint}</p>`;
          } else {
            html += `<p class="hint">${money(PRICES.logo[ch.size][1])} ${t().perPiece} (${priceCode.logo(ch.size, 1)})</p>`;
          }
        }
        html += `<span class="field-lab">${t().method}</span><div class="opts">${pl.methods.map(m => `
          <button type="button" class="opt-btn ${(d.method || pl.methods[0]) === m ? 'is-on' : ''}" data-method="${m}" data-pl="${pl.id}">${esc(L(METHODS[m]))}
          ${pl.minQty?.[m] ? `<small>min. ${pl.minQty[m]} ${t().pieces}</small>` : ''}</button>`).join('')}</div>`;
      }
      return `${html}</div>`;
    }).join('');
  },
  names() {
    const n = S.item.names;
    return `<div class="field"><span class="field-lab">${t().namesOn}</span><div class="opts">
        <button type="button" class="opt-btn ${n.enabled ? 'is-on' : ''}" data-names="1">${t().yes}</button>
        <button type="button" class="opt-btn ${!n.enabled ? 'is-on' : ''}" data-names="0">${t().no}</button></div></div>
      ${n.enabled ? `
      <div class="field"><span class="field-lab">${t().whatOn}</span><div class="opts">
        <button type="button" class="opt-btn ${n.name ? 'is-on' : ''}" data-ntoggle="name">${t().nameplate}<small>${money(PRICES.name[nameColours(S.item)])}</small></button>
        <button type="button" class="opt-btn ${n.back ? 'is-on' : ''}" data-ntoggle="back">${t().number8}<small>${money(PRICES.number[8][nameColours(S.item)])}</small></button>
        <button type="button" class="opt-btn ${n.front ? 'is-on' : ''}" data-ntoggle="front">${t().number3}<small>${money(PRICES.number[3][nameColours(S.item)])}</small></button>
      </div><p class="hint">${t().namesHint}</p>
      ${spec().variant.photo && !hasBack(spec()) ? `<p class="note">${t().backNotOnPhoto}</p>` : ''}</div>
      <div class="field"><span class="field-lab">${t().font}</span><div class="opts">${Object.keys(t().fonts).map(f => `
        <button type="button" class="opt-btn font-${f} ${n.font === f ? 'is-on' : ''}" data-font="${f}">${t().fonts[f]}</button>`).join('')}</div></div>
      <div class="field"><span class="field-lab">${t().fill}</span>${swatches('namefill', n.fill)}</div>
      <div class="field"><span class="field-lab">${t().outline}</span>
        <div class="opts"><button type="button" class="opt-btn ${n.outline === 'none' ? 'is-on' : ''}" data-swatch="nameoutline" data-hex="none">${t().noOutline}</button></div>
        ${swatches('nameoutline', n.outline)}</div>` : ''}`;
  },
  sizes() {
    const sizes = sizesFor(product(), S.item.variantId);
    const showNames = product().names && S.item.names.enabled;
    const rows = S.item.roster.map((r, i) => `<tr>
        ${showNames ? `<td><input class="input" data-roster="${i}" data-f="name" value="${esc(r.name)}" maxlength="18" aria-label="${t().rosterName}"></td>
        <td><input class="input num" data-roster="${i}" data-f="number" value="${esc(r.number)}" maxlength="3" inputmode="numeric" aria-label="${t().rosterNo}"></td>` : ''}
        <td><select class="input" data-roster="${i}" data-f="size" aria-label="${t().rosterSize}">${sizes.map(s => `<option ${r.size === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>
        <td><input class="input num" type="number" min="1" max="999" data-roster="${i}" data-f="qty" value="${esc(r.qty)}" aria-label="${t().rosterQty}"></td>
        <td><button type="button" class="icon-btn light" data-delrow="${i}" aria-label="${t().remove}" ${S.item.roster.length < 2 ? 'disabled' : ''}>&times;</button></td></tr>`).join('');
    const problems = minQtyProblems(S.item);
    return `<table class="roster"><thead><tr>${showNames ? `<th>${t().rosterName}</th><th>${t().rosterNo}</th>` : ''}<th>${t().rosterSize}</th><th>${t().rosterQty}</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
      <button type="button" class="btn btn-ghost" data-addrow>${t().addRow}</button>
      <p class="qty-total">${t().qtyTotal}: <b>${qtyOf(S.item)}</b> ${t().pieces}</p>
      ${problems.map(m => `<p class="note warn">${esc(m)}</p>`).join('')}`;
  },
  order() {
    const inCart = S.editing != null;
    const problems = minQtyProblems(S.item);
    const cart = S.cart.length ? S.cart.map((it, i) => {
      const p = productById(it.productId); const sp = specFor(p, it.variantId);
      return `<div class="line ${S.editing === i ? 'is-edit' : ''}">
        <span class="line-art">${renderGarment(sp, previewState(it), 'front')}</span>
        <span class="line-txt"><b>${esc(L(p))}</b><small>${esc(L(sp.variant))}${it.material ? ` · ${esc(L(p.materials.find(m => m.id === it.material)))}` : ''} · ${qtyOf(it)} ${t().pieces}</small>
        </span>
        <span class="line-acts"><button type="button" class="btn btn-ghost sm" data-edit="${i}">${t().edit}</button>
        <button type="button" class="icon-btn light" data-del="${i}" aria-label="${t().remove}">&times;</button></span>
        <div class="line-price">${breakdown(it)}</div></div>`;
    }).join('') : `<p class="hint">${t().empty}</p>`;
    const c = S.club;
    const field = (k, type = 'text') => `<label class="field"><span class="field-lab">${t()[k === 'name' ? 'club' : k]}</span><input class="input" type="${type}" data-club="${k}" value="${esc(c[k])}"></label>`;
    return `<div class="field"><span class="field-lab">${esc(L(product()))} · ${qtyOf(S.item)} ${t().pieces}</span>${breakdown(S.item)}</div>
      ${problems.map(m => `<p class="note warn">${esc(m)}</p>`).join('')}
      <button type="button" class="btn btn-primary" data-addcart ${problems.length ? 'disabled' : ''}>${inCart ? t().update : t().addToOrder}</button>
      <div class="field"><span class="field-lab">${t().order} (${S.cart.length})</span><div class="lines">${cart}</div>
      <button type="button" class="btn btn-ghost" data-newitem>${t().newItem}</button></div>
      ${field('name')}${field('contact')}${field('email', 'email')}${field('phone', 'tel')}
      <label class="field"><span class="field-lab">${t().notes}</span><textarea class="input" rows="3" data-club="notes">${esc(c.notes)}</textarea></label>
      <p class="note">${t().priceNote}</p>
      <div class="sheet-acts">
        <button type="button" class="btn btn-primary" data-send ${S.cart.length ? '' : 'disabled'}>${t().send}</button>
        <button type="button" class="btn btn-ghost" data-download ${S.cart.length ? '' : 'disabled'}>${t().download}</button>
        <button type="button" class="btn btn-ghost" data-images ${S.cart.length ? '' : 'disabled'}>${t().images}</button>
      </div>
      <p class="hint">${t().sendNote}</p>
      <p class="note warn" id="ordermsg" role="status" ${notice ? '' : 'hidden'}>${esc(notice)}</p>`;
  },
};

function swatches(target, current) {
  return `<div class="swatches">${COLOURS.map(c => `
    <button type="button" class="sw ${current?.toLowerCase() === c.hex.toLowerCase() ? 'is-on' : ''}" data-swatch="${target}" data-hex="${c.hex}">
      <span class="chip" style="background:${c.hex}"></span>${esc(L(c))}</button>`).join('')}</div>`;
}

function render() {
  drawHeader();
  drawSteps();
  drawStage();
  $('body').innerHTML = BODY[S.step]();
  save();
}

// ------------------------------------------------------------------ events
function go(step) { S.step = step; render(); $('body').scrollTop = 0; }

document.addEventListener('click', e => {
  const el = e.target.closest('button') || e.target.closest('#stagesvg [data-zone]');
  if (!el) return;
  const d = el.dataset;
  if (el.id === 'lang-nl' || el.id === 'lang-en') { S.lang = el.id.slice(5); render(); return; }
  if (el.id === 'prev') { const s = stepsFor(); go(s[Math.max(0, s.indexOf(S.step) - 1)]); return; }
  if (el.id === 'next') { const s = stepsFor(); go(s[Math.min(s.length - 1, s.indexOf(S.step) + 1)]); return; }
  if (el.id === 'cartbtn') { go('order'); return; }
  if (d.step) { go(d.step); return; }
  if (d.view) { S.view = d.view; drawStage(); return; }
  if (d.zone && el.closest('#stagesvg')) { S.zone = d.zone; go('colours'); return; }
  if (d.product) {
    if (d.product !== S.item.productId) { S.item = freshItem(d.product); S.zone = null; S.view = 'front'; }
    go('model'); return;
  }
  if (d.variant) {
    S.item.variantId = d.variant;
    const sizes = sizesFor(product(), d.variant);
    S.item.roster.forEach(r => { if (!sizes.includes(r.size)) r.size = sizes[Math.min(2, sizes.length - 1)]; });
    render(); return;
  }
  if (d.photocolour) { S.item.photoColour = d.photocolour; render(); return; }
  if (d.size && d.pl) { S.item.deco[d.pl] = { ...S.item.deco[d.pl], size: d.size }; render(); return; }
  if (d.colours) { S.item.deco[d.pl] = { ...S.item.deco[d.pl], colours: Number(d.colours) }; render(); return; }
  if (d.ntoggle) { S.item.names[d.ntoggle] = !S.item.names[d.ntoggle]; render(); return; }
  if (d.material) { S.item.material = d.material; render(); return; }
  if (d.zonepick) { S.zone = d.zonepick; render(); return; }
  if (d.swatch) {
    const [kind, pl] = d.swatch.split(':');
    if (kind === 'zonecolour') S.item.colors[S.zone] = d.hex;
    if (kind === 'namefill') S.item.names.fill = d.hex;
    if (kind === 'nameoutline') S.item.names.outline = d.hex;
    if (kind === 'decofill') S.item.deco[pl] = { ...S.item.deco[pl], fill: d.hex };
    render(); return;
  }
  if (d.kind) { S.item.deco[d.pl] = { ...(S.item.deco[d.pl] || {}), kind: d.kind }; if (d.kind !== 'none') S.view = spec().placements.find(p => p.id === d.pl).view; render(); return; }
  if (d.method) { S.item.deco[d.pl] = { ...S.item.deco[d.pl], method: d.method }; render(); return; }
  if (d.names) { S.item.names.enabled = d.names === '1'; render(); return; }
  if (d.font) { S.item.names.font = d.font; S.item.lettering.font = d.font; render(); return; }
  if ('addrow' in d) { const last = S.item.roster.at(-1); S.item.roster.push({ name: '', number: '', size: last.size, qty: 1 }); render(); return; }
  if (d.delrow) { S.item.roster.splice(Number(d.delrow), 1); render(); return; }
  if ('addcart' in d) {
    const copy = structuredClone(S.item);
    if (S.editing != null) S.cart[S.editing] = copy; else S.cart.push(copy);
    S.editing = S.cart.indexOf(copy);
    notice = ''; render(); return;
  }
  if ('newitem' in d) { S.item = freshItem(S.item.productId); S.editing = null; S.zone = null; go('product'); return; }
  if (d.edit) { S.editing = Number(d.edit); S.item = structuredClone(S.cart[S.editing]); go('colours'); return; }
  if (d.del) {
    const i = Number(d.del);
    S.cart.splice(i, 1);
    if (S.editing === i) S.editing = null; else if (S.editing > i) S.editing -= 1;
    render(); return;
  }
  if ('send' in d) { sendRequest(); return; }
  if ('download' in d) { downloadSpec(); return; }
  if ('images' in d) { downloadImages(); return; }
});

document.addEventListener('input', e => {
  const el = e.target; const d = el.dataset;
  if (d.text) { S.item.deco[d.text] = { ...S.item.deco[d.text], text: el.value }; drawStage(); drawHeader(); save(); }
  if (d.roster) {
    const r = S.item.roster[Number(d.roster)];
    r[d.f] = d.f === 'qty' ? Math.max(0, Math.min(999, parseInt(el.value, 10) || 0)) : el.value;
    drawStage(); drawHeader(); save();
    const tot = document.querySelector('.qty-total b'); if (tot) tot.textContent = qtyOf(S.item);
  }
  if (d.club) { S.club[d.club] = el.value; save(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.roster && el.tagName === 'SELECT') { S.item.roster[Number(el.dataset.roster)].size = el.value; save(); }
  if (el.dataset.f === 'qty') render();
  if (el.dataset.upload) readLogo(el);
});

function readLogo(input) {
  const file = input.files[0]; const pl = input.dataset.upload;
  if (!file) return;
  if (file.size > MAX_LOGO) { alert(t().tooBig); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => { S.item.deco[pl] = { ...S.item.deco[pl], kind: 'logo', logo: reader.result, fileName: file.name }; render(); };
  reader.readAsDataURL(file);
}

// ------------------------------------------------------------------ output
function describe(item) {
  const p = productById(item.productId); const sp = specFor(p, item.variantId);
  const colour = hex => L(COLOURS.find(c => c.hex.toLowerCase() === String(hex).toLowerCase())) || hex;
  const lines = [`${L(p)} — ${L(sp.variant)}${item.material ? ` — ${L(p.materials.find(m => m.id === item.material))}` : ''}`];
  if (!sp.variant.photo) sp.zones.forEach(z => lines.push(`  ${L(z)}: ${colour(item.colors[z.id])}`));
  sp.placements.forEach(pl => {
    const d = item.deco[pl.id];
    if (!d || d.kind === 'none') return;
    const ch = decoChoice(item, pl);
    if (!ch) return;
    const what = d.kind === 'logo' ? `${t().logo} (${d.fileName || '—'}), ${ch.colours} ${t().colourCount}` : `${t().text} "${d.text}" ${colour(d.fill || item.lettering.fill)}`;
    lines.push(`  ${L(pl)}: ${what}, ${L(LOGO_SIZES[ch.size])}, ${L(METHODS[ch.method])}`);
  });
  if (sp.variant.photo) lines.push(`  ${t().colour}: ${L(colourById(PHOTO_COLOURS[item.photoColour])) || item.photoColour}`);
  if (p.names) lines.push(`  ${t().namesNumbers}: ${item.names.enabled ? `${[item.names.name && t().nameplate, item.names.back && t().number8, item.names.front && t().number3].filter(Boolean).join(', ')}; ${t().fonts[item.names.font]}, ${colour(item.names.fill)} / ${item.names.outline === 'none' ? t().noOutline : colour(item.names.outline)}` : t().no}`);
  item.roster.forEach(r => lines.push(`    ${[r.name, r.number && `#${r.number}`, r.size, `${r.qty}x`].filter(Boolean).join(' · ')}`));
  lines.push(`  ${t().qtyTotal}: ${qtyOf(item)}`);
  const pr = priceOf(item);
  pr.lines.forEach(l => lines.push(`  ${l.code}  ${l.label}  ${l.qty} x ${money(l.unit)} = ${money(l.qty * l.unit)}`));
  if (pr.discount) lines.push(`  ${t().discount(DISCOUNT.minQty, DISCOUNT.pct)}: -${money(pr.discount)}`);
  lines.push(`  ${t().total}: ${money(pr.total)}${pr.pending.length ? ` + ${t().stillPending.toLowerCase()}: ${pr.pending.join(', ')}` : ''}`);
  return lines.join('\n');
}

function requestText() {
  const c = S.club;
  return [`${t().club}: ${c.name}`, `${t().contact}: ${c.contact}`, `${t().email}: ${c.email}`, `${t().phone}: ${c.phone}`,
    c.notes && `${t().notes}: ${c.notes}`, '', ...S.cart.map((it, i) => `${i + 1}. ${describe(it)}\n`)].filter(x => x !== '' && x != null || x === '').join('\n');
}

function sendRequest() {
  if (!S.club.name || !S.club.email) { notice = t().needClub; render(); return; }
  const subject = `Teamkleding aanvraag — ${S.club.name}`;
  location.href = `mailto:orders@sskeurope.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestText())}`;
}

function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function slug() { return (S.club.name || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team'; }

function downloadSpec() {
  const data = {
    created: new Date().toISOString(), club: S.club,
    items: S.cart.map(it => ({ ...it, deco: Object.fromEntries(Object.entries(it.deco).map(([k, v]) => [k, { ...v, logo: v.logo ? '(bijlage)' : undefined }])) })),
  };
  saveBlob(new Blob([`${requestText()}\n\n---\n${JSON.stringify(data, null, 2)}`], { type: 'text/plain' }), `ssk-teamwear-${slug()}.txt`);
}

async function svgToPng(svg, w = 900) {
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const h = Math.round(w * vb[3] / vb[2]);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
  return new Promise(res => cv.toBlob(res, 'image/png'));
}

async function downloadImages() {
  for (const [i, it] of S.cart.entries()) {
    const sp = specFor(productById(it.productId), it.variantId);
    for (const view of hasBack(sp) ? ['front', 'back'] : ['front']) {
      saveBlob(await svgToPng(renderGarment(sp, previewState(it), view)), `ssk-${slug()}-${i + 1}-${it.productId}-${view}.png`);
    }
  }
}

let PHOTOS = {};
fetch('photos/photos.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(index => {
  PHOTOS = index;
  setPhotos(index, PHOTO_BACK);
  render();
});
