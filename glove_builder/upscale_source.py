"""Upscale a source photo 4x for high-DPI layer export.

Uses EDSR x4 (free, local, via opencv dnn_superres) when available,
falling back to Lanczos. One-time step per base photo:

    python glove_builder/upscale_source.py --image <photo.jpg> --out <4x.png>
"""

import argparse
import pathlib
import urllib.request

import cv2

EDSR_URL = ("https://github.com/Saafke/EDSR_Tensorflow/raw/master/models/"
            "EDSR_x4.pb")
MODEL_DIR = pathlib.Path(__file__).parent / "models"


def upscale(img, scale=4):
    try:
        from cv2 import dnn_superres
        MODEL_DIR.mkdir(exist_ok=True)
        pb = MODEL_DIR / "EDSR_x4.pb"
        if not pb.exists():
            print("downloading EDSR_x4.pb ...")
            urllib.request.urlretrieve(EDSR_URL, pb)
        sr = dnn_superres.DnnSuperResImpl_create()
        sr.readModel(str(pb))
        sr.setModel("edsr", scale)
        print("upscaling with EDSR x4 (CPU, takes a few minutes)...")
        return sr.upsample(img)
    except Exception as e:  # dnn_superres missing or model fetch failed
        print(f"EDSR unavailable ({e}); using Lanczos")
        h, w = img.shape[:2]
        return cv2.resize(img, (w * scale, h * scale),
                          interpolation=cv2.INTER_LANCZOS4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=4)
    args = ap.parse_args()
    img = cv2.imread(args.image)
    out = upscale(img, args.scale)
    cv2.imwrite(args.out, out)
    print(f"{img.shape[1]}x{img.shape[0]} -> {out.shape[1]}x{out.shape[0]}"
          f" saved to {args.out}")


if __name__ == "__main__":
    main()
