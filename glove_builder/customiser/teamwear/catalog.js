// SSK Europe teamwear catalogue: what a club can order and what each part of
// it may be. Prices marked PRICE_PENDING wait for Pim's price list; the page
// shows "prijs volgt" for them and never invents a number.
export const PRICE_PENDING = null;

// Team colours. These are garment colours a club can pick, not interface
// colours: a club in navy still gets navy shirts.
export const COLOURS = [
  { id: 'black', hex: '#0B0B0C', nl: 'Zwart', en: 'Black' },
  { id: 'white', hex: '#FFFFFF', nl: 'Wit', en: 'White' },
  { id: 'scarlet', hex: '#C8102E', nl: 'Rood', en: 'Scarlet' },
  { id: 'maroon', hex: '#6D1A2B', nl: 'Bordeaux', en: 'Maroon' },
  { id: 'navy', hex: '#1B2A4A', nl: 'Marineblauw', en: 'Navy' },
  { id: 'royal', hex: '#1F4FB0', nl: 'Koningsblauw', en: 'Royal' },
  { id: 'columbia', hex: '#7BAFD4', nl: 'Lichtblauw', en: 'Columbia blue' },
  { id: 'kelly', hex: '#1E8A44', nl: 'Groen', en: 'Kelly green' },
  { id: 'forest', hex: '#1F4D32', nl: 'Donkergroen', en: 'Forest green' },
  { id: 'gold', hex: '#F2B705', nl: 'Geel', en: 'Gold' },
  { id: 'vegas', hex: '#C5B358', nl: 'Vegas goud', en: 'Vegas gold' },
  { id: 'orange', hex: '#E8620E', nl: 'Oranje', en: 'Orange' },
  { id: 'purple', hex: '#4B2A7B', nl: 'Paars', en: 'Purple' },
  { id: 'grey', hex: '#A3A5AA', nl: 'Grijs', en: 'Grey' },
  { id: 'charcoal', hex: '#3A3B3F', nl: 'Antraciet', en: 'Charcoal' },
  { id: 'cream', hex: '#EFE7D2', nl: 'Crème', en: 'Cream' },
];
export const colourById = id => COLOURS.find(c => c.id === id);

export const CATEGORIES = [
  { id: 'jerseys', nl: 'Jerseys', en: 'Jerseys' },
  { id: 'pants', nl: 'Broeken & shorts', en: 'Pants & shorts' },
  { id: 'jackets', nl: 'Jassen', en: 'Jackets' },
  { id: 'hoodies', nl: 'Hoodies', en: 'Hoodies' },
  { id: 'tees', nl: 'T-shirts & polo\'s', en: 'T-shirts & polos' },
  { id: 'caps', nl: 'Petten', en: 'Caps' },
  { id: 'accessories', nl: 'Accessoires', en: 'Accessories' },
];

// Decoration. Pim's price sheet fills `price` (per piece, excl. set-up).
export const METHODS = {
  print: { nl: 'Bedrukking', en: 'Print', price: PRICE_PENDING },
  embroidery: { nl: 'Borduring', en: 'Embroidery', price: PRICE_PENDING },
};
export const NAME_PRICE = PRICE_PENDING;    // per name on the back
export const NUMBER_PRICE = PRICE_PENDING;  // per number on the back

export const SIZES = {
  adult: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  youth: ['YS', 'YM', 'YL', 'YXL'],
  fitted: ['6 7/8', '7', '7 1/8', '7 1/4', '7 3/8', '7 1/2', '7 5/8'],
  flex: ['S/M', 'M/L', 'L/XL'],
  one: ['One size'],
  socks: ['S (35-38)', 'M (39-42)', 'L (43-46)'],
};

const Z = (id, nl, en, def) => ({ id, nl, en, def });

const SHIRT_FRONT = [
  { id: 'chest', view: 'front', nl: 'Borst midden (clubnaam / logo)', en: 'Chest centre (team name / logo)', box: { x: 112, y: 140, w: 176, h: 76 }, methods: ['print', 'embroidery'], text: true },
  { id: 'heart', view: 'front', nl: 'Borst links', en: 'Left chest', box: { x: 224, y: 104, w: 54, h: 44 }, methods: ['print', 'embroidery'] },
  { id: 'sleeveL', view: 'front', nl: 'Mouw', en: 'Sleeve', box: { x: 300, y: 104, w: 52, h: 46 }, methods: ['print', 'embroidery'] },
  { id: 'nape', view: 'back', nl: 'Nek', en: 'Back of neck', box: { x: 172, y: 64, w: 56, h: 22 }, methods: ['print', 'embroidery'] },
];

export const PRODUCTS = [
  {
    id: 'jersey', category: 'jerseys', template: 'shirt', names: true, sizes: ['adult', 'youth'],
    nl: 'Baseball jersey', en: 'Baseball jersey',
    blurb: { nl: 'Wedstrijdshirt met knopen, voor baseball en softbal.', en: 'Button game jersey for baseball and softball.' },
    price: PRICE_PENDING,
    variants: [
      { id: 'full', nl: 'Volledig doorknoopt', en: 'Full button', neck: 'vbutton', placket: 'full' },
      { id: 'two', nl: 'Two-button', en: 'Two-button', neck: 'vbutton', placket: 'two' },
      { id: 'crew', nl: 'Ronde hals (gesublimeerd)', en: 'Crew neck (sublimated)', neck: 'crew' },
    ],
    zones: [Z('body', 'Romp', 'Body', 'white'), Z('sleeves', 'Mouwen', 'Sleeves', 'black'), Z('trim', 'Boord & mouwrand', 'Collar & cuffs', 'scarlet'), Z('piping', 'Bies', 'Piping', 'scarlet'), Z('buttons', 'Knopen', 'Buttons', 'black')],
    placements: SHIRT_FRONT,
  },
  {
    id: 'pants', category: 'pants', template: 'pants', names: true, sizes: ['adult', 'youth'],
    nl: 'Baseball broek', en: 'Baseball pants',
    blurb: { nl: 'Lang, knicker of short; met of zonder bies.', en: 'Full length, knicker or shorts; with or without piping.' },
    price: PRICE_PENDING,
    variants: [
      { id: 'long', nl: 'Lang', en: 'Full length', length: 'long' },
      { id: 'knicker', nl: 'Knicker', en: 'Knicker', length: 'knicker' },
      { id: 'short', nl: 'Short', en: 'Shorts', length: 'short' },
    ],
    zones: [Z('body', 'Broek', 'Pants', 'white'), Z('waist', 'Tailleband & lussen', 'Waistband & loops', 'black'), Z('piping', 'Bies', 'Piping', 'scarlet')],
    placements: [{ id: 'hip', view: 'front', nl: 'Heup', en: 'Hip', box: { x: 236, y: 66, w: 44, h: 36 }, methods: ['print', 'embroidery'] }],
  },
  {
    id: 'jacket', category: 'jackets', template: 'jacket', names: true, sizes: ['adult', 'youth'],
    nl: 'Windbreaker', en: 'Windbreaker',
    blurb: { nl: 'Dik met lange mouwen, of dun met korte mouwen en zakken.', en: 'Heavy with long sleeves, or light with short sleeves and pockets.' },
    price: PRICE_PENDING,
    variants: [
      { id: 'thick', nl: 'Dik, lange mouwen', en: 'Heavy, long sleeves', zip: 'half', sleeve: 'long' },
      { id: 'thin', nl: 'Dun, korte mouwen met zakken', en: 'Light, short sleeves with pockets', zip: 'half', sleeve: 'short', pockets: true },
    ],
    zones: [Z('body', 'Romp', 'Body', 'black'), Z('yoke', 'Schouderpas', 'Shoulder yoke', 'black'), Z('sleeves', 'Mouwen', 'Sleeves', 'black'), Z('stripe', 'Mouwstreep', 'Sleeve stripe', 'scarlet'), Z('trim', 'Kraag & boorden', 'Collar & ribbing', 'scarlet'), Z('pocket', 'Zakken', 'Pockets', 'black'), Z('zipper', 'Rits', 'Zip', 'white')],
    placements: [
      { id: 'heart', view: 'front', nl: 'Borst links', en: 'Left chest', box: { x: 222, y: 140, w: 62, h: 50 }, methods: ['print', 'embroidery'] },
      { id: 'chestR', view: 'front', nl: 'Borst rechts', en: 'Right chest', box: { x: 116, y: 140, w: 62, h: 50 }, methods: ['print', 'embroidery'], text: true },
      { id: 'back', view: 'back', nl: 'Rug groot', en: 'Full back', box: { x: 110, y: 120, w: 180, h: 130 }, methods: ['print', 'embroidery'], text: true, clashesWithNames: true },
    ],
  },
  {
    id: 'hoodie', category: 'hoodies', template: 'hoodie', names: true, sizes: ['adult', 'youth'],
    nl: 'Hoodie', en: 'Hoodie',
    blurb: { nl: 'Trui met capuchon, als pullover of met rits.', en: 'Hooded sweatshirt, pullover or full zip.' },
    price: PRICE_PENDING,
    variants: [
      { id: 'pullover', nl: 'Pullover', en: 'Pullover', zip: false },
      { id: 'zip', nl: 'Met rits', en: 'Full zip', zip: true },
    ],
    materials: [
      { id: 'cotton', nl: 'Katoen', en: 'Cotton' },
      { id: 'drigear', nl: 'Polyester (DRI-GEAR)', en: 'Polyester (DRI-GEAR)' },
    ],
    zones: [Z('body', 'Romp', 'Body', 'black'), Z('sleeves', 'Mouwen', 'Sleeves', 'black'), Z('hood', 'Capuchon', 'Hood', 'black'), Z('pocket', 'Buidelzak', 'Pocket', 'black'), Z('trim', 'Boorden', 'Ribbing', 'black'), Z('drawcord', 'Koord', 'Drawcord', 'white'), Z('zipper', 'Rits', 'Zip', 'white')],
    placements: [
      { id: 'chest', view: 'front', nl: 'Borst midden', en: 'Chest centre', box: { x: 128, y: 160, w: 144, h: 100 }, methods: ['print', 'embroidery'], text: true },
      { id: 'heart', view: 'front', nl: 'Borst links', en: 'Left chest', box: { x: 222, y: 120, w: 54, h: 44 }, methods: ['print', 'embroidery'] },
      { id: 'back', view: 'back', nl: 'Rug groot', en: 'Full back', box: { x: 112, y: 130, w: 176, h: 150 }, methods: ['print'], text: true, clashesWithNames: true },
    ],
  },
  {
    id: 'tee', category: 'tees', template: 'shirt', names: true, sizes: ['adult', 'youth'],
    nl: 'T-shirt', en: 'T-shirt',
    blurb: { nl: 'Trainings- en supportersshirt, korte of lange mouw.', en: 'Practice and fan tee, short or long sleeve.' },
    price: PRICE_PENDING,
    variants: [
      { id: 'short', nl: 'Korte mouw', en: 'Short sleeve', neck: 'crew' },
      { id: 'long', nl: 'Lange mouw', en: 'Long sleeve', neck: 'crew', sleeve: 'long' },
    ],
    zones: [Z('body', 'Romp', 'Body', 'black'), Z('sleeves', 'Mouwen', 'Sleeves', 'black'), Z('trim', 'Boord', 'Collar', 'black')],
    placements: SHIRT_FRONT,
  },
  {
    id: 'polo', category: 'tees', template: 'shirt', names: false, sizes: ['adult'],
    nl: 'Polo', en: 'Polo',
    blurb: { nl: 'Coach- en staffpolo.', en: 'Coach and staff polo.' },
    price: PRICE_PENDING,
    variants: [{ id: 'std', nl: 'Korte mouw', en: 'Short sleeve', neck: 'polo' }],
    zones: [Z('body', 'Romp', 'Body', 'black'), Z('sleeves', 'Mouwen', 'Sleeves', 'black'), Z('trim', 'Kraag & mouwrand', 'Collar & cuffs', 'scarlet'), Z('buttons', 'Knopen', 'Buttons', 'black')],
    placements: SHIRT_FRONT.filter(p => p.id !== 'chest'),
  },
  {
    id: 'cap', category: 'caps', template: 'cap', names: false, sizes: null,
    nl: 'Pet', en: 'Cap',
    blurb: { nl: 'Open of dicht. Borduren vanaf 12 stuks.', en: 'Open or closed back. Embroidery from 12 pieces.' },
    price: PRICE_PENDING,
    variants: [
      { id: 'closed', nl: 'Dicht (fitted)', en: 'Closed back (fitted)', closure: 'fitted', sizes: ['fitted'] },
      { id: 'open', nl: 'Open (verstelbaar)', en: 'Open back (adjustable)', closure: 'snap', sizes: ['one'] },
    ],
    zones: [Z('front', 'Voorpanelen', 'Front panels', 'black'), Z('sides', 'Zij- & achterpanelen', 'Side & back panels', 'black'), Z('visor', 'Klep', 'Visor', 'black'), Z('button', 'Knoop', 'Button', 'scarlet'), Z('trim', 'Sluiting', 'Closure', 'black')],
    placements: [
      { id: 'front', view: 'front', nl: 'Voorkant', en: 'Front', box: { x: 146, y: 112, w: 108, h: 84 }, methods: ['embroidery', 'print'], text: true, minQty: { embroidery: 12 } },
      { id: 'backArch', view: 'back', nl: 'Achterkant', en: 'Back', box: { x: 150, y: 120, w: 100, h: 36 }, methods: ['embroidery'], text: true, minQty: { embroidery: 12 } },
    ],
  },
  {
    id: 'socks', category: 'accessories', template: 'socks', names: false, sizes: ['socks'],
    nl: 'Sokken', en: 'Socks',
    blurb: { nl: 'Teamsokken in clubkleuren.', en: 'Team socks in club colours.' },
    price: PRICE_PENDING,
    variants: [{ id: 'std', nl: 'Halfhoog', en: 'Crew' }],
    zones: [Z('body', 'Sok', 'Sock', 'black'), Z('trim', 'Boord', 'Cuff', 'scarlet'), Z('stripe', 'Streep', 'Stripe', 'white')],
    placements: [],
  },
  {
    id: 'bag', category: 'accessories', template: 'bag', names: false, sizes: ['one'],
    nl: 'Teamtas', en: 'Team bag',
    blurb: { nl: 'Rugzak / equipment bag met clublogo.', en: 'Backpack / equipment bag with club logo.' },
    price: PRICE_PENDING,
    variants: [{ id: 'std', nl: 'Standaard', en: 'Standard' }],
    zones: [Z('body', 'Tas', 'Bag', 'black'), Z('trim', 'Band & handvat', 'Band & handle', 'scarlet')],
    placements: [{ id: 'front', view: 'front', nl: 'Voorkant', en: 'Front', box: { x: 130, y: 170, w: 140, h: 110 }, methods: ['embroidery', 'print'], text: true }],
  },
];

export const productById = id => PRODUCTS.find(p => p.id === id);

// The spec the renderer draws from: product + chosen variant, with the zones
// and placements that variant actually has.
export function specFor(product, variantId) {
  const variant = product.variants.find(v => v.id === variantId) || product.variants[0];
  let zones = product.zones;
  let placements = product.placements;
  if (product.template === 'jacket' && !variant.pockets) zones = zones.filter(z => z.id !== 'pocket');
  if (product.template === 'jacket' && variant.sleeve === 'short') zones = zones.filter(z => z.id !== 'stripe');
  if (product.template === 'shirt' && variant.neck !== 'vbutton') {
    zones = zones.filter(z => z.id !== 'piping' && (z.id !== 'buttons' || variant.neck === 'polo'));
  }
  if (product.template === 'hoodie' && !variant.zip) zones = zones.filter(z => z.id !== 'zipper');
  return { ...product, variant, zones, placements, names: product.names };
}

export function sizesFor(product, variantId) {
  const variant = product.variants.find(v => v.id === variantId) || product.variants[0];
  const groups = variant.sizes || product.sizes || ['one'];
  return groups.flatMap(g => SIZES[g]);
}
