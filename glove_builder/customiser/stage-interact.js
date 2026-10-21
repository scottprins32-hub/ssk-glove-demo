/* The glove as the control. Three things live here, all presentation:

   - hover: the part under the pointer gets an outline on a second canvas
     laid over the glove, and a label at the cursor that names it and its
     colour. The outline is read off the same ownership maps a click uses,
     so what lights up is what a click would change.
   - turn: dragging across the glove (or swiping on a phone, or the arrow
     keys with the glove focused) moves to the next side. The app decides
     which sides exist; this only reports the direction.
   - the flip between two sides, so a change of view reads as the glove
     turning rather than one picture replacing another.

   Nothing here touches the design state or the renderer's own caches. */

const MIRROR_ZONES = 24;   // outlines kept, across views and parts

export function initStage({ canvas, hover, label, stage, renderer, mirror, zoneOf, describe, onPick, onTurn }) {
  const hctx = hover.getContext('2d');
  const outlines = new Map();
  let hovered = null, pointer = null, drag = null, suppressClick = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = () => matchMedia('(pointer: coarse)').matches;

  /* ----------------------------------------------------------- outlines */
  // n → zone id, in canvas space, for the current renderer view.
  function owners() {
    const R = renderer(); if (!R) return null;
    const D = R.DATA, W = D.w, H = D.h, m = mirror();
    if (R.view === 'back') return { data: R.backOwners(m), stride: 1, fold: false, W, H, D };
    return { data: R.idData, stride: 4, fold: m, W, H, D };
  }
  function outlineFor(id) {
    const R = renderer(); if (!R) return null;
    const own = owners(); if (!own || !own.data) return null;
    const z = own.D.zones.find(z => z.id === id); if (!z) return null;
    const key = [R.view, id, mirror() ? 1 : 0, R.web || '', R.pad || '', R.flagSrc || '', R.materialSelectionKey || ''].join('|');
    let c = outlines.get(key);
    if (c) { outlines.delete(key); outlines.set(key, c); return c; }
    const { data, stride, fold, W, H } = own, n = z.n;
    const mask = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const sx = fold ? W - 1 - x : x;
        if (data[(row + sx) * stride] === n) mask[row + x] = 1;
      }
    }
    const img = hctx.createImageData(W, H), px = img.data;
    const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      if (mask[i]) {
        const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)
          || !at(x - 2, y) || !at(x + 2, y) || !at(x, y - 2) || !at(x, y + 2);
        if (edge) { px[o] = 255; px[o + 1] = 255; px[o + 2] = 255; px[o + 3] = 235; }
        else { px[o] = 255; px[o + 1] = 255; px[o + 2] = 255; px[o + 3] = 46; }
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) || at(x - 2, y) || at(x + 2, y) || at(x, y - 2) || at(x, y + 2)) {
        px[o] = 17; px[o + 1] = 17; px[o + 2] = 17; px[o + 3] = 150;
      }
    }
    c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').putImageData(img, 0, 0);
    outlines.set(key, c);
    if (outlines.size > MIRROR_ZONES) outlines.delete(outlines.keys().next().value);
    return c;
  }
  function showHover(id) {
    if (id === hovered) return;
    hovered = id;
    if (hover.width !== canvas.width || hover.height !== canvas.height) { hover.width = canvas.width; hover.height = canvas.height; }
    hctx.clearRect(0, 0, hover.width, hover.height);
    if (!id) { label.hidden = true; return; }
    const c = outlineFor(id);
    if (c) hctx.drawImage(c, 0, 0);
    const d = describe(id);
    if (!d) { label.hidden = true; return; }
    label.innerHTML = '';
    label.append(document.createTextNode(d.name));
    const small = document.createElement('small'); small.textContent = d.colour || ''; label.appendChild(small);
    label.hidden = false;
  }
  function placeLabel(ev) {
    if (label.hidden) return;
    const r = stage.getBoundingClientRect();
    let x = ev.clientX - r.left, y = ev.clientY - r.top;
    const lw = label.offsetWidth + 20, lh = label.offsetHeight + 20;
    if (x + lw > r.width) x -= lw;
    if (y + lh > r.height) y -= lh;
    label.style.left = x + 'px'; label.style.top = y + 'px';
  }
  function canvasPoint(ev) {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) * canvas.width / r.width, (ev.clientY - r.top) * canvas.height / r.height];
  }
  function clear() { showHover(null); }

  canvas.addEventListener('pointermove', ev => {
    pointer = ev;
    if (drag) return;
    if (coarse() && ev.pointerType !== 'mouse') return;   // no hover on touch
    const [x, y] = canvasPoint(ev);
    const id = zoneOf(x, y);
    showHover(id);
    canvas.style.cursor = id ? 'pointer' : 'grab';
    placeLabel(ev);
  });
  canvas.addEventListener('pointerleave', () => { clear(); canvas.style.cursor = 'grab'; });

  /* --------------------------------------------------------------- turn */
  stage.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    if (ev.target.closest('button, a, input')) return;
    drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, turned: false };
  });
  window.addEventListener('pointermove', ev => {
    if (!drag || ev.pointerId !== drag.id || drag.turned) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    drag.turned = true; suppressClick = true; clear();
    onTurn(dx > 0 ? 1 : -1);
  });
  const endDrag = () => { if (drag) { drag = null; setTimeout(() => { suppressClick = false; }, 0); } };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('click', ev => {
    if (suppressClick) { ev.stopImmediatePropagation(); ev.preventDefault(); suppressClick = false; return; }
    const [x, y] = canvasPoint(ev);
    onPick(zoneOf(x, y));
  }, true);
  canvas.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowRight') { ev.preventDefault(); onTurn(1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); onTurn(-1); }
  });

  /* --------------------------------------------------------------- flip */
  // `swap` draws the new side. Returns once the glove has settled.
  async function flip(direction, swap) {
    clear();
    if (reduced() || !canvas.animate) { swap(); return; }
    const out = canvas.animate(
      [{ transform: 'perspective(1400px) rotateY(0deg)', opacity: 1 },
       { transform: `perspective(1400px) rotateY(${-22 * direction}deg) translateX(${-4 * direction}%)`, opacity: .25 }],
      { duration: 130, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    await out.finished.catch(() => {});
    swap();
    out.cancel();
    const back = canvas.animate(
      [{ transform: `perspective(1400px) rotateY(${22 * direction}deg) translateX(${4 * direction}%)`, opacity: .25 },
       { transform: 'perspective(1400px) rotateY(0deg)', opacity: 1 }],
      { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
    await back.finished.catch(() => {});
  }

  return { clear, flip, refresh: () => { const id = hovered; hovered = null; showHover(id); if (pointer) placeLabel(pointer); } };
}
