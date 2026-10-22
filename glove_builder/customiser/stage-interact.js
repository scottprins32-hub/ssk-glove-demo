/* The glove as the control. Four things live here, all presentation:

   - the stitch: the part under the pointer gets its edge sewn — a red
     running stitch that draws itself round the part in half a second —
     and a label at the cursor that names it and its colour. The edge is
     read off the same ownership maps a click uses, so what is sewn is
     what a click would change. The same stitch runs once round a part
     when a colour lands on it (pulse).
   - turn: dragging across the glove (or swiping on a phone, or the arrow
     keys with the glove focused) moves to the next side. The app decides
     which sides exist; this only reports the direction.
   - the flip between two sides, so a change of view reads as the glove
     turning rather than one picture replacing another.
   - paint: while a colour is held, the cursor carries it.

   Nothing here touches the design state or the renderer's own caches. */

const KEEP = 24;             // outlines kept, across views and parts
const STITCH = '#C8102E';    // SSK stitch red
const SEW_MS = 520, HOLD_MS = 700, FADE_MS = 380;

export function initStage({ canvas, hover, label, stage, renderer, mirror, zoneOf, describe, onPick, onTurn }) {
  const hctx = hover.getContext('2d');
  const outlines = new Map();
  let hovered = null, pointer = null, drag = null, suppressClick = false, held = null;
  let anim = null;             // { o, mode: 'hover'|'pulse', colour, start, raf }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  const expo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);

  /* ------------------------------------------------------------ outlines */
  // n → zone id, in canvas space, for the current renderer view.
  function owners() {
    const R = renderer(); if (!R) return null;
    const D = R.DATA, W = D.w, H = D.h, m = mirror();
    if (R.view === 'back') return { data: R.backOwners(m), stride: 1, fold: false, W, H, D };
    return { data: R.idData, stride: 4, fold: m, W, H, D };
  }
  // The part's edge as closed loops of canvas points (marching squares over
  // the mask, one outer loop per connected piece, specks dropped), with each
  // loop's length so every loop finishes sewing at the same moment.
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
    const loops = [], seen = new Uint8Array(W * H), piece = new Uint8Array(W * H), stack = [];
    for (let start = 0; start < mask.length; start++) {
      if (!mask[start] || seen[start]) continue;
      // one connected piece: flood it, remember its size
      let size = 0; stack.push(start); seen[start] = 1; const members = [];
      while (stack.length) {
        const k = stack.pop(); size++; members.push(k);
        const x = k % W, y = (k / W) | 0;
        if (x > 0 && mask[k - 1] && !seen[k - 1]) { seen[k - 1] = 1; stack.push(k - 1); }
        if (x < W - 1 && mask[k + 1] && !seen[k + 1]) { seen[k + 1] = 1; stack.push(k + 1); }
        if (y > 0 && mask[k - W] && !seen[k - W]) { seen[k - W] = 1; stack.push(k - W); }
        if (y < H - 1 && mask[k + W] && !seen[k + W]) { seen[k + W] = 1; stack.push(k + W); }
      }
      if (size < 40) continue;
      for (const k of members) piece[k] = 1;
      const loop = trace(piece, W, H, start % W, (start / W) | 0);
      for (const k of members) piece[k] = 0;
      if (loop && loop.length > 6) loops.push(simplify(loop, 1.2));
    }
    const lengths = loops.map(p => { let l = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; l += Math.hypot(b[0] - a[0], b[1] - a[1]); } return l; });
    const path = new Path2D();
    for (const p of loops) { path.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) path.lineTo(p[i][0], p[i][1]); path.closePath(); }
    c = { loops, lengths, path };
    outlines.set(key, c);
    if (outlines.size > KEEP) outlines.delete(outlines.keys().next().value);
    return c;
  }
  // Marching squares from the first pixel of one piece in raster order: its
  // top-left corner is on the outer boundary, so the walk follows the outside
  // and never a hole.
  function trace(piece, W, H, sx, sy) {
    const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && piece[y * W + x] === 1;
    let x = sx, y = sy, dx = 0, dy = 0, guard = 0; const out = [];
    do {
      const i = (at(x - 1, y - 1) ? 1 : 0) | (at(x, y - 1) ? 2 : 0) | (at(x - 1, y) ? 4 : 0) | (at(x, y) ? 8 : 0);
      let nx = 0, ny = 0;
      switch (i) {
        case 1: case 5: case 13: ny = -1; break;
        case 2: case 3: case 7: nx = 1; break;
        case 4: case 12: case 14: nx = -1; break;
        case 8: case 10: case 11: ny = 1; break;
        case 6: nx = dy === -1 ? -1 : 1; break;
        case 9: ny = dx === 1 ? -1 : 1; break;
        default: return out.length >= 3 ? out : null;
      }
      if (nx !== dx || ny !== dy) out.push([x, y]);
      dx = nx; dy = ny; x += nx; y += ny;
    } while ((x !== sx || y !== sy) && ++guard < 400000);
    return out.length >= 3 ? out : null;
  }
  function simplify(pts, eps) {
    const keep = new Uint8Array(pts.length); keep[0] = 1; keep[pts.length - 1] = 1;
    const dist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const st = [[0, pts.length - 1]];
    while (st.length) { const [a, b] = st.pop(); let m = -1, md = 0; for (let i = a + 1; i < b; i++) { const d = dist(pts[i], pts[a], pts[b]); if (d > md) { md = d; m = i; } } if (md > eps) { keep[m] = 1; st.push([a, m], [m, b]); } }
    return pts.filter((_, i) => keep[i]);
  }

  /* -------------------------------------------------------------- sewing */
  function sizeHover() {
    if (hover.width !== canvas.width || hover.height !== canvas.height) { hover.width = canvas.width; hover.height = canvas.height; }
  }
  // Draw the stitch as far as the needle has come: `p` of its length (0..1).
  function sew(o, p = 1, alpha = 1, colour = STITCH) {
    sizeHover();
    hctx.setTransform(1, 0, 0, 1, 0, 0);
    hctx.clearRect(0, 0, hover.width, hover.height);
    if (!o || !o.loops.length) return;
    const scale = canvas.width / Math.max(1, canvas.getBoundingClientRect().width || canvas.width); // canvas px per css px
    const w = 2.2 * scale, dash = [7 * scale, 5 * scale];
    hctx.globalAlpha = alpha;
    hctx.fillStyle = 'rgba(255,255,255,.14)'; hctx.fill(o.path);
    // The whole stitch goes on a scratch layer, then only the sewn part is
    // kept: one long dash per loop, the length of the progress.
    const layer = sew.layer || (sew.layer = document.createElement('canvas'));
    if (layer.width !== hover.width || layer.height !== hover.height) { layer.width = hover.width; layer.height = hover.height; }
    const g = layer.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, layer.width, layer.height);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.setLineDash([]); g.lineWidth = w + 2.4 * scale; g.strokeStyle = 'rgba(255,255,255,.92)'; g.stroke(o.path);   // the thread's halo
    g.setLineDash(dash); g.lineWidth = w; g.strokeStyle = colour; g.stroke(o.path);
    if (p < 1) {
      g.globalCompositeOperation = 'destination-in';
      g.lineWidth = w + 6 * scale; g.strokeStyle = '#000';
      for (let i = 0; i < o.loops.length; i++) {
        const pl = new Path2D(), q = o.loops[i];
        pl.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) pl.lineTo(q[k][0], q[k][1]); pl.closePath();
        g.setLineDash([Math.max(0.01, p * o.lengths[i]), o.lengths[i] + 10]);
        g.stroke(pl);
      }
      g.globalCompositeOperation = 'source-over';
    }
    hctx.drawImage(layer, 0, 0);
    hctx.globalAlpha = 1;
  }
  function stopAnim() { if (anim && anim.raf) cancelAnimationFrame(anim.raf); anim = null; }
  function animate(o, mode, colour) {
    stopAnim();
    anim = { o, mode, colour, start: performance.now(), raf: 0 };
    if (reduced()) {
      sew(o, 1, 1, colour);
      if (mode === 'pulse') anim.timer = setTimeout(() => { if (anim && anim.mode === 'pulse') { anim = null; hovered ? showHover(hovered, true) : sew(null); } }, HOLD_MS);
      return;
    }
    const mine = anim;
    const frame = now => {
      if (anim !== mine) return;
      const t = now - mine.start, p = expo(Math.min(1, t / SEW_MS));
      if (mode === 'hover') {
        sew(o, p, 1, colour);
        if (t < SEW_MS) mine.raf = requestAnimationFrame(frame);
      } else {
        const fade = t > SEW_MS + HOLD_MS ? 1 - Math.min(1, (t - SEW_MS - HOLD_MS) / FADE_MS) : 1;
        sew(o, p, fade, colour);
        if (fade > 0) mine.raf = requestAnimationFrame(frame);
        else { anim = null; hovered ? showHover(hovered, true) : sew(null); }
      }
    };
    mine.raf = requestAnimationFrame(frame);
  }
  function showHover(id, force) {
    if (id === hovered && !force) return;
    hovered = id;
    if (anim && anim.mode === 'pulse' && id) return;   // the pulse finishes first, then the hover takes over
    if (!id) { stopAnim(); sew(null); label.hidden = true; return; }
    animate(outlineFor(id), 'hover', STITCH);
    const d = describe(id);
    if (!d) { label.hidden = true; return; }
    label.innerHTML = '';
    label.append(document.createTextNode(d.name));
    const small = document.createElement('small');
    small.textContent = held ? `→ ${held.label}` : (d.colour || '');
    label.appendChild(small);
    label.hidden = false;
  }
  // A colour landed: the stitch runs once round the part and fades.
  function pulse(id) {
    const o = outlineFor(id); if (!o) return;
    label.hidden = true;
    animate(o, 'pulse', STITCH);
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

  /* --------------------------------------------------------------- paint */
  // While a colour is held the cursor is a brush with that colour in it.
  function hold(colour) {
    held = colour;   // { hex, label } or null
    if (!held) { canvas.style.cursor = 'grab'; return; }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M4 24l6-2 11-11-4-4L6 18z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><circle cx="20" cy="8" r="6" fill="${held.hex}" stroke="#fff" stroke-width="2"/></svg>`;
    canvas.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 24, crosshair`;
  }

  canvas.addEventListener('pointermove', ev => {
    pointer = ev;
    if (drag) return;
    if (coarse() && ev.pointerType !== 'mouse') return;   // no hover on touch
    const [x, y] = canvasPoint(ev);
    const id = zoneOf(x, y);
    showHover(id);
    if (!held) canvas.style.cursor = id ? 'pointer' : 'grab';
    placeLabel(ev);
  });
  canvas.addEventListener('pointerleave', () => { clear(); if (!held) canvas.style.cursor = 'grab'; });

  /* ---------------------------------------------------------------- turn */
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

  /* ---------------------------------------------------------------- flip */
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

  return {
    clear, flip, pulse, hold,
    get held() { return held; },
    refresh: () => { if (anim && anim.mode === 'pulse') return; const id = hovered; hovered = null; showHover(id); if (pointer) placeLabel(pointer); }
  };
}
