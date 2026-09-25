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

// `render` is the slug of a web cut from a photograph (make_web.py). Without
// one the glove keeps its own web, which is the H-Web the calibration glove
// was built with — so H-Web previews correctly and everything else previews
// as an H-Web until it is photographed. The web step says so.
export const NATIVE_WEB = 'H-Web';
export const WEBS = [
  { id: 'Spiral I-Web', img: F + 'webs/Spiral_I_Web.png', sizes: ['11.5"', '11.75"'],
    render: 'spiral-i' },
  { id: 'Standard I-Web', img: F + 'webs/Standard_I_Web.jpg', sizes: ['11.5"', '11.75"'],
    render: 'standard-i' },
  { id: 'SMS-Web', img: F + 'webs/SMS_Web.jpg', sizes: ['11.75"'] },
  { id: 'SMK-Web', img: F + 'webs/SMK_Web.jpg', sizes: ['11.75"'],
    render: 'smk' },
  { id: 'H-Web', img: F + 'webs/H_Web.jpg', sizes: ['11.75"', '12"', '12.25"', '12.5"', '12.75"'] },
  { id: 'SMLEE-Web', img: F + 'webs/SMLEE_Web.jpg', sizes: ['11.75"'],
    render: 'smlee' },
  { id: 'Modified Trapeze-Web', img: F + 'webs/Modified_Trapeze_Web.jpg', sizes: ['12"'],
    render: 'modified-trapeze' },
  { id: 'Basket-Web', img: F + 'webs/Basket_Web.jpg', sizes: ['12"', '12.25"'] },
  { id: 'Em Rocket-Web', img: F + 'webs/Em_Rocket_Web.jpg', sizes: ['12"'],
    render: 'em-rocket' },
  { id: 'Sasaki 1-Web', img: F + 'webs/Sasaki_1_Web.jpg', sizes: ['12"'] },
  { id: 'Sasaki 2-Web', img: F + 'webs/Sasaki_2_Web.jpg', sizes: ['12"', '12.25"'] },
  { id: 'Closed Diamond Net-Web', img: F + 'webs/Closed_Diamond_Net_Web.jpg', sizes: ['12.25"'],
    render: 'closed-diamond-net' },
  { id: 'Trapeze-Web', img: F + 'webs/Trapeze_Web.jpg', sizes: ['12.75"'],
    render: 'trapeze' }
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
  back8: 'Preview merges Back 7 + 8 into one panel',
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
/* Badges seen on gloves at the store (23 Sep 2026) but in neither SSK
   Europe's order form nor the 2026 Japan logo list (catalogue p.29). They are
   shown so the picker matches the shelf, and they cannot be ordered until Pim
   confirms SSK will make them. Kept here, not in the generated asset data, so
   the rule lives with the rest of the catalogue. */
export const UNCONFIRMED_BULLETS = ['White/Gold', 'Red/Gold'];

export const COLOUR_ORDER = ['web', 'back1', 'back2', 'back3', 'back4', 'back5', 'back6',
  'back7', 'back8', 'back9', 'palm', 'belt', 'lining', 'binding', 'welting', 'laces',
  'thumb_loops', 'pinky_loops', 'stitching', 'ring_emb', 'pad_color'];

export const T = {
  en: {
    builder: 'Custom glove builder', model: 'SSK Pro Custom',
    start: 'Start', fit: 'Fit', web: 'Web', back: 'Back panels', leather: 'Leather & lacing',
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
    flag: 'Index finger flag',
    indexOnePiece: 'Back 3+4 — index finger, one piece',
    indexMerged: 'A flag is embroidered on one piece of leather, so the index finger takes a single colour.',
    circleHint: 'Two characters — a number or initials. Leave it empty and the circle gets the small SSK logo instead.',
    name: 'Your name', phone: 'Phone number',
    left: 'left', done: 'done', undo: 'Undo', redo: 'Redo', reset: 'Reset',
    compare: 'Compare', snapshot: 'Snapshot', clear: 'Clear', basePrice: 'From',
    finish: 'Review & order', reference: 'Design code', copy: 'Copy specification',
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
    sendTitle: 'Your SSK custom glove', sendLead: 'Send the order and SSK Europe receives every choice with the design code; you then pay in their shop with the order number you get back. The design code saves your options; the design link also keeps embroidery text and numbers.',
    viewBack: 'Back', viewPalm: 'Palm', viewThumb: 'Thumb side', viewPinky: 'Pinky side',
    webNotOnThumb: 'This side was photographed with the standard H-Web. The hatched part is that web, not yours; your web is ordered as chosen.',
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
    allSet: 'All set', sendIt: 'Review & order', model2: 'SSK Pro Custom',
    // ordering: the order goes to SSK Europe by e-mail, the payment through
    // their shop with the order number the customer gets back
    email: 'E-mail address', emailHint: 'Your order number and a copy of the order go here.',
    inOrder: 'Gloves in this order', gloveN: 'Glove', onStage: 'on the stage',
    addGlove: 'Add another glove', editGlove: 'Edit', removeGlove: 'Remove',
    completeFirst: 'Finish the required choices for this glove first.',
    sendOrder: 'Send order to SSK Europe', sending: 'Sending…',
    sendHint: 'One e-mail goes to SSK Europe with every choice, the design code and a picture of each glove; you get a copy with your order number. Nothing is stored on this page.',
    sendFail: 'Sending failed. Check your connection and try again.',
    sendBusy: 'Too many orders from this connection in a short time. Wait a minute and try again.',
    sendNotConfigured: 'Ordering by e-mail is not switched on yet. Copy the specification and send it to SSK Europe yourself.',
    sendDone: 'Your order has reached SSK Europe', orderNumber: 'Order number',
    oneGloveSent: 'One glove, with its design code, is in SSK Europe\'s inbox.',
    nGlovesSent: '%n gloves, each with its own design code, are in SSK Europe\'s inbox.',
    payNow: 'Now pay in the SSK Europe shop',
    payStep1: 'Open the SSK Europe shop and choose the custom glove.',
    payStep2: 'Set the quantity to %n.',
    payStep3: 'Enter order number %s in the configurator field.',
    payStep4: 'Pay as usual. SSK Europe matches the payment to your design.',
    payNote: 'The order goes to SSK only after payment. You also have these steps in your e-mail.',
    goCheckout: 'Go to the SSK Europe shop', copyNumber: 'Copy order number'
  },
  nl: {
    builder: 'Handschoen samenstellen', model: 'SSK Pro Custom',
    start: 'Start', fit: 'Pasvorm', web: 'Web', back: 'Achterpanelen', leather: 'Leer & veters',
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
    flag: 'Vlag op wijsvinger',
    indexOnePiece: 'Back 3+4 — wijsvinger, één stuk',
    indexMerged: 'Een vlag wordt op één stuk leer geborduurd, dus de wijsvinger krijgt één kleur.',
    circleHint: 'Twee tekens — een nummer of initialen. Laat je het leeg, dan komt het kleine SSK-logo in de cirkel.',
    name: 'Je naam', phone: 'Telefoonnummer',
    left: 'nog open', done: 'klaar', undo: 'Ongedaan', redo: 'Opnieuw', reset: 'Wissen',
    compare: 'Vergelijk', snapshot: 'Vastleggen', clear: 'Wissen', basePrice: 'Vanaf',
    finish: 'Controleren & bestellen', reference: 'Ontwerpcode', copy: 'Kopieer specificatie',
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
    sendTitle: 'Jouw SSK custom handschoen', sendLead: 'Verstuur de bestelling en SSK Europe ontvangt elke keuze met de ontwerpcode; daarna betaal je in hun shop met het bestelnummer dat je terugkrijgt. De ontwerpcode bewaart je keuzes; de ontwerplink bewaart ook borduurtekst en nummers.',
    viewBack: 'Achterkant', viewPalm: 'Palm', viewThumb: 'Duimzijde', viewPinky: 'Pinkzijde',
    webNotOnThumb: 'Deze kant is gefotografeerd met het standaard H-web. Het gearceerde deel is dat web, niet het jouwe; je web wordt besteld zoals gekozen.',
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
    allSet: 'Compleet', sendIt: 'Controleren & bestellen', model2: 'SSK Pro Custom',
    email: 'E-mailadres', emailHint: 'Hier komen je bestelnummer en een kopie van de bestelling.',
    inOrder: 'Handschoenen in deze bestelling', gloveN: 'Handschoen', onStage: 'op het podium',
    addGlove: 'Nog een handschoen toevoegen', editGlove: 'Bewerken', removeGlove: 'Verwijderen',
    completeFirst: 'Maak eerst de verplichte keuzes voor deze handschoen af.',
    sendOrder: 'Bestelling naar SSK Europe sturen', sending: 'Versturen…',
    sendHint: 'Er gaat één e-mail naar SSK Europe met elke keuze, de ontwerpcode en een foto van elke handschoen; jij krijgt een kopie met je bestelnummer. Er wordt niets op deze pagina bewaard.',
    sendFail: 'Versturen is mislukt. Controleer je verbinding en probeer het opnieuw.',
    sendBusy: 'Te veel bestellingen vanaf deze verbinding in korte tijd. Wacht een minuut en probeer opnieuw.',
    sendNotConfigured: 'Bestellen per e-mail staat nog niet aan. Kopieer de specificatie en stuur die zelf naar SSK Europe.',
    sendDone: 'Je bestelling is bij SSK Europe', orderNumber: 'Bestelnummer',
    oneGloveSent: 'Eén handschoen, met ontwerpcode, ligt in de inbox van SSK Europe.',
    nGlovesSent: '%n handschoenen, elk met een eigen ontwerpcode, liggen in de inbox van SSK Europe.',
    payNow: 'Nu betalen in de SSK Europe shop',
    payStep1: 'Open de SSK Europe shop en kies de custom handschoen.',
    payStep2: 'Zet het aantal op %n.',
    payStep3: 'Vul bestelnummer %s in het veld voor de configurator in.',
    payStep4: 'Reken af zoals je gewend bent. SSK Europe koppelt de betaling aan je ontwerp.',
    payNote: 'De bestelling gaat pas na betaling naar SSK. Deze stappen staan ook in je e-mail.',
    goCheckout: 'Naar de SSK Europe shop', copyNumber: 'Kopieer bestelnummer'
  }
};
