export const PRICE_CENTS = Object.freeze({base:37495,flag:500});
// Crocodile pattern is one choice for the whole back: Back 1 to 9 and the belt together,
// or none. Never the web, palm, lining, laces or loops.
export const MATERIAL_FIELDS = Object.freeze(['back1','back2','back3','back4','back5','back6','back7','back8','back9','belt']);
export const crocAll = materials => MATERIAL_FIELDS.some(k=>materials?.[k]==='snakeskin');
export const normaliseMaterials = materials => crocAll(materials) ? Object.fromEntries(MATERIAL_FIELDS.map(k=>[k,'snakeskin'])) : {};
export const quoteDesign = s => ({currency:'EUR',version:'ssk-2026-10',base:PRICE_CENTS.base,
  flag:s.flag&&s.flag!=='None'?PRICE_CENTS.flag:0,
  total:PRICE_CENTS.base+(s.flag&&s.flag!=='None'?PRICE_CENTS.flag:0)});
