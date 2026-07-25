"""Generate per-part cutouts of a baseball glove photo using SAM3 text prompts.

For the SSK 2.5D glove builder: each customizable zone of the glove (web,
laces, back panels, binding, logo, ...) is segmented and exported as a
transparent RGBA PNG layer plus a grayscale mask, so a web configurator can
stack and recolor the layers independently.

Usage:
    python glove_builder/make_cutouts.py --image path/to/glove.jpg --out out/glove1
    python glove_builder/make_cutouts.py --image glove.jpg --prompts glove_builder/prompts.json

The prompts file maps layer names to SAM3 text prompts:
    {"web": "web of the baseball glove", "laces": "leather laces", ...}
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image

DEFAULT_PROMPTS = {
    "glove": "baseball glove",
    "web": "web of the baseball glove",
    "laces": "leather lace",
    "stitching": "stitching thread",
    "logo": "logo",
    "embroidery": "embroidered text",
    "binding": "leather trim edge of the glove",
}

# Distinct overlay colors for the preview image (RGB).
PREVIEW_COLORS = [
    (230, 60, 60), (60, 130, 230), (60, 200, 90), (240, 180, 40),
    (170, 80, 220), (40, 210, 210), (240, 110, 40), (230, 90, 180),
]


def load_processor():
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = build_sam3_image_model(device=device)
    return Sam3Processor(model, device=device)


def masks_to_layer(image_rgba: np.ndarray, mask: np.ndarray) -> Image.Image:
    """Return an RGBA cutout of `image_rgba` where mask==True, transparent elsewhere.

    RGB is blanked outside the mask as well, so viewers that ignore the alpha
    channel still show only the cutout.
    """
    layer = image_rgba.copy()
    layer[~mask] = 0
    layer[..., 3] = np.where(mask, 255, 0).astype(np.uint8)
    return Image.fromarray(layer, mode="RGBA")


def mask_to_np(m):
    m = m.squeeze()
    if isinstance(m, torch.Tensor):
        m = m.cpu().numpy()
    return m.astype(bool)


def box_to_pixels(box, w, h):
    cx, cy, bw, bh = box
    return (int((cx - bw / 2) * w), int((cy - bh / 2) * h),
            int((cx + bw / 2) * w), int((cy + bh / 2) * h))


def render_boxes(image, zones, out_path):
    """Draw labeled zone boxes on the photo (no model needed)."""
    from PIL import ImageDraw
    im = image.convert("RGB").copy()
    d = ImageDraw.Draw(im)
    for i, (name, cfg) in enumerate(zones.items()):
        for box in cfg.get("boxes", []):
            x0, y0, x1, y1 = box_to_pixels(box, im.width, im.height)
            col = tuple(PREVIEW_COLORS[i % len(PREVIEW_COLORS)])
            d.rectangle([x0, y0, x1, y1], outline=col, width=3)
            d.text((x0 + 3, y0 + 2), name, fill=col)
    im.save(out_path, quality=92)
    print("box overlay saved to", out_path)


def run_zones(processor, state, zones, image_rgba, out_dir, thresh):
    """Segment each SSK zone using box exemplars (optionally + text)."""
    h, w = image_rgba.shape[:2]
    raw_dir = out_dir / "masks_raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    for name, cfg in zones.items():
        if name.startswith("_"):
            continue
        processor.reset_all_prompts(state)
        output = None
        if cfg.get("text"):
            output = processor.set_text_prompt(state=state, prompt=cfg["text"])
        for box in cfg.get("boxes", []):
            output = processor.add_geometric_prompt(box=list(box), label=True, state=state)
        masks, scores = output["masks"], output["scores"]
        cands = [(mask_to_np(m), float(s)) for m, s in zip(masks, scores)]
        pick = cfg.get("pick", "iou")

        union = np.zeros((h, w), dtype=bool)
        used_scores = []
        if pick == "all" or not cfg.get("boxes"):
            for m, s in cands:
                if s >= thresh:
                    union |= m
                    used_scores.append(s)
        elif pick == "best":
            if cands:
                m, s = max(cands, key=lambda t: t[1])
                union |= m
                used_scores.append(s)
        else:  # 'iou': instance overlapping the positive boxes best
            box_region = np.zeros((h, w), dtype=bool)
            for box in cfg.get("boxes", []):
                x0, y0, x1, y1 = box_to_pixels(box, w, h)
                box_region[max(y0, 0):y1, max(x0, 0):x1] = True
            best, best_ov = None, 0.0
            for m, s in cands:
                inter = (m & box_region).sum()
                ov = inter / max(m.sum(), 1)
                if inter > 0 and ov * s > best_ov:
                    best, best_ov = (m, s), ov * s
            if best is not None:
                union |= best[0]
                used_scores.append(best[1])

        report[name] = {"instances_found": len(cands), "used": len(used_scores),
                        "scores": [round(s, 3) for s in used_scores],
                        "coverage_pct": round(float(union.mean()) * 100, 2)}
        Image.fromarray((union * 255).astype(np.uint8)).save(raw_dir / f"{name}.png")
        print(f"[{name}] {len(cands)} candidates -> used {len(used_scores)}, "
              f"coverage {union.mean()*100:.1f}%")
    (out_dir / "report_zones.json").write_text(json.dumps(report, indent=2))
    print(f"\nRaw zone masks in {raw_dir}/ — run refine_zones.py next")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--image", required=True, help="Input glove photo")
    ap.add_argument("--out", default=None, help="Output directory (default: out/<image stem>)")
    ap.add_argument("--prompts", default=None, help="JSON file mapping layer name -> text prompt")
    ap.add_argument("--zones", default=None,
                    help="JSON zone config with box exemplars (SSK zone mode)")
    ap.add_argument("--render-boxes", default=None, metavar="OUT_JPG",
                    help="Only draw the zone boxes on the photo and exit (no model)")
    ap.add_argument("--score-thresh", type=float, default=0.5,
                    help="Keep instances with score >= this threshold")
    args = ap.parse_args()

    image_path = Path(args.image)
    out_dir = Path(args.out) if args.out else Path("out") / image_path.stem
    (out_dir / "masks").mkdir(parents=True, exist_ok=True)
    (out_dir / "layers").mkdir(parents=True, exist_ok=True)

    prompts = DEFAULT_PROMPTS
    if args.prompts:
        prompts = json.loads(Path(args.prompts).read_text())

    image = Image.open(image_path).convert("RGB")
    image_rgba = np.array(image.convert("RGBA"))
    preview = np.array(image, dtype=np.float32)

    if args.render_boxes:
        zones = {k: v for k, v in json.loads(Path(args.zones).read_text()).items()
                 if not k.startswith("_")}
        render_boxes(image, zones, args.render_boxes)
        return

    print(f"Loading SAM3 model (device: {'cuda' if torch.cuda.is_available() else 'cpu'})...")
    processor = load_processor()
    state = processor.set_image(image)

    if args.zones:
        zones = {k: v for k, v in json.loads(Path(args.zones).read_text()).items()
                 if not k.startswith("_")}
        run_zones(processor, state, zones, image_rgba, out_dir, args.score_thresh)
        return

    report = {}
    for idx, (name, prompt_options) in enumerate(prompts.items()):
        if isinstance(prompt_options, str):
            prompt_options = [prompt_options]
        # try each phrasing, keep the one whose best instance scores highest
        best = {"prompt": None, "kept": [], "top": 0.0}
        tried = {}
        for prompt in prompt_options:
            output = processor.set_text_prompt(state=state, prompt=prompt)
            masks, scores = output["masks"], output["scores"]
            kept = [(m, float(s)) for m, s in zip(masks, scores)
                    if float(s) >= args.score_thresh]
            top = max((s for _, s in kept), default=0.0)
            tried[prompt] = {"instances": len(kept), "top": round(top, 3)}
            if top > best["top"]:
                best = {"prompt": prompt, "kept": kept, "top": top}
        kept = best["kept"]
        print(f"[{name}] best prompt: {best['prompt']!r} ({len(kept)} inst, top {best['top']:.2f})")
        report[name] = {"tried": tried, "chosen": best["prompt"],
                        "instances": len(kept),
                        "scores": [round(s, 3) for _, s in kept]}
        if not kept:
            print(f"  no instances above threshold {args.score_thresh}")
            continue

        # Union all kept instances into one layer mask (e.g. all laces together).
        union = np.zeros(image_rgba.shape[:2], dtype=bool)
        for m, _ in kept:
            m = m.squeeze()
            if isinstance(m, torch.Tensor):
                m = m.cpu().numpy()
            union |= m.astype(bool)

        Image.fromarray((union * 255).astype(np.uint8)).save(out_dir / "masks" / f"{name}.png")
        masks_to_layer(image_rgba, union).save(out_dir / "layers" / f"{name}.png")

        color = np.array(PREVIEW_COLORS[idx % len(PREVIEW_COLORS)], dtype=np.float32)
        # full-glove masks would paint over everything; keep them faint
        alpha = 0.15 if union.mean() > 0.5 else 0.55
        preview[union] = preview[union] * (1 - alpha) + color * alpha
        print(f"  saved {len(kept)} instance(s) -> layers/{name}.png")

    Image.fromarray(preview.astype(np.uint8)).save(out_dir / "preview.jpg", quality=92)
    (out_dir / "report.json").write_text(json.dumps(report, indent=2))
    print(f"\nDone. Output in {out_dir}/ (preview.jpg shows all layers color-coded)")


if __name__ == "__main__":
    main()
