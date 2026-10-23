/* The glove as the control: a label at the cursor naming the part and its
   colour, drag / swipe / arrow keys to turn it, the flip between sides, and
   the brush cursor while a colour is held. Presentation only. */


export function initStage({ canvas, label, stage, frame, renderer, mirror, zoneOf, describe, onPick, onTurn }) {
  let hovered = null, pointer = null, drag = null, suppressClick = false, held = null, scrub = 0, turning = null;
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
    // Not zoomed: the glove leans with the finger before it commits to a turn.
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.2 && !reduced()) {
      if (!drag.scrubbing) { drag.scrubbing = true; clear(); canvas.classList.add('is-turning'); }
      scrub = Math.max(-28, Math.min(28, dx * 0.14));
      canvas.style.transform = `perspective(1600px) translateX(${dx * 0.05}px) rotateY(${scrub}deg)`;
    }
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    drag.turned = true; suppressClick = true; clear();
    // swipe left for the next side, right for the one before: the side
    // leaves the way the finger went
    onTurn(dx > 0 ? -1 : 1);
  });
  const endDrag = ev => {
    if (ev && ev.pointerType === 'touch') { touches.delete(ev.pointerId); if (touches.size < 2) pinch = null; }
    if (drag) {
      if (drag.scrubbing && !drag.turned) settle();
      drag = null; setTimeout(() => { suppressClick = false; }, 0);
    }
  };
  // A lean that did not become a turn springs back, with a little overshoot.
  function settle() {
    const from = canvas.style.transform; scrub = 0;
    if (!from) { canvas.classList.remove('is-turning'); return; }
    const a = canvas.animate([{ transform: from }, { transform: 'perspective(1600px) translateX(0) rotateY(0deg)' }],
      { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    canvas.style.transform = '';
    a.finished.catch(() => {}).then(() => canvas.classList.remove('is-turning'));
  }
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
  /* A turn of the glove, as if it stood on a turntable: the side that was
     showing leaves in depth the way it was turned while the next side swings
     in from the other edge, overlapping. A band of studio light crosses the
     new side once it lands, and the side's name rises large behind it.
     Transform, opacity and filter only; a newer turn cuts the older short.
     `swap` draws the new side; `name` is what the stage calls it. */
  const ease = { out: 'cubic-bezier(.16,1,.3,1)', inOut: 'cubic-bezier(.65,0,.35,1)' };
  function copyOf(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0); return c;
  }
  function overlay(cls, src, fit) {
    // sits exactly on the glove inside the frame, whatever the layout; a
    // side of another shape is fitted to the glove's height, centred
    const c = src ? copyOf(src) : document.createElement('canvas');
    c.className = cls; c.setAttribute('aria-hidden', 'true');
    let w = canvas.offsetWidth, h = canvas.offsetHeight;
    if (fit && src) { w = Math.min(frame.clientWidth || w, h * src.width / src.height); h = w * src.height / src.width; }
    Object.assign(c.style, { left: canvas.offsetLeft + (canvas.offsetWidth - w) / 2 + 'px', top: canvas.offsetTop + (canvas.offsetHeight - h) / 2 + 'px',
      width: w + 'px', height: h + 'px' });
    frame.appendChild(c); return c;
  }
  function sheen(token, exit = 1) {
    // the glove's own silhouette, half size, as the mask for the light band
    const k = .5, w = Math.round(canvas.width * k), h = Math.round(canvas.height * k);
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    mask.getContext('2d').drawImage(canvas, 0, 0, w, h);
    const band = overlay('stage-sheen'); band.width = w; band.height = h;
    const g = band.getContext('2d'), t0 = performance.now(), D = 1050;
    const step = now => {
      if (turning !== token) { band.remove(); return; }
      const p = Math.min(1, (now - t0) / D), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      // the band crosses the way the glove turned
      const travel = -w * .5 + e * w * 2;
      const x = exit < 0 ? travel : w - travel;
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
      const lg = g.createLinearGradient(x - w * .22, 0, x + w * .22, h * .3);
      const a = Math.sin(Math.PI * p);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.42, `rgba(255,255,255,${.35 * a})`);
      lg.addColorStop(.5, `rgba(255,255,255,${.85 * a})`); lg.addColorStop(.58, `rgba(255,255,255,${.35 * a})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0);
      if (p < 1) requestAnimationFrame(step); else band.remove();
    };
    requestAnimationFrame(step);
  }
  function word(name, exit, lag = 0) {
    if (!name) return;
    for (const old of stage.querySelectorAll('.stage-word')) old.remove();
    const w = document.createElement('div'); w.className = 'stage-word'; w.setAttribute('aria-hidden', 'true');
    const line = document.createElement('span'); line.className = 'stage-word-line';
    [...name.toUpperCase()].forEach((ch, i) => {
      const l = document.createElement('span'); l.textContent = ch === ' ' ? ' ' : ch;
      l.animate([{ transform: `translate3d(${-exit * 40}px,110%,0) rotate(${-exit * 8}deg)`, opacity: 0 },
                 { transform: 'translate3d(0,0,0) rotate(0)', opacity: 1 }],
        { duration: 900, delay: 200 + lag + i * 38, easing: ease.out, fill: 'backwards' });
      line.appendChild(l);
    });
    w.appendChild(line); stage.insertBefore(w, stage.firstChild);
    // as large as the podium allows, never cut off at its edges
    const room = stage.clientWidth * .9, used = line.offsetWidth;
    if (used > room) w.style.fontSize = parseFloat(getComputedStyle(w).fontSize) * room / used + 'px';
    w.animate([{ opacity: 1, transform: 'translate(-50%,-50%)', letterSpacing: '-.01em' }, { opacity: 0, transform: 'translate(-50%,-50%)', letterSpacing: '.06em' }],
      { duration: 900, delay: 1500 + lag, easing: ease.inOut, fill: 'forwards' })
      .finished.catch(() => {}).then(() => w.remove());
  }
  async function flip(direction, swap, name, via = []) {
    clear(); zoomReset(false);
    const token = turning = {};
    for (const old of frame.querySelectorAll('.stage-ghost, .stage-sheen, .stage-pass')) old.remove();
    canvas.getAnimations().forEach(a => a.cancel());
    const lean = scrub; scrub = 0; canvas.style.transform = '';
    const fromRot = `perspective(1600px) translateX(0) rotateY(${lean}deg) scale(1)`;
    if (!canvas.animate || !canvas.offsetWidth) { swap(); canvas.classList.remove('is-turning'); return; }
    const ghost = overlay('stage-ghost', canvas);
    canvas.classList.add('is-turning');
    swap();
    const shadow = (getComputedStyle(canvas).filter || 'none').replace('none', '');
    if (reduced()) {
      await ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear', fill: 'forwards' }).finished.catch(() => {});
      ghost.remove(); if (turning === token) canvas.classList.remove('is-turning'); return;
    }
    const exit = -direction;                       // the way the old side leaves
    const soft = coarse() ? '' : 'blur(6px) ';     // no blur on phones: keep it smooth
    const P = 'perspective(1400px)';
    ghost.style.filter = shadow;
    // The old side accelerates away, as if pushed round.
    const out = ghost.animate([
      { transform: `${P} translateX(0) rotateY(${lean}deg) scale(1)`, opacity: 1, filter: `brightness(1) ${shadow}` },
      { offset: .6, opacity: .9 },
      { transform: `${P} translateX(${exit * 24}%) rotateY(${exit * 88}deg) scale(.86)`, opacity: 0, filter: `${soft}brightness(.45) ${shadow}` }
    ], { duration: 580, easing: 'cubic-bezier(.55,0,.8,.2)', fill: 'forwards' });
    // The new side swings in from the far edge, passes a hair beyond square
    // and settles: the weight of a real glove on a turntable.
    // The sides in between pass by on the way: each swings in, across the
    // middle and out again, so a long turn reads as one rotation.
    const HOP = 340;
    const passes = via.map((pic, k) => {
      const o = overlay('stage-ghost stage-pass', pic, true);
      o.style.filter = shadow;
      const a = o.animate([
        { transform: `${P} translateX(${-exit * 24}%) rotateY(${-exit * 88}deg) scale(.86)`, opacity: 0, filter: `${soft}brightness(1.3) ${shadow}` },
        { offset: .5, transform: `${P} translateX(0) rotateY(0deg) scale(.96)`, opacity: 1, filter: `brightness(1) ${shadow}` },
        { transform: `${P} translateX(${exit * 24}%) rotateY(${exit * 88}deg) scale(.86)`, opacity: 0, filter: `${soft}brightness(.5) ${shadow}` }
      ], { duration: HOP * 2, delay: 170 + k * HOP, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' });
      a.finished.catch(() => {}).then(() => o.remove());
      return a;
    });
    const lag = via.length * HOP;
    const into = canvas.animate([
      { transform: `${P} translateX(${-exit * 24}%) rotateY(${-exit * 88}deg) scale(.86)`, opacity: 0, filter: `${soft}brightness(1.5) ${shadow}` },
      { offset: .28, opacity: 1 },
      { offset: .72, transform: `${P} translateX(${exit * .6}%) rotateY(${exit * 3.5}deg) scale(1.012)`, filter: `brightness(1.04) ${shadow}` },
      { transform: `${P} translateX(0) rotateY(0deg) scale(1)`, opacity: 1, filter: `brightness(1) ${shadow}` }
    ], { duration: via.length ? 1000 : 1150, delay: 230 + lag, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    // the podium breathes with the landing
    setTimeout(() => {
      if (turning !== token) return;
      stage.classList.remove('is-landing'); void stage.offsetWidth; stage.classList.add('is-landing');
      setTimeout(() => stage.classList.remove('is-landing'), 1500);
    }, lag);
    word(name, exit, lag);
    setTimeout(() => { if (turning === token) sheen(token, exit); }, 470 + lag);
    await out.finished.catch(() => {}); ghost.remove();
    await Promise.all(passes.map(a => a.finished.catch(() => {})));
    await into.finished.catch(() => {});
    if (turning === token) canvas.classList.remove('is-turning');
  }

  return {
    clear, flip, hold, zoomReset,
    get zoom() { return zoom; },
    get held() { return held; },
    refresh: () => { const id = hovered; hovered = null; showHover(id); if (pointer) placeLabel(pointer); }
  };
}
