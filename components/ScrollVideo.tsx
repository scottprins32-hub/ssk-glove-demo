"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type FrameSet = {
  /** folder under /public, no trailing slash, e.g. "/frames/desktop" */
  dir: string;
  /** exact number of frames ffmpeg exported into that folder */
  count: number;
  /** zero-padding of the frame number — 4 means frame_0001.jpg */
  pad?: number;
  /** file extension without the dot */
  ext?: string;
};

type ScrollVideoProps = {
  desktop: FrameSet;
  /** omit if you only have one video — desktop frames are used everywhere */
  mobile?: FrameSet;
  /**
   * How long the section pins for, as a multiple of the viewport height.
   * 3 → you scroll 300vh worth before the section releases. Higher = slower playback.
   */
  scrollLength?: number;
  /** optional overlay (headline, etc.) rendered above the video */
  children?: React.ReactNode;
  className?: string;
};

function frameUrl(set: FrameSet, i: number) {
  const pad = set.pad ?? 4;
  const ext = set.ext ?? "jpg";
  // ffmpeg numbers frames starting at 1
  const n = String(i + 1).padStart(pad, "0");
  return `${set.dir}/frame_${n}.${ext}`;
}

export default function ScrollVideo({
  desktop,
  mobile,
  scrollLength = 3,
  children,
  className = "",
}: ScrollVideoProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    // Pick the frame set: mobile frames under 768px if provided, else desktop.
    const isMobile = !!mobile && window.matchMedia("(max-width: 767px)").matches;
    const set = isMobile ? mobile! : desktop;

    // Preload every frame as an <img>. We draw whichever is ready.
    const images: HTMLImageElement[] = new Array(set.count);
    const state = { frame: 0 };

    // Size the canvas to its container in device pixels for crispness.
    function resizeCanvas() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(rect.width * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      ctx2d!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Draw one frame, "cover"-fitting it to the canvas (no distortion).
    function draw(index: number) {
      const img = images[index];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      const rect = canvas!.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = cw / ch;
      let dw = cw;
      let dh = ch;
      if (ir > cr) {
        dh = ch;
        dw = ch * ir;
      } else {
        dw = cw;
        dh = cw / ir;
      }
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx2d!.clearRect(0, 0, cw, ch);
      ctx2d!.drawImage(img, dx, dy, dw, dh);
    }

    resizeCanvas();

    for (let i = 0; i < set.count; i++) {
      const img = new Image();
      img.src = frameUrl(set, i);
      img.onload = () => {
        // Paint the first frame as soon as it arrives so the section isn't blank.
        if (i === 0) draw(0);
      };
      images[i] = img;
    }

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let trigger: ScrollTrigger | null = null;

    if (prefersReduced) {
      // No scrubbing — just show the first frame and bail.
      const onReady = () => draw(0);
      if (images[0]?.complete) onReady();
      else images[0].addEventListener("load", onReady, { once: true });
    } else {
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${scrollLength * 100}%`,
        pin: true,
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const target = Math.min(
            set.count - 1,
            Math.round(self.progress * (set.count - 1))
          );
          if (target !== state.frame) {
            state.frame = target;
            draw(target);
          }
        },
      });
    }

    // ResizeObserver instead of window.resize: it also catches pane/container
    // changes and the post-pin layout settle, keeping canvas pixels in sync.
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      draw(state.frame);
    });
    ro.observe(canvas);

    // Make sure layout is measured after pin-spacers are inserted.
    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      ro.disconnect();
      trigger?.kill();
    };
  }, [desktop, mobile, scrollLength]);

  return (
    <div
      ref={sectionRef}
      className={`relative h-screen w-full overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        aria-hidden="true"
      />
      {children ? (
        <div className="pointer-events-none absolute inset-0">{children}</div>
      ) : null}
    </div>
  );
}
