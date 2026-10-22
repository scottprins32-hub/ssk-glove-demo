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

// The nine orderable webs. `render` is the slug of a back-view web insert in
// glove-data.json; H-Web is the photographed calibration glove itself. Which
// sides of the glove can actually show a web is decided in app.js
// (viewAvailability): a side without a picture of the chosen web shows an
// explicit notice, never an H-Web standing in for it.
// SMS, Basket, Sasaki 1 and Sasaki 2 are on SSK's form but are not offered
// here (Scott, 30 Sep 2026): there is no source to draw them from. See
// WEB_REFERENCES.
export const NATIVE_WEB = 'H-Web';
export const WEBS = [
  { id: 'Spiral I-Web', img: F + 'webs/Spiral_I_Web.png', sizes: ['11.5"', '11.75"'],
    render: 'spiral-i' },
  { id: 'Standard I-Web', img: F + 'webs/Standard_I_Web.jpg', sizes: ['11.5"', '11.75"'],
    render: 'standard-i' },
  { id: 'SMK-Web', img: F + 'webs/SMK_Web.jpg', sizes: ['11.75"'],
    render: 'smk' },
  { id: 'H-Web', img: F + 'webs/H_Web.jpg', sizes: ['11.75"', '12"', '12.25"', '12.5"', '12.75"'] },
  { id: 'SMLEE-Web', img: F + 'webs/SMLEE_Web.jpg', sizes: ['11.75"'],
    render: 'smlee' },
  { id: 'Modified Trapeze-Web', img: F + 'webs/Modified_Trapeze_Web.jpg', sizes: ['12"'],
    render: 'modified-trapeze' },
  { id: 'Em Rocket-Web', img: F + 'webs/Em_Rocket_Web.jpg', sizes: ['12"'],
    render: 'em-rocket' },
  { id: 'Closed Diamond Net-Web', img: F + 'webs/Closed_Diamond_Net_Web.jpg', sizes: ['12.25"'],
    render: 'closed-diamond-net' },
  { id: 'Trapeze-Web', img: F + 'webs/Trapeze_Web.jpg', sizes: ['12.75"'],
    render: 'trapeze' }
];

// Webs on SSK's form that cannot be ordered or drawn here yet. Shown as
// pictures only (SSK's own form photographs), never as choices. Basket is
// left out entirely until a source photograph arrives.
export const WEB_REFERENCES = [
  { id: 'SMS-Web', img: F + 'webs/SMS_Web.jpg' },
  { id: 'Sasaki 1-Web', img: F + 'webs/Sasaki_1_Web.jpg' },
  { id: 'Sasaki 2-Web', img: F + 'webs/Sasaki_2_Web.jpg' }
];
// Form webs a saved design may still carry from before they were withdrawn.
export const WITHDRAWN_WEBS = ['SMS-Web', 'Basket-Web', 'Sasaki 1-Web', 'Sasaki 2-Web'];

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
  ['Red', '#C8102E'], ['Blue', '#2145D6'], ['White', '#F2F0EA'],
  ['Gold', '#C9A227'], ['Silver', '#C5C8CC'], ['Green', '#17633A'],
  ['Purple', '#603487'], ['Orange', '#ED722A'], ['Pink', '#E79DB9'],
  ['Grey', '#85858A'], ['Maroon', '#6B2639']
];

// Which palette a colour field is picked from. Binding, welting and laces are
// lace stock, stitching is thread, the ring embroidery is its own list, and
// everything else is leather. Lives here rather than in app.js because it is
// catalogue knowledge: render_check.mjs uses it to prove that no starter
// offers a colour the customer cannot actually order.
export const PALETTE_OF = f =>
  f === 'stitching' ? 'stitching' :
  f === 'ring_emb' ? 'embroidery' :
  (f === 'binding' || f === 'welting' || f === 'laces') ? 'lace' : 'leather';

// Fields the order form asks for that the back-view render cannot show.
export const OFFSTAGE = {
  back1: 'Wingtip — hidden behind the thumb on this view',
  back9: 'Wingtip — hidden behind the pinky on this view',
  // What this view showed as thumb loops turned out to be the knotted lace,
  // mis-cut by the segmentation. The loops themselves are on the palm side.
  thumb_loops: 'Palm side — not visible on this view',
  pad_color: 'Only visible with a pad or hood fitted'
};

// Blank first: a visitor starts from a clean glove and builds it up, rather
// than being handed someone else's colourway to undo. Then signature,
// national, and the ones SSK has built. app.js applies STARTERS[0] on load,
// so this is the default.
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
  // Read off SSK's own Japan build: dark navy croc shell, red thumb, belt and
  // wingtips, yellow-tan lacing and stitching throughout, gold SSK mark,
  // Black/Gold bullet. Croc embossing is a leather finish the back view has no
  // layer for, so the colours carry it.
  { id: 'jp', en: 'Japan', nl: 'Japan', group: 'national', bullet: 7,
    flag: 'Japan',
    // Navy palm is visible on the navy/red, yellow-laced glove in shoot frame DSC05725.
    colors: { _panels: '71', palm: '71', back1: '32', back2: '32', web: '71', belt: '32',
              welting: '45', laces: '45', binding: '45', lining: '71',
              thumb_loops: '45', pinky_loops: '45', embroidery: '39',
              stitching: '45' } },
  { id: 'cw', en: 'Curaçao', nl: 'Curaçao', group: 'national', bullet: 13,
    flag: 'Curaçao',
    colors: { _panels: '60', welting: '45', laces: '45', binding: '45', lining: '60',
              thumb_loops: '45', pinky_loops: '45', embroidery: '10', stitching: '45' } },
  // Four colourways SSK has actually built, off the photographs in their
  // Drive folder; the colours themselves live in DATA.presets, written by
  // build_assets.py. The bullet is the badge the photograph shows: gold on
  // the navy glove, silver on the other three.
  { id: 'Navy / Columbia', en: 'Navy / Columbia', nl: 'Navy / Columbia', group: 'built', bullet: 14 },
  { id: 'Pink / White', en: 'Pink / White', nl: 'Roze / Wit', group: 'built', bullet: 10 },
  { id: 'Black / Grey', en: 'Black / Grey', nl: 'Zwart / Grijs', group: 'built', bullet: 10 },
  { id: 'Salmon / Mint', en: 'Salmon / Mint', nl: 'Zalm / Mint', group: 'built', bullet: 10 }
];

// The flat build order. One step, one decision — no category inside a category.
// Colours are all handled in a single step by picking the part on the glove.
/* Scott confirmed these are not builder options. Keep their historical data
   indices for saved-code compatibility, but hide their cards and reject orders. */
export const UNCONFIRMED_BULLETS = ['White/Gold', 'Red/Gold'];

export const COLOUR_ORDER = ['web', 'back1', 'back2', 'back3', 'back4', 'back5', 'back6',
  'back7', 'back8', 'back9', 'palm', 'belt', 'lining', 'binding', 'welting', 'laces',
  'thumb_loops', 'pinky_loops', 'stitching', 'ring_emb', 'pad_color'];

export const T = {
  en: {
    builder: 'Custom glove builder', model: 'SSK Pro Custom',
    skipToChoices: 'Skip to the choices', turnHint: 'Drag to turn',
    backFinish: 'Back panels, Back 1 to 9', backFinishStdSub: 'Smooth leather', backFinishCrocSub: 'All nine together, no surcharge',
    stillToChoose: '%n to choose', nextChoice: 'Next: %s', allChosen: 'Everything chosen',
    coach: { turn: 'Drag the glove, or swipe, to see every side.', pick: 'Click any part of the glove to colour it. Hover shows its name.', compare: 'Overzicht keeps a version, so you can compare and go back.' }, gotIt: 'Got it',
    hold: 'Hold colour', holding: 'Painting with', release: 'Release', searchColour: 'Find a colour: name or number', noColour: 'No colour matches.',
    studio: 'Dark studio', studioOff: 'Light studio', codeCopied: 'Copied',
    now: 'Now', kept: 'Kept', keepVersion: 'Keep this version', restoreKept: 'Back to the kept version', compareOn: 'Compare', clearKept: 'Clear',
    keptAt: 'Kept at %s', resumed: 'Your design is back', startOver: 'Start over',
    shareCard: 'Share the card', downloadCard: 'Download card',
    heroKick: 'SSK Pro Custom · made to order',
    heroLine: 'Build your glove the way SSK builds it: leather, web, lacing, logos, name.',
    heroStart: 'Start designing', heroFrom: 'from', heroParts: 'parts to colour', heroViews: 'sides to turn',
    starters: 'Or start from a glove', inUse: 'On this glove', family: { neutral: 'Neutrals', warm: 'Reds & oranges', earth: 'Tans & browns', green: 'Greens', blue: 'Blues', purple: 'Pink & purple', metal: 'Metallic' },
    groupBack: 'Back of the hand', groupPalm: 'Palm side', groupTrim: 'Lacing & finish',
    stitchContrast: 'The stitching is the same colour as the leather around it, so it will barely show. Pick a contrasting thread if you want visible stitches.',
    tiedPalm: 'One leather with the palm', missingTitle: 'Still to choose', goFix: 'Choose',
    limitsSummary: 'What the picture cannot show', savedNow: 'Saved', fourSides: 'Your glove from four sides',
    turnedTo: 'Turned to %s', partDesc: {
      web: 'The net between thumb and index finger where the ball lands.',
      palm: 'The catching face inside the glove. Back 2 is cut from the same leather.',
      back1: 'The outer tip of the thumb, back side.', back2: 'The rest of the thumb on the back; same leather as the palm.',
      back3: 'Index finger, first part from the web.', back4: 'Index finger, second part, next to the middle finger.',
      back5: 'Middle finger, first part.', back6: 'Middle finger, second part.', back7: 'The whole ring finger.',
      back8: 'The rest of the pinky.', back9: 'The outer tip of the pinky.',
      belt: 'The wrist strap that carries the bullet logo.', lining: 'The inside of the wrist opening.',
      binding: 'The leather edge around the wrist and finger openings.', welting: 'The rolled edge between the fingers that gives them their shape.',
      laces: 'The lace leather through the web, fingers and wrist.', thumb_loops: 'The lace loops on the thumb side of the palm.',
      pinky_loops: 'The lace loops on the pinky side.', stitching: 'The thread of every seam.',
      ring_emb: 'The embroidered SSK logo on the ring finger.', pad_color: 'The finger pad or hood on the index finger.'
    },
    start: 'Start', fit: 'Hand, size & finger protection', web: 'Web', back: 'Back panels', leather: 'Leather & lacing',
    logos: 'Logos', personal: 'Personalisation', you: 'Your details',
    hand: 'Hand', size: 'Glove size', pad: 'Finger pad / hood', padColor: 'Pad / hood colour',
    webType: 'Web type', webColor: 'Web colour', palm: 'Palm colour',
    lining: 'Lining', binding: 'Binding', welting: 'Welting', laces: 'Laces', belt: 'Belt',
    thumbLoops: 'Thumb loops', pinkyLoops: 'Pinky loops', stitching: 'Stitching',
    ringEmb: 'SSK logo on ring finger', bullet: 'Bullet logo (wrist)',
    thumbText: 'Thumb embroidery', thumbFont: 'Embroidery font', thumbMain: 'Main thread',
    pinkyText: 'Pinky embroidery',
    pinkyHint: 'Embroidered in the same font and thread as the thumb.',
    thumbOutline: 'Outline / shadow thread', thumbNumber: 'Number or initials on the thumb',
    circle: 'Circle colour', numberColor: 'Number thread',
    flag: 'Flag',
    flagPosition: 'Flag placement', indexFinger: 'Index finger', middleFinger: 'Middle finger',
    middleOnePiece: 'Back 5+6 — middle finger, one piece',
    middleMerged: 'The flag is embroidered on one piece of leather, so the middle finger takes a single colour.',
    pricing: 'Price', baseGlove: 'Custom glove', flagExtra: 'Flag surcharge (1 flag)', totalPrice: 'Total',
    flagPriceNote: '+%s per flag, included in the total.',
    indexOnePiece: 'Back 3+4 — index finger, one piece',
    indexMerged: 'A flag is embroidered on one piece of leather, so the index finger takes a single colour.',
    circleHint: 'Two characters — a number or initials. Leave it empty and the circle gets the small SSK logo instead.',
    name: 'Your name', phone: 'Phone number',
    left: 'left', done: 'done', undo: 'Undo', redo: 'Redo', reset: 'Reset',
    compare: 'Compare', snapshot: 'Snapshot', clear: 'Clear', basePrice: 'From',
    finish: 'Download or share', reference: 'Design code', copy: 'Copy specification',
    copyLink: 'Copy link',
    copied: 'Copied', keep: 'Keep building', open: 'Open a saved design',
    paste: 'Paste a design link or reference code', notShown: 'Not shown on this view',
    askPim: 'Ask SSK Europe — not yet confirmed',
    codeBad: 'That is not a reference code, or it has a typo.',
    codeNoText: 'Reference codes carry no names or numbers. Add the thumb and pinky embroidery and the thumb number again, or confirm there are none.',
    personalOk: 'Personalisation is correct',
    personalCheck: 'Personalisation checked',
    codeAmbiguous: 'This older code can be read two ways, so it cannot be opened safely. Ask SSK Europe for the order.',
    zoom: 'Zoom', recent: 'Recent', allPanels: 'All back panels',
    pickPart: 'Click any part of the glove', required: 'Still needed',
    sendTitle: 'Your SSK custom glove', sendLead: 'Share the full specification with SSK Europe to confirm availability and your order. The design code saves your options; the design link also keeps embroidery text and numbers. Saving does not place an order.',
    viewBack: 'Back', viewPalm: 'Palm', viewThumb: 'Thumb side', viewPinky: 'Pinky side',
    webNotOnThumb: 'This side was photographed with the standard H-Web. The hatched part is that web, not yours; your web is ordered as chosen.',
    thumbEstimated: 'Estimated view: this side is a generated render, not a photograph of an SSK glove. Your web and colours are ordered as chosen.',
    notOnThisSide: 'Not visible from this side.',
    optional: 'optional', chooseSize: 'Pick a size first', filtered: 'available for',
    webNotDrawn: 'This web is ordered exactly as chosen. The picture still shows the standard web.',
    webNotOnPalm: 'Your web is ordered as chosen, but the palm view shows the standard web. Switch to the back view to see it.',
    tiedTo: '(one piece with %s)',
    colours: 'Colours', review: 'Review', details: 'Your details', name2: 'Name on the glove',
    stepOf: 'Step', ofN: 'of', nextStep: 'Next', backStep: 'Back',
    built: 'Built by SSK', national: 'Country colours', signature: 'Colour inspiration', blankTag: 'Start clean',
    pickStart: 'Pick a starting point. You can change every part after this.',
    pickColour: 'Pick a part on the glove, then pick its colour.',
    // SSK has no hex values for these colours -- the number is the colour, and
    // the same number comes out a little different in each leather. The swatch
    // is a picture of it; the code is what gets ordered.
    swatchNote: 'SSK has no colour codes beyond these numbers, and the same '
      + 'number comes out slightly different in each leather. The swatch is an '
      + 'indication \u2014 the number beside it is what gets ordered.',
    applyAll: 'Same colour on all back panels',
    designLink: 'Design link', legacyNotice: 'Back-view colours restored. Other colours, fit and personalisation are unchanged; review them before saving.',
    share: 'Share design', download: 'Download specification',
    draftNotice: 'Draft: required choices are still missing. You can save and continue later.',
    readyNotice: 'Required choices completed. SSK Europe still needs to confirm the order.',
    invalidDesign: 'This design link or colour code could not be opened.', copyFailed: 'Copy failed. Try download.',
    loadError: 'The glove could not be loaded', loadRetry: 'Check your connection and reload this page.',
    sigSlot: 'Signature slot — attach a real SSK player',
    flagOther: 'Which flag exactly? (country or region)',
    flagOtherNeeded: 'Name the flag. An unnamed flag cannot be made.',
    flagPending: 'Not in the preview or the standard list: SSK Europe must confirm this flag is available. Pending until confirmed.',
    limitsTitle: 'Preview limitations',
    limView: 'Picture: %s view.',
    limWeb: 'Web ordered: %s. This picture shows the standard H-Web in its place.',
    limWebRef: 'Selected web reference (SSK order form picture)',
    webRefTitle: 'Other SSK webs: pictures only',
    webRefNote: 'Not available to order or preview here yet, so these cannot be selected.',
    webRefBadge: 'Picture only: no preview yet',
    webWithdrawn: 'Your saved design used the %s, which cannot be ordered here. Choose one of the available webs; the rest of your design is kept.',
    limPersonal: 'Name embroidery follows the specification. The circle preview is indicative and is shown on the traced thumb view.',
    limOtherFlag: 'Other flag (%s) is not drawn on the picture.',
    limSize: 'Size %s is ordered as chosen; the picture is one representative glove size.',
    limBack8: 'Back 7 and Back 8 are separate colours; the Back and Pinky side views show them apart.',
    phoneBad: 'Enter a phone number with digits, e.g. +31 6 12345678 or 020 123 4567 ext. 12.',
    contactReady: 'Contact details complete.',
    contactMissing: 'Contact details not complete yet. Only needed when you send the design to SSK Europe; saving and sharing work without them, and the design link never contains them.',
    previewSmaller: 'Smaller preview', previewLarger: 'Larger preview',
    allSet: 'All set', sendIt: 'Download or share', model2: 'SSK Pro Custom',
    summary: 'Summary', summaryTitle: 'Your choices',
    downloadImage: 'Download image', myDesigns: 'My designs',
    saveToGallery: 'Save to my designs', saveToGalleryBtn: 'Save on this device',
    galleryNamePh: 'Name this design', untitledDesign: 'Untitled design',
    gallerySaved: 'Saved to your designs.', gallerySaveFail: 'Could not save on this device. Browser storage may be full or blocked. Download or share your design to keep it.',
    galleryTitle: 'My saved designs',
    galleryEmpty: 'No saved designs yet. Build a glove and save it to see it here.',
    backToBuilder: 'Back to builder', openDesign: 'Open', deleteDesign: 'Delete',
    confirmDelete: 'Delete this design?', savedOn: 'Saved on %s'
  },
  nl: {
    builder: 'Handschoen samenstellen', model: 'SSK Pro Custom',
    skipToChoices: 'Naar de keuzes', turnHint: 'Sleep om te draaien',
    backFinish: 'Rugpanelen, Back 1 t/m 9', backFinishStdSub: 'Glad leer', backFinishCrocSub: 'Alle negen tegelijk, zonder meerprijs',
    stillToChoose: 'Nog %n te kiezen', nextChoice: 'Nog %n: %s', allChosen: 'Alles gekozen',
    coach: { turn: 'Sleep de handschoen, of veeg, om elke kant te zien.', pick: 'Klik een onderdeel van de handschoen om het te kleuren. Zweven toont de naam.', compare: 'Via Overzicht leg je een versie vast, om te vergelijken en terug te gaan.' }, gotIt: 'Begrepen',
    hold: 'Kleur vasthouden', holding: 'Verven met', release: 'Loslaten', searchColour: 'Zoek een kleur: naam of nummer', noColour: 'Geen kleur gevonden.',
    studio: 'Donkere studio', studioOff: 'Lichte studio', codeCopied: 'Gekopieerd',
    now: 'Nu', kept: 'Vastgelegd', keepVersion: 'Deze versie vastleggen', restoreKept: 'Terug naar vastgelegd', compareOn: 'Vergelijk', clearKept: 'Wissen',
    keptAt: 'Vastgelegd om %s', resumed: 'Je ontwerp is hervat', startOver: 'Opnieuw beginnen',
    shareCard: 'Deel de kaart', downloadCard: 'Kaart downloaden',
    heroKick: 'SSK Pro Custom · op bestelling gemaakt',
    heroLine: 'Bouw je handschoen zoals SSK hem bouwt: leer, web, veters, logo\'s, naam.',
    heroStart: 'Begin met ontwerpen', heroFrom: 'vanaf', heroParts: 'onderdelen in kleur', heroViews: 'kanten om te draaien',
    starters: 'Of begin vanuit een handschoen', inUse: 'Op deze handschoen', family: { neutral: 'Neutraal', warm: 'Rood & oranje', earth: 'Tan & bruin', green: 'Groen', blue: 'Blauw', purple: 'Roze & paars', metal: 'Metallic' },
    groupBack: 'Rug van de hand', groupPalm: 'Palmzijde', groupTrim: 'Veters & afwerking',
    stitchContrast: 'Het stiksel heeft dezelfde kleur als het leer eromheen en valt dus nauwelijks op. Kies een contrasterend garen als je de stiksels wilt zien.',
    tiedPalm: 'Eén leer met de palm', missingTitle: 'Nog te kiezen', goFix: 'Kies',
    limitsSummary: 'Wat de afbeelding niet laat zien', savedNow: 'Bewaard', fourSides: 'Je handschoen van vier kanten',
    turnedTo: 'Gedraaid naar %s', partDesc: {
      web: 'Het net tussen duim en wijsvinger waarin de bal landt.',
      palm: 'Het vangvlak aan de binnenkant. Back 2 wordt uit hetzelfde leer gesneden.',
      back1: 'De buitenste punt van de duim, aan de rugzijde.', back2: 'De rest van de duim op de rug; hetzelfde leer als de palm.',
      back3: 'Wijsvinger, eerste deel vanaf het web.', back4: 'Wijsvinger, tweede deel, naast de middelvinger.',
      back5: 'Middelvinger, eerste deel.', back6: 'Middelvinger, tweede deel.', back7: 'De hele ringvinger.',
      back8: 'De rest van de pink.', back9: 'De buitenste punt van de pink.',
      belt: 'De polsband met het bullet-logo.', lining: 'De binnenkant van de polsopening.',
      binding: 'Het leren randje langs de pols- en vingeropeningen.', welting: 'De rolrand tussen de vingers die ze hun vorm geeft.',
      laces: 'Het veterleer door web, vingers en pols.', thumb_loops: 'De veterlussen aan de duimzijde van de palm.',
      pinky_loops: 'De veterlussen aan de pinkzijde.', stitching: 'Het garen van alle naden.',
      ring_emb: 'Het geborduurde SSK-logo op de ringvinger.', pad_color: 'Het vingerpad of de kap op de wijsvinger.'
    },
    start: 'Start', fit: 'Hand, maat & vingerbescherming', web: 'Web', back: 'Achterpanelen', leather: 'Leer & veters',
    logos: "Logo's", personal: 'Personalisatie', you: 'Jouw gegevens',
    hand: 'Hand', size: 'Maat', pad: 'Vingerpad / kap', padColor: 'Kleur pad / kap',
    webType: 'Type web', webColor: 'Kleur web', palm: 'Kleur palm',
    lining: 'Voering', binding: 'Bies', welting: 'Welting', laces: 'Veters', belt: 'Riem',
    thumbLoops: 'Duimlussen', pinkyLoops: 'Pinklussen', stitching: 'Stiksel',
    ringEmb: 'SSK logo op ringvinger', bullet: 'Bullet logo (pols)',
    thumbText: 'Borduring duim', thumbFont: 'Letterstijl', thumbMain: 'Hoofdgaren',
    pinkyText: 'Borduring pink',
    pinkyHint: 'Wordt geborduurd in dezelfde letterstijl en garen als de duim.',
    thumbOutline: 'Contour / schaduwgaren', thumbNumber: 'Nummer of initialen op de duim',
    circle: 'Kleur cirkel', numberColor: 'Garen nummer',
    flag: 'Vlag',
    flagPosition: 'Plaats van de vlag', indexFinger: 'Wijsvinger', middleFinger: 'Middelvinger',
    middleOnePiece: 'Back 5+6 — middelvinger, één stuk',
    middleMerged: 'De vlag wordt op één stuk leer geborduurd, dus de middelvinger krijgt één kleur.',
    pricing: 'Prijs', baseGlove: 'Custom handschoen', flagExtra: 'Vlagtoeslag (1 vlag)', totalPrice: 'Totaal',
    flagPriceNote: '+%s per vlag, inbegrepen in het totaal.',
    indexOnePiece: 'Back 3+4 — wijsvinger, één stuk',
    indexMerged: 'Een vlag wordt op één stuk leer geborduurd, dus de wijsvinger krijgt één kleur.',
    circleHint: 'Twee tekens — een nummer of initialen. Laat je het leeg, dan komt het kleine SSK-logo in de cirkel.',
    name: 'Je naam', phone: 'Telefoonnummer',
    left: 'nog open', done: 'klaar', undo: 'Ongedaan', redo: 'Opnieuw', reset: 'Wissen',
    compare: 'Vergelijk', snapshot: 'Vastleggen', clear: 'Wissen', basePrice: 'Vanaf',
    finish: 'Downloaden of delen', reference: 'Ontwerpcode', copy: 'Kopieer specificatie',
    copied: 'Gekopieerd', keep: 'Verder bouwen', open: 'Bewaard ontwerp openen',
    copyLink: 'Kopieer link',
    paste: 'Plak een ontwerplink of referentiecode', notShown: 'Niet zichtbaar op deze weergave',
    askPim: 'Vraag SSK Europe — nog niet bevestigd',
    codeBad: 'Dit is geen referentiecode, of er zit een typfout in.',
    codeNoText: 'Referentiecodes bevatten geen namen of nummers. Vul het borduurwerk op duim en pink en het duimnummer opnieuw in, of bevestig dat er geen is.',
    personalOk: 'Personalisatie klopt',
    personalCheck: 'Personalisatie gecontroleerd',
    codeAmbiguous: 'Deze oudere code is op twee manieren te lezen en kan daarom niet veilig worden geopend. Vraag SSK Europe om de bestelling.',
    zoom: 'Zoom', recent: 'Recent', allPanels: 'Alle achterpanelen',
    pickPart: 'Klik een onderdeel van de handschoen', required: 'Nog nodig',
    sendTitle: 'Jouw SSK custom handschoen', sendLead: 'Deel de volledige specificatie met SSK Europe om beschikbaarheid en je bestelling te bevestigen. De ontwerpcode bewaart je keuzes; de ontwerplink bewaart ook borduurtekst en nummers. Opslaan plaatst geen bestelling.',
    viewBack: 'Achterkant', viewPalm: 'Palm', viewThumb: 'Duimzijde', viewPinky: 'Pinkzijde',
    webNotOnThumb: 'Deze kant is gefotografeerd met het standaard H-web. Het gearceerde deel is dat web, niet het jouwe; je web wordt besteld zoals gekozen.',
    thumbEstimated: 'Geschatte weergave: deze kant is een gegenereerde render, geen foto van een SSK-handschoen. Je web en kleuren worden besteld zoals gekozen.',
    notOnThisSide: 'Niet zichtbaar vanaf deze kant.',
    optional: 'optioneel', chooseSize: 'Kies eerst een maat', filtered: 'beschikbaar voor',
    webNotDrawn: 'Dit web wordt precies zo besteld. Op de afbeelding staat nog het standaardweb.',
    webNotOnPalm: 'Je web wordt besteld zoals gekozen, maar de binnenkant toont het standaardweb. Kijk op de buitenkant om het te zien.',
    tiedTo: '(één stuk met %s)',
    colours: 'Kleuren', review: 'Controleren', details: 'Jouw gegevens', name2: 'Naam op de handschoen',
    stepOf: 'Stap', ofN: 'van', nextStep: 'Verder', backStep: 'Terug',
    built: 'Door SSK gebouwd', national: 'Landenkleuren', signature: 'Kleurinspiratie', blankTag: 'Blanco beginnen',
    pickStart: 'Kies een startpunt. Daarna pas je elk onderdeel nog aan.',
    pickColour: 'Kies een onderdeel op de handschoen en daarna de kleur.',
    swatchNote: 'SSK heeft geen kleurcodes buiten deze nummers, en hetzelfde '
      + 'nummer valt in elk leer net iets anders uit. Het staaltje is een '
      + 'indicatie \u2014 het nummer ernaast is wat besteld wordt.',
    applyAll: 'Zelfde kleur op alle achterpanelen',
    designLink: 'Ontwerplink', legacyNotice: 'Kleuren van de rugweergave hersteld. Andere kleuren, pasvorm en personalisatie zijn ongewijzigd; controleer ze voor het opslaan.',
    share: 'Ontwerp delen', download: 'Specificatie downloaden',
    draftNotice: 'Concept: er ontbreken nog verplichte keuzes. Je kunt opslaan en later verdergaan.',
    readyNotice: 'Verplichte keuzes ingevuld. SSK Europe moet de bestelling nog bevestigen.',
    invalidDesign: 'Deze ontwerplink of kleurcode kon niet worden geopend.', copyFailed: 'Kopiëren mislukt. Download de specificatie.',
    loadError: 'De handschoen kon niet worden geladen', loadRetry: 'Controleer je verbinding en laad deze pagina opnieuw.',
    sigSlot: 'Signature-plek — koppel een echte SSK-speler',
    flagOther: 'Welke vlag precies? (land of regio)',
    flagOtherNeeded: 'Geef de naam van de vlag. Een vlag zonder naam kan niet gemaakt worden.',
    flagPending: 'Niet in de afbeelding of de standaardlijst: SSK Europe moet bevestigen dat deze vlag leverbaar is. In afwachting tot bevestiging.',
    limitsTitle: 'Beperkingen van de afbeelding',
    limView: 'Afbeelding: %s.',
    limWeb: 'Besteld web: %s. Deze afbeelding toont op die plek het standaard H-web.',
    limWebRef: 'Referentie gekozen web (afbeelding uit SSK-bestelformulier)',
    webRefTitle: 'Andere SSK-webs: alleen afbeelding',
    webRefNote: 'Nog niet te bestellen of te bekijken hier, dus niet te kiezen.',
    webRefBadge: 'Alleen afbeelding: nog geen voorbeeld',
    webWithdrawn: 'Je opgeslagen ontwerp had het %s, dat hier niet te bestellen is. Kies een van de beschikbare webs; de rest van je ontwerp blijft bewaard.',
    limPersonal: 'Naamborduring volgt de specificatie. De cirkelpreview is indicatief en staat op de getraceerde duimzijde.',
    limOtherFlag: 'Andere vlag (%s) is niet op de afbeelding getekend.',
    limSize: 'Maat %s wordt besteld zoals gekozen; de afbeelding toont één representatieve maat.',
    limBack8: 'Back 7 en Back 8 zijn aparte kleuren; de achterkant en pinkzijde tonen ze apart.',
    phoneBad: 'Vul een telefoonnummer met cijfers in, bijv. +31 6 12345678 of 020 123 4567 toestel 12.',
    contactReady: 'Contactgegevens compleet.',
    contactMissing: 'Contactgegevens nog niet compleet. Alleen nodig als je het ontwerp naar SSK Europe stuurt; opslaan en delen werken zonder, en de ontwerplink bevat ze nooit.',
    previewSmaller: 'Kleinere afbeelding', previewLarger: 'Grotere afbeelding',
    allSet: 'Compleet', sendIt: 'Downloaden of delen', model2: 'SSK Pro Custom',
    summary: 'Overzicht', summaryTitle: 'Jouw keuzes',
    downloadImage: 'Afbeelding downloaden', myDesigns: 'Mijn ontwerpen',
    saveToGallery: 'Opslaan in mijn ontwerpen', saveToGalleryBtn: 'Bewaren op dit apparaat',
    galleryNamePh: 'Geef dit ontwerp een naam', untitledDesign: 'Naamloos ontwerp',
    gallerySaved: 'Opgeslagen in je ontwerpen.', gallerySaveFail: 'Bewaren op dit apparaat is mislukt. Browseropslag kan vol of geblokkeerd zijn. Download of deel je ontwerp om het te bewaren.',
    galleryTitle: 'Mijn opgeslagen ontwerpen',
    galleryEmpty: 'Nog geen opgeslagen ontwerpen. Stel een handschoen samen en sla hem op om hem hier te zien.',
    backToBuilder: 'Terug naar de builder', openDesign: 'Openen', deleteDesign: 'Verwijderen',
    confirmDelete: 'Dit ontwerp verwijderen?', savedOn: 'Opgeslagen op %s'
  }
};