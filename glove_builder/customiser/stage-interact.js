/* The glove as the control. Three things live here, all presentation:

   - hover: the part under the pointer lights up on a second canvas laid over
     the glove, and a label at the cursor names it and its colour. The marking
     is read off the same ownership maps a click uses, so what lights up is
     what a click would change. It is drawn inside the part, on the glove's own
     box rather than the frame around it, and parts cross-fade, so a sweep
     across the glove reads as one highlight travelling.
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
  // The overlay spans the frame, which letterboxes the picture, so its box is
  // taken from the glove itself. The marking then sits on the leather wherever
  // the two boxes disagree, and the outline is drawn at the size it is seen.
  function align() {
    if (!hover.offsetParent || canvas.offsetParent !== hover.offsetParent) return;
    hover.style.left = canvas.offsetLeft + 'px';
    hover.style.top = canvas.offsetTop + 'px';
    hover.style.width = canvas.offsetWidth + 'px';
    hover.style.height = canvas.offsetHeight + 'px';
  }

  function outlineFor(id) {
    const R = renderer(); if (!R) return null;
    const own = owners(); if (!own || !own.data) return null;
    const z = own.D.zones.find(z => z.id === id); if (!z) return null;
    const key = [R.view, id, mirror() ? 1 : 0, R.web || '', R.pad || '', R.flagSrc || '', R.materialSelectionKey || ''].join('|');
    let c = outlines.get(key);
    if (c) { outlines.delete(key); outlines.set(key, c); return c; }
    const { data, stride, fold, W, H } = own, n = z.n;
    // The part's own box, found once: only its pixels are read and drawn from
    // here on, so a sweep across the glove never pays for the canvas around it.
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        if (data[(row + (fold ? W - 1 - x : x)) * stride] !== n) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return null;
    // A single empty pixel all round: that margin is the only place the ring
    // may touch the glove, and it is what lets the neighbour tests below run
    // without bounds checks.
    const bw = x1 - x0 + 3, bh = y1 - y0 + 3;
    const mask = new Uint8Array(bw * bh);
    for (let y = y0; y <= y1; y++) {
      const row = y * W, gy = (y - y0 + 1) * bw;
      for (let x = x0; x <= x1; x++) {
        if (data[(row + (fold ? W - 1 - x : x)) * stride] === n) mask[gy + x - x0 + 1] = 1;
      }
    }
    // A hairline on the part's own edge, a light wash across the leather
    // behind it, and a whisper of dark just outside so pale leather still
    // shows the edge. Nothing is drawn away from the part.
    const img = hctx.createImageData(bw, bh), px = img.data;
    for (let i = 0, o = 0; i < mask.length; i++, o += 4) {
      if (mask[i]) {
        const edge = !mask[i - bw] || !mask[i + bw] || !mask[i - 1] || !mask[i + 1];
        px[o] = px[o + 1] = px[o + 2] = 255;
        px[o + 3] = edge ? 200 : 38;
      } else if (mask[i - bw] || mask[i + bw] || mask[i - 1] || mask[i + 1]) {
        px[o] = px[o + 1] = px[o + 2] = 17;
        px[o + 3] = 86;
      }
    }
    const cv = document.createElement('canvas');
    cv.width = bw; cv.height = bh;
    cv.getContext('2d').putImageData(img, 0, 0);
    c = { c: cv, x: x0 - 1, y: y0 - 1 };
    outlines.set(key, c);
    if (outlines.size > MIRROR_ZONES) outlines.delete(outlines.keys().next().value);
    return c;
  }
  // What the overlay is showing: one entry per outline, each with its own
  // presence. A part rises as the part it replaces falls, so a sweep reads as
  // one highlight travelling instead of a series of swaps, and a highlight is
  // never cut off mid-flight by the next one arriving.
  const FADE = 130;
  const live = new Map();
  let anim = 0;
  function paint() {
    hctx.clearRect(0, 0, hover.width, hover.height);
    for (const [c, l] of live) { hctx.globalAlpha = l.a; hctx.drawImage(c, l.x, l.y); }
    hctx.globalAlpha = 1;
  }
  function settle() {
    for (const l of live.values()) l.a = l.want;
    for (const c of [...live.keys()]) if (!live.get(c).want) live.delete(c);
    paint();
  }
  function fade() {
    cancelAnimationFrame(anim);
    if (reduced() || !live.size) { settle(); return; }
    let last = performance.now();
    const step = now => {
      const take = Math.min(48, now - last) / FADE; last = now;
      let moving = false;
      for (const l of live.values()) {
        const away = l.want - l.a;
        if (Math.abs(away) <= take) l.a = l.want;
        else { l.a += Math.sign(away) * take; moving = true; }
      }
      for (const c of [...live.keys()]) { const l = live.get(c); if (!l.a && !l.want) live.delete(c); }
      paint();
      if (moving) anim = requestAnimationFrame(step); else settle();
    };
    anim = requestAnimationFrame(step);
  }
  // `snap` is for a repaint under the marking -- the glove changed, so the
  // shape that would fade from is the old one. Everything else cross-fades.
  function showHover(id, snap) {
    if (id === hovered) return;
    hovered = id;
    if (hover.width !== canvas.width || hover.height !== canvas.height) {
      align();
      hover.width = canvas.width; hover.height = canvas.height;
    }
    const box = id ? outlineFor(id) : null;
    for (const l of live.values()) l.want = 0;
    if (box) {
      const hit = live.get(box.c);
      if (hit) hit.want = 1;
      else live.set(box.c, { x: box.x, y: box.y, a: 0, want: 1 });
    }
    if (snap || reduced()) settle(); else fade();
    if (!id) { label.hidden = true; return; }
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
  function clear(snap) { showHover(null, snap); }

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
    clear(true);
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

  // The overlay follows the glove: a window that changes size, or a stage that
  // switches in or out of the compare layout, moves it with the picture.
  align();
  if (window.ResizeObserver) new ResizeObserver(align).observe(canvas);
  addEventListener('resize', align);

  return {
    clear, flip,
    refresh: () => {
      const id = hovered; hovered = null;
      if (id) showHover(id, true);                  // the same part, freshly read
      else { cancelAnimationFrame(anim); live.clear(); paint(); }
      if (pointer) placeLabel(pointer);
    }
  };
}