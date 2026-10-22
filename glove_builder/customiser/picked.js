/* The blank glove is white because it has to be drawn in something, not
   because anyone chose white. On the blank starter a colour only counts as
   chosen once it is picked; every other starter is a chosen colourway. */
import { COLOUR_ORDER, PALETTE_OF } from './glove-catalog.js';

export const chosenColour = (S, f) =>
  (S.startId !== 'blank' || S.picked?.[f]) ? S.colors[f] : null;

export function markPicked(S, ...fields) {
  S.picked = { ...(S.picked || {}) };
  for (const f of fields) S.picked[f] = true;
}

// Parts cut from one piece of leather are picked together.
export function linkedFields(field, indexOne, middleOne) {
  if (indexOne && (field === 'back3' || field === 'back4')) return ['back3', 'back4'];
  if (middleOne && (field === 'back5' || field === 'back6')) return ['back5', 'back6'];
  if (field === 'palm' || field === 'back2') return ['palm', 'back2'];
  return [];
}

export const cleanPicked = p =>
  Object.fromEntries(COLOUR_ORDER.filter(f => p?.[f] === true).map(f => [f, true]));

// The opening glove: white wherever the palette has white.
export function whiteBlank(S, DATA) {
  for (const field of COLOUR_ORDER) {
    if (DATA.palettes[PALETTE_OF(field)].some(c => c[0] === '10')) S.colors[field] = '10';
  }
}