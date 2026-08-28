"""Build the glove tracer: one HTML file with every source photograph in it.

Tracing a web by reading coordinates off a gridded screenshot and typing them
into a spec works, but slowly and badly — three rounds on one lace. Scott:
"can we like build a little thing where I can just click and select or draw
the thing and then name it." This is that. Draw the shape on the photograph,
say what it is, copy the Python out, paste it into make_web.py.

    python glove_builder/make_tracer.py

Writes dist/tracer.html.
"""

import base64
import io
import json
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).parent
# Every drive drop. drive-2026-08 is Pim's "Zooi van Pim" folder, which is
# where the palm-side calibration glove and the finger hood came from.
SRC_DIRS = sorted((HERE / "images").glob("drive-*"))
OUT = HERE / "customiser" / "dist" / "tracer.html"

# Everything the cutting scripts read, at the size they read it. Coordinates
# traced here are photograph pixels, so they can be pasted straight into a
# spec — re-encoding must not resize.
QUALITY = 82


def data_uri(path):
    im = Image.open(path).convert("RGB")
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=QUALITY, optimize=True)
    return im.size, ("data:image/jpeg;base64,"
                     + base64.b64encode(buf.getvalue()).decode())


def main():
    photos = []
    files = sorted((p for d in SRC_DIRS for p in d.iterdir()),
                   key=lambda p: (p.parent.name, p.name))
    for p in files:
        if p.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        (w, h), uri = data_uri(p)
        photos.append({"name": p.name, "w": w, "h": h, "src": uri})
        print(f"  {p.name:24s} {w}x{h}  {len(uri) / 1e6:.2f} MB")
    body = json.dumps(photos, separators=(",", ":"))
    html = (HERE / "tracer_template.html").read_text()
    html = html.replace("/*__PHOTOS__*/[]", body)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html)
    print(f"wrote {OUT.relative_to(HERE.parent)} "
          f"({OUT.stat().st_size / 1e6:.2f} MB, {len(photos)} photographs)")


if __name__ == "__main__":
    main()
