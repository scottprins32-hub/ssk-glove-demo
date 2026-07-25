"""Fold the configurator into one self-contained HTML file.

The hosted build (index.html + app.js + assets/) is the source of truth; this
produces dist/index.html for places that can only take a single file with no
outbound requests — the Claude artifact preview, an email attachment, a CCV
Shop HTML block.

    python glove_builder/customiser/bundle.py

Every asset the app actually references becomes a data URI; fonts are fetched
from Google once and embedded, so the page renders identically offline.
"""

import base64
import json
import mimetypes
import pathlib
import re
import urllib.request

HERE = pathlib.Path(__file__).parent
OUT = HERE / "dist" / "index.html"
GF = ("https://fonts.googleapis.com/css2?"
      "family=Barlow+Condensed:wght@500;600;700;800"
      "&family=Barlow:wght@400;500;600;700"
      "&family=IBM+Plex+Mono:wght@400;500;600&display=swap")
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/120.0 Safari/537.36")


def data_uri(path: pathlib.Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def embedded_fonts() -> str:
    """Google Fonts CSS with the latin woff2 files inlined."""
    try:
        css = get(GF).decode()
    except Exception as e:                                   # offline build
        print(f"  ! fonts unavailable ({e}); falling back to system stacks")
        return "/* fonts: offline at build time, token fallbacks apply */"
    blocks, keep = css.split("@font-face"), []
    for b in blocks[1:]:
        # latin only — the other subsets triple the size for no visible gain
        if "U+0000-00FF" not in b:
            continue
        m = re.search(r"url\((https://[^)]+\.woff2)\)", b)
        if not m:
            continue
        try:
            woff = get(m.group(1))
        except Exception:
            continue
        b = b.replace(m.group(1), "data:font/woff2;base64," +
                      base64.b64encode(woff).decode())
        keep.append("@font-face" + b)
    print(f"  embedded {len(keep)} font faces")
    return "\n".join(keep)


def main():
    html = (HERE / "index.html").read_text()

    # ---- CSS: token files then app.css, with the @import swapped for real fonts
    css_parts = []
    for m in re.finditer(r'<link rel="stylesheet" href="([^"]+)">', html):
        f = HERE / m.group(1)
        text = f.read_text()
        if "fonts.googleapis.com" in text:
            text = re.sub(r"@import url\([^)]*\);", "", text)
            text = embedded_fonts() + "\n" + text
        css_parts.append(text)
    html = re.sub(r'<link rel="stylesheet" href="[^"]+">\s*', "", html)
    html = html.replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">',
                        f'<link rel="icon" href="{data_uri(HERE / "favicon.svg")}">')

    # ---- JS: three ES modules concatenated into one inline module
    js = []
    for name in ("glove-catalog.js", "glove-engine.js", "app.js"):
        src = (HERE / name).read_text()
        src = re.sub(r"^\s*import[^;]+;\s*$", "", src, flags=re.M)
        src = re.sub(r"^export\s+", "", src, flags=re.M)
        js.append(f"/* ---- {name} ---- */\n{src}")

    # ---- assets: inline every path the app actually references
    data = json.loads((HERE / "assets" / "glove-data.json").read_text())
    n = 0
    for k, v in list(data["assets"].items()):
        data["assets"][k] = data_uri(HERE / v); n += 1
    for b in data["bullets"]:
        if b.get("thumb"):
            b["thumb"] = data_uri(HERE / b["thumb"]); n += 1

    body = "\n".join(js)
    # catalogue and reference image paths (webs, pads, fonts, flags, photos)
    def sub_asset(m):
        nonlocal n
        p = HERE / m.group(1)
        if not p.is_file():
            return m.group(0)
        n += 1
        return "'" + data_uri(p) + "'"
    body = re.sub(r"'(assets/(?:form|ref)/[^']+)'", sub_asset, body)
    # glove-catalog builds form paths as `F + 'webs/H_Web.jpg'`; resolve those
    def sub_concat(m):
        nonlocal n
        p = HERE / "assets" / "form" / m.group(1)
        if not p.is_file():
            return m.group(0)
        n += 1
        return "'" + data_uri(p) + "'"
    # the font list builds its path from the option name at runtime
    body = body.replace("F + 'fonts/' + n.replace(/ /g, '_') + '.jpg'",
                        "FONT_IMG[n]")
    body = re.sub(r"F \+ '([^']+)'", sub_concat, body)
    font_map = {f.stem.replace("_", " "): data_uri(f)
                for f in sorted((HERE / "assets" / "form" / "fonts").glob("*.jpg"))}
    n += len(font_map)
    body = ("const FONT_IMG = " + json.dumps(font_map) + ";\n"
            "window.__GLOVE_DATA__ = " + json.dumps(data, separators=(",", ":")) + ";\n"
            + body)

    html = html.replace('<script type="module" src="app.js"></script>',
                        '<script type="module">\n' + body + '\n</script>')
    html = html.replace("</head>",
                        "<style>\n" + "\n".join(css_parts) + "\n</style>\n</head>")

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html)
    print(f"  inlined {n} assets")
    print(f"wrote {OUT.relative_to(HERE.parent.parent)} "
          f"({OUT.stat().st_size / 1048576:.2f} MB)")


if __name__ == "__main__":
    main()
