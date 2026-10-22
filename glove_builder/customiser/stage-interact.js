/* The glove as the control: a label at the cursor naming the part and its
   colour, drag / swipe / arrow keys to turn it, the flip between sides, and
   the brush cursor while a colour is held. Presentation only. */


export function initStage({ canvas, label, stage, frame, renderer, mirror, zoneOf, describe, onPick, onTurn }) {
  let hovered = null, pointer = null, drag = null, suppressClick = false, held = null;
  // Zoom is gentle: up to 2.2x, around the pointer, and it pans only while
  // zoomed in. A double click or Escape puts the glove back.
  const Z = { max: 2.2, step: 1.12 };
  let zoom = 1, px = 0, py = 0, pinch = null;
  const applyZoom = animate => {
    frame.style.transition = animate ? 'transform 220ms cubic-bezier(.16,1,.3,1)' : 'none';
    frame.style.transform = zoom === 1 ? '' : `translate(${px}px, ${py}px) scale(${zoom})`;
    stage.classList.toggle('is-zoomed', zoom > 1);
  };
  const clampPan = () => {
    const r = stage.getBoundingClientRect(), lim = (zoom - 1) * 0.5;
    px = Math.max(-r.width * lim, Math.min(r.width * lim, px));
    py = Math.max(-r.height * lim, Math.min(r.height * lim, py));
  };
  function zoomTo(next, cx, cy, animate = true) {
    next = Math.max(1, Math.min(Z.max, next));
    if (next === zoom) return;
    // keep the point under the cursor where it is
    const r = stage.getBoundingClientRect(), ox = cx - r.left - r.width / 2, oy = cy - r.top - r.height / 2;
    const k = next / zoom;
    px = ox - (ox - px) * k; py = oy - (oy - py) * k; zoom = next;
    if (zoom === 1) { px = py = 0; }
    clampPan(); applyZoom(animate);
  }
  function zoomReset(animate = true) { if (zoom === 1 && !px && !py) return; zoom = 1; px = py = 0; applyZoom(animate); }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = () => matchMedia('(pointer: coarse)').matches;

  /* --------------------------------------------------------------- label */
  function showHover(id, force) {
    if (id === hovered && !force) return;
    hovered = id;
    if (!id) { label.hidden = true; return; }
    const d = describe(id);
    if (!d) { label.hidden = true; return; }
    label.innerHTML = '';
    label.append(document.createTextNode(d.name));
    const small = document.createElement('small');
    small.textContent = held ? `→ ${held.label}` : (d.colour || '');
    label.appendChild(small);
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

  /* --------------------------------------------------------- turn, zoom */
  const touches = new Map();
  stage.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    if (ev.target.closest('button, a, input')) return;
    if (ev.pointerType === 'touch') {
      touches.set(ev.pointerId, ev);
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zoom, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2 };
        drag = null; return;
      }
    }
    drag = { x: ev.clientX, y: ev.clientY, px, py, id: ev.pointerId, turned: false, panned: false };
  });
  window.addEventListener('pointermove', ev => {
    if (pinch && touches.has(ev.pointerId)) {
      touches.set(ev.pointerId, ev);
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      zoomTo(pinch.z * d / pinch.d, pinch.cx, pinch.cy, false); return;
    }
    if (!drag || ev.pointerId !== drag.id || drag.turned) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (zoom > 1) {   // zoomed in: dragging pans
      if (Math.abs(dx) + Math.abs(dy) < 4 && !drag.panned) return;
      drag.panned = true; suppressClick = true;
      px = drag.px + dx; py = drag.py + dy; clampPan(); applyZoom(false); clear(); return;
    }
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    drag.turned = true; suppressClick = true; clear();
    onTurn(dx > 0 ? 1 : -1);
  });
  const endDrag = ev => {
    if (ev && ev.pointerType === 'touch') { touches.delete(ev.pointerId); if (touches.size < 2) pinch = null; }
    if (drag) { drag = null; setTimeout(() => { suppressClick = false; }, 0); }
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  stage.addEventListener('wheel', ev => {
    if (ev.target.closest('button, a, input') || stage.classList.contains('is-compare')) return;
    ev.preventDefault();
    const dir = ev.deltaY < 0 ? Z.step : 1 / Z.step;
    zoomTo(zoom * dir, ev.clientX, ev.clientY, true);
    if (zoom > 1 && pointer) placeLabel(pointer);
  }, { passive: false });
  stage.addEventListener('dblclick', ev => { if (!ev.target.closest('button, a, input')) { ev.preventDefault(); if (zoom > 1) zoomReset(); else zoomTo(1.8, ev.clientX, ev.clientY); } });
  stage.addEventListener('touchmove', ev => { if (pinch) ev.preventDefault(); }, { passive: false });
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
    clear(); zoomReset(false);
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
    clear, flip, hold, zoomReset,
    get zoom() { return zoom; },
    get held() { return held; },
    refresh: () => { const id = hovered; hovered = null; showHover(id); if (pointer) placeLabel(pointer); }
  };
}
