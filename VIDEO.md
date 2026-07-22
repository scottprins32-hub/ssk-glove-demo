# Hero video — production guide

> **Status: DONE.** The Kling clip landed (`hero-video.mp4`, 1080p 24fps ~5s).
> 121 native frames extracted with the KlingAI watermark cropped off
> (`ffmpeg -vf "crop=1920:1008:0:0,scale=1280:-2:flags=lanczos" -qscale:v 2`),
> ScrollVideo wired in `components/Hero.tsx` (`count: 121`). Mobile and
> reduced-motion keep the static-image form. The guide below is kept for
> retakes.

Everything needed to produce the scroll-scrubbed exploded-glove clip and wire
it into the site. The overlay (headline/CTA) is already final in
`components/Hero.tsx`; only the background layers get swapped.

## Assets in this repo

- **`hero-start-frame.png`** (1920×1080) — ready-made START frame: the real
  SSK Advanced 11.75″ Tan on the exact dark-studio backdrop the site renders.
  Using this as Kling's start frame makes the video begin pixel-close to the
  static hero, so the swap is seamless.
- `public/gloves/advanced-tan-1175.webp` + `-palm.webp` — extra reference
  angles of the same glove for the end-frame generation.

## Generation (Kling / ChatGPT images — Higgsfield account has 0 credits)

Composition rules for every frame: glove centered at ~68% from the left,
~56% from the top; left half of frame stays empty (headline lives there);
camera 16:9, eye-level, no tilt; single warm key light from upper right,
near-black warm brown background (#0d0b09); no text, no watermarks, no hands.

### 1. START FRAME
Use `hero-start-frame.png` as-is. Don't regenerate it — continuity with the
live site is the whole point.

### 2. END FRAME (image gen, start frame as reference)
> Same baseball glove, same camera, same warm studio lighting and dark brown
> background, now as a technical exploded view: the glove disassembled into
> its parts — outer leather shell panels, leather lacing strands, the web
> piece, and the soft palm lining — separated and suspended in mid-air with
> small gaps between them, floating parallel to each other around the spot
> where the glove was. Product-photography style, crisp, no motion blur,
> no text, no hands, no extra objects.

Regenerate until: background/lighting identical to start, parts read clearly
as leer / veters / web / voering (they're annotated in §2 of the site), and
the left half of frame stays empty.

### 3. VIDEO (Kling, start + end frame mode)
> One continuous shot, locked-off camera with a very slow push-in. The
> baseball glove calmly disassembles: lacing loosens and slides out, the web
> lifts away, the leather shell opens into separate panels, the soft lining
> emerges — every part drifts to its own place in the air and hangs
> suspended, exploded-view style. Constant warm studio lighting, dark brown
> background stays fixed, product-photography look, smooth and slow, no
> camera shake, no rotation, no text.

Negative prompt: `text, watermark, logo morphing, hands, people, extra
fingers, background change, lighting change, color shift, flicker, fast
motion, camera rotation`

Settings: 16:9 · 1080p · 5s (10s only if the 5s takes feel rushed) ·
highest-quality export.

Takes: 2–3 max. Judge the first and last second hardest — the first frames
must match `hero-start-frame.png` (that's what the static hero shows before
the canvas takes over) and the last frames must hold still so the unpin
doesn't jump. Glove shape drifting mid-clip is acceptable; endpoints drifting
is a retake.

## Post-production (any session can execute this)

1. Drop the keeper in the repo root as `hero-video.mp4`.
2. Extract frames (command from BRIEF.md):
   ```
   ffmpeg -i hero-video.mp4 -vf "fps=30,scale=1280:-2:flags=lanczos" -qscale:v 1 \
     public/frames/desktop/frame_%04d.jpg
   ```
3. Count them: `ls public/frames/desktop | wc -l` (5s ≈ 150).
4. Copy `components/ScrollVideo.tsx` from the sibling repo
   `scottprins32-hub/bp-padel-website` (proven; do not rewrite it).
5. In `components/Hero.tsx`: wrap the existing overlay in
   `<ScrollVideo desktop={{ dir: "/frames/desktop", count: <N> }} scrollLength={3}>`
   (hard-code the real count), and remove the backdrop + glove-image +
   caption layers — the frames replace them. The overlay stays identical.
6. Verify in the browser: scroll down scrubs forward, scroll up reverses,
   unpins after ~3 viewport heights; under 768px and with
   `prefers-reduced-motion` it must fall back to a static frame, stacked.
7. `npm run build` must pass, then commit and push.
