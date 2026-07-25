// Catalogue for SSK's 36-question custom glove order form.
// Every option list below is copied verbatim from
// glove_builder/form_spec.json in scottprins32-hub/ssk-glove-demo.

const F = 'assets/form/';

export const HANDS = [
  { id: 'RHT', en: 'Right handed thrower', nl: 'Rechtshandige werper', sub: 'Glove on your left hand' },
  { id: 'LHT', en: 'Left handed thrower', nl: 'Linkshandige werper', sub: 'Glove on your right hand' }
];

export const SIZES = ['11.5"', '11.75"', '12"', '12.25"', '12.5"', '12.75"'];

export const PADS = [
  { id: 'None', en: 'None', nl: 'Geen', img: F + 'finger_pad/None.jpg' },
  { id: 'Finger Pad', en: 'Finger pad', nl: 'Vingerpad', img: 'assets/ref/finger_pad.webp' },
  { id: 'Finger Hood', en: 'Finger hood', nl: 'Vingerkap', img: F + 'finger_pad/Finger_Hood.jpg' }
];

export const WEBS = [
  { id: 'Spiral I-Web', img: F + 'webs/Spiral_I_Web.png', sizes: ['11.5"', '11.75"'] },
  { id: 'Standard I-Web', img: F + 'webs/Standard_I_Web.jpg', sizes: ['11.5"', '11.75"'] },
  { id: 'SMS-Web', img: F + 'webs/SMS_Web.jpg', sizes: ['11.75"'] },
  { id: 'SMK-Web', img: F + 'webs/SMK_Web.jpg', sizes: ['11.75"'] },
  { id: 'H-Web', img: F + 'webs/H_Web.jpg', sizes: ['11.75"', '12"', '12.25"', '12.5"', '12.75"'] },
  { id: 'SMLEE-Web', img: F + 'webs/SMLEE_Web.jpg', sizes: ['11.75"'] },
  { id: 'Modified Trapeze-Web', img: F + 'webs/Modified_Trapeze_Web.jpg', sizes: ['12"'] },
  { id: 'Basket-Web', img: F + 'webs/Basket_Web.jpg', sizes: ['12"', '12.25"'] },
  { id: 'Em Rocket-Web', img: F + 'webs/Em_Rocket_Web.jpg', sizes: ['12"'] },
  { id: 'Sasaki 1-Web', img: F + 'webs/Sasaki_1_Web.jpg', sizes: ['12"'] },
  { id: 'Sasaki 2-Web', img: F + 'webs/Sasaki_2_Web.jpg', sizes: ['12"', '12.25"'] },
  { id: 'Closed Diamond Net-Web', img: F + 'webs/Closed_Diamond_Net_Web.jpg', sizes: ['12.25"'] },
  { id: 'Trapeze-Web', img: F + 'webs/Trapeze_Web.jpg', sizes: ['12.75"'] }
];

export const EMB_FONTS = [
  'Block', 'Script', 'Brush', 'Kanji',
  'Block with Outline', 'Script with Outline', 'Brush with Outline', 'Kanji with Outline',
  'Block with Shadow', 'Script with Shadow', 'Brush with Shadow', 'Kanji with Shadow'
].map(n => ({ id: n, img: F + 'fonts/' + n.replace(/ /g, '_') + '.jpg' }));

/* The flag goes on the INDEX finger, exactly as SSK's Google Form says —
   the orange glove Scott photographed has the Dutch flag on one unsplit
   index-finger panel. `art` is the file the renderer lays on the finger;
   the same file is the picker thumbnail. See make_flags.py. */
const FL = 'assets/flags/';
export const FLAGS = [
  { id: 'None', en: 'No flag', nl: 'Geen vlag', img: null, art: null },
  { id: 'Netherlands', en: 'Netherlands', nl: 'Nederland', art: FL + 'netherlands.svg' },
  { id: 'Belgium', en: 'Belgium', nl: 'België', art: FL + 'belgium.svg' },
  { id: 'Germany', en: 'Germany', nl: 'Duitsland', art: FL + 'germany.svg' },
  { id: 'Italy', en: 'Italy', nl: 'Italië', art: FL + 'italy.svg' },
  { id: 'United States', en: 'United States', nl: 'Verenigde Staten', art: FL + 'usa.svg' },
  { id: 'Japan', en: 'Japan', nl: 'Japan', art: FL + 'japan.svg' },
  { id: 'Curaçao', en: 'Curaçao', nl: 'Curaçao', art: FL + 'curacao.svg' },
  { id: 'Aruba', en: 'Aruba', nl: 'Aruba', art: FL + 'aruba.svg' },
  { id: 'Sint Maarten', en: 'Sint Maarten', nl: 'Sint Maarten', art: FL + 'sint_maarten.svg' },
  { id: 'Other Flag', en: 'Other flag', nl: 'Andere vlag', img: null, art: null }
].map(f => ({ ...f, img: f.img === undefined ? f.art : f.img }));

export const CIRCLE_COLORS = [
  ['Black', '#17161A'], ['Navy', '#1D3A8F'], ['Yellow', '#E8B84C'],
  ['Red', '#C8102E'], ['Blue', '#2145D6'], ['White', '#F2F0EA']
];

// Fields the order form asks for that the back-view render cannot show.
export const OFFSTAGE = {
  back1: 'Wingtip — hidden behind the thumb on this view',
  back9: 'Wingtip — hidden behind the pinky on this view',
  back8: 'Preview merges Back 7 + 8 into one panel',
  palm: 'Palm side — not photographed yet',
  pad_color: 'Only visible with a pad or hood fitted'
};

// Blank first: a visitor starts from a clean glove and builds it up, rather
// than being handed someone else's colourway to undo. Then signature,
// national, stock. app.js applies STARTERS[0] on load, so this is the default.
// `slot: true` marks a signature card that still needs a real SSK athlete attached.
// `flag` is a FLAGS id: a national build arrives with its flag already on the
// index finger, which is the whole point of picking that card.
export const STARTERS = [
  { id: 'blank', en: 'Blank glove', nl: 'Blanco handschoen', group: 'blank', marks: false, bullet: 7,
    colors: { _panels: '10', welting: '10', laces: '10', binding: '10', lining: '10',
              thumb_loops: '10', pinky_loops: '10', embroidery: '10', stitching: '10' } },
  { id: 'pro', en: 'Black / Gold', nl: 'Zwart / Goud', group: 'signature', slot: true, bullet: 7,
    colors: { _panels: '90', welting: 'GF', laces: '90', binding: '90', lining: '40',
              thumb_loops: '90', pinky_loops: '90', embroidery: '39', stitching: '90' } },
  { id: 'sig2', en: 'Cardinal / White', nl: 'Cardinal / Wit', group: 'signature', slot: true, bullet: 5,
    colors: { _panels: '20', welting: '10', laces: '10', binding: '20', lining: '20',
              thumb_loops: '10', pinky_loops: '10', embroidery: '10', stitching: '10' } },
  { id: 'nl', en: 'Netherlands', nl: 'Nederland', group: 'national', bullet: 14,
    flag: 'Netherlands',
    colors: { _panels: '35', welting: '70', laces: '70', binding: '70', lining: '70',
              thumb_loops: '70', pinky_loops: '70', embroidery: '10', stitching: '70' } },
  { id: 'cw', en: 'Curaçao', nl: 'Curaçao', group: 'national', bullet: 13,
    flag: 'Curaçao',
    colors: { _panels: '60', welting: '45', laces: '45', binding: '45', lining: '60',
              thumb_loops: '45', pinky_loops: '45', embroidery: '10', stitching: '45' } },
  { id: 'Navy & Orange', en: 'Navy & Orange', nl: 'Navy & Oranje', group: 'stock', bullet: 14 },
  { id: 'Classic Tan', en: 'Classic Tan', nl: 'Klassiek Tan', group: 'stock', bullet: 7 },
  { id: 'Black & Pink', en: 'Black & Pink', nl: 'Zwart & Roze', group: 'stock', bullet: 8 }
];

// The flat build order. One step, one decision — no category inside a category.
// Colours are all handled in a single step by picking the part on the glove.
export const COLOUR_ORDER = ['web', 'back1', 'back2', 'back3', 'back4', 'back5', 'back6',
  'back7', 'back8', 'back9', 'palm', 'belt', 'lining', 'binding', 'welting', 'laces',
  'thumb_loops', 'pinky_loops', 'stitching', 'ring_emb', 'pad_color'];

export const T = {
  en: {
    builder: 'Custom glove builder', model: 'SSK Pro Custom · back view',
    start: 'Start', fit: 'Fit', web: 'Web', back: 'Back panels', leather: 'Leather & lacing',
    logos: 'Logos', personal: 'Personalisation', you: 'Your details',
    hand: 'Hand', size: 'Glove size', pad: 'Finger pad / hood', padColor: 'Pad / hood colour',
    webType: 'Web type', webColor: 'Web colour', palm: 'Palm colour',
    lining: 'Lining', binding: 'Binding', welting: 'Welting', laces: 'Laces', belt: 'Belt',
    thumbLoops: 'Thumb loops', pinkyLoops: 'Pinky loops', stitching: 'Stitching',
    ringEmb: 'SSK logo on ring finger', bullet: 'Bullet logo (wrist)',
    thumbText: 'Thumb embroidery', thumbFont: 'Embroidery font', thumbMain: 'Main thread',
    thumbOutline: 'Outline / shadow thread', thumbNumber: 'Number or initials on the thumb',
    circle: 'Circle colour', numberColor: 'Number thread',
    flag: 'Index finger flag',
    indexOnePiece: 'Back 3+4 — index finger, one piece',
    indexMerged: 'A flag is embroidered on one piece of leather, so the index finger takes a single colour.',
    circleHint: 'Two characters — a number or initials. Leave it empty and the circle gets the small SSK logo instead.',
    name: 'Your name', phone: 'Phone number',
    left: 'left', done: 'done', undo: 'Undo', redo: 'Redo', reset: 'Reset',
    compare: 'Compare', snapshot: 'Snapshot', clear: 'Clear', basePrice: 'From',
    finish: 'Review & send', reference: 'Reference', copy: 'Copy specification',
    copied: 'Copied', keep: 'Keep building', open: 'Open a saved design',
    paste: 'Paste a reference code', notShown: 'Not shown on this view',
    zoom: 'Zoom', recent: 'Recent', allPanels: 'All back panels',
    pickPart: 'Click any part of the glove', required: 'Still needed',
    sendTitle: 'Your SSK custom glove', sendLead: 'Send this reference to SSK Europe with your order — it holds every choice below.',
    optional: 'optional', chooseSize: 'Pick a size first', filtered: 'available for',
    colours: 'Colours', review: 'Review', details: 'Your details', name2: 'Name on the glove',
    stepOf: 'Step', ofN: 'of', nextStep: 'Next', backStep: 'Back',
    stock: 'Stock colourway', national: 'National team', signature: 'Signature build', blankTag: 'Start clean',
    pickStart: 'Pick a starting point. You can change every part after this.',
    pickColour: 'Pick a part on the glove, then pick its colour.',
    applyAll: 'Same colour on all back panels',
    sigSlot: 'Signature slot — attach a real SSK player',
    allSet: 'All set', sendIt: 'Send to SSK', model2: 'SSK Pro Custom'
  },
  nl: {
    builder: 'Handschoen samenstellen', model: 'SSK Pro Custom · achterzijde',
    start: 'Start', fit: 'Pasvorm', web: 'Web', back: 'Achterpanelen', leather: 'Leer & veters',
    logos: "Logo's", personal: 'Personalisatie', you: 'Jouw gegevens',
    hand: 'Hand', size: 'Maat', pad: 'Vingerpad / kap', padColor: 'Kleur pad / kap',
    webType: 'Type web', webColor: 'Kleur web', palm: 'Kleur palm',
    lining: 'Voering', binding: 'Bies', welting: 'Welting', laces: 'Veters', belt: 'Riem',
    thumbLoops: 'Duimlussen', pinkyLoops: 'Pinklussen', stitching: 'Stiksel',
    ringEmb: 'SSK logo op ringvinger', bullet: 'Bullet logo (pols)',
    thumbText: 'Borduring duim', thumbFont: 'Letterstijl', thumbMain: 'Hoofdgaren',
    thumbOutline: 'Contour / schaduwgaren', thumbNumber: 'Nummer of initialen op de duim',
    circle: 'Kleur cirkel', numberColor: 'Garen nummer',
    flag: 'Vlag op wijsvinger',
    indexOnePiece: 'Back 3+4 — wijsvinger, één stuk',
    indexMerged: 'Een vlag wordt op één stuk leer geborduurd, dus de wijsvinger krijgt één kleur.',
    circleHint: 'Twee tekens — een nummer of initialen. Laat je het leeg, dan komt het kleine SSK-logo in de cirkel.',
    name: 'Je naam', phone: 'Telefoonnummer',
    left: 'nog open', done: 'klaar', undo: 'Ongedaan', redo: 'Opnieuw', reset: 'Wissen',
    compare: 'Vergelijk', snapshot: 'Vastleggen', clear: 'Wissen', basePrice: 'Vanaf',
    finish: 'Controleren & versturen', reference: 'Referentie', copy: 'Kopieer specificatie',
    copied: 'Gekopieerd', keep: 'Verder bouwen', open: 'Bewaard ontwerp openen',
    paste: 'Plak een referentiecode', notShown: 'Niet zichtbaar op deze weergave',
    zoom: 'Zoom', recent: 'Recent', allPanels: 'Alle achterpanelen',
    pickPart: 'Klik een onderdeel van de handschoen', required: 'Nog nodig',
    sendTitle: 'Jouw SSK custom handschoen', sendLead: 'Stuur deze referentie mee met je bestelling bij SSK Europe — hij bevat elke keuze hieronder.',
    optional: 'optioneel', chooseSize: 'Kies eerst een maat', filtered: 'beschikbaar voor',
    colours: 'Kleuren', review: 'Controleren', details: 'Jouw gegevens', name2: 'Naam op de handschoen',
    stepOf: 'Stap', ofN: 'van', nextStep: 'Verder', backStep: 'Terug',
    stock: 'Standaard kleurstelling', national: 'Nationaal team', signature: 'Signature build', blankTag: 'Blanco beginnen',
    pickStart: 'Kies een startpunt. Daarna pas je elk onderdeel nog aan.',
    pickColour: 'Kies een onderdeel op de handschoen en daarna de kleur.',
    applyAll: 'Zelfde kleur op alle achterpanelen',
    sigSlot: 'Signature-plek — koppel een echte SSK-speler',
    allSet: 'Compleet', sendIt: 'Naar SSK sturen', model2: 'SSK Pro Custom'
  }
};
