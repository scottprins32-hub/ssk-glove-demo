"""Package the hosted configurator for GitHub Pages; keep asset paths relative."""
import json
import pathlib
import shutil
from version_site import version_site
from runtime_packs import build_packs

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'glove_builder' / 'customiser'
OUTPUT = ROOT / '_site'


def build():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    for item in SOURCE.iterdir():
        if item.is_file() and item.suffix.lower() in {'.html', '.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico'}:
            shutil.copy2(item, OUTPUT / item.name)
    for name in ('assets', 'ds'):
        shutil.copytree(SOURCE / name, OUTPUT / name)
    # Pages serves this folder directly; no Jekyll rewriting of assets.
    (OUTPUT / '.nojekyll').touch()
    index = (OUTPUT / 'index.html').read_text()
    index = index.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">')
    (OUTPUT / 'index.html').write_text(index)
    count = 0
    for filename in ('glove-data.json', 'palm-data.json', 'thumb-data.json', 'pinky-data.json'):
        data = json.loads((OUTPUT / 'assets' / filename).read_text())
        for asset in data['assets'].values():
            if asset.startswith('data:'):
                continue
            if not (OUTPUT / asset).is_file():
                raise FileNotFoundError(f'{filename}: {asset}')
            count += 1
    assert 'src="app.js"' in index
    packs = build_packs(OUTPUT)
    index = (OUTPUT / 'index.html').read_text()
    import re
    index = re.sub(r'<link rel="preload"[^>]*as="image"[^>]*>\n?', '', index)
    index = re.sub(r'<link rel="preload"[^>]*href="assets/glove-data.json"[^>]*>\n?', '', index)
    index = index.replace('<link rel="modulepreload" href="refcode.js">',
        '<link rel="modulepreload" href="refcode.js">\n<link rel="modulepreload" href="gallery-store.js">\n<link rel="modulepreload" href="commerce-pricing.js">')
    preloads = '<link rel="preload" href="assets/runtime/back.pack" as="fetch" crossorigin>\n'
    fonts = ['7cHpv4kjgoGqM7E_DMs5ynghnQ.woff2',
        'HTxwL3I-JCGChYJ8VI-L6OO_au7B4-Lwz3bWuYMBYro.woff2',
        'HTxwL3I-JCGChYJ8VI-L6OO_au7B46r2z3bWuYMBYro.woff2',
        'HTxwL3I-JCGChYJ8VI-L6OO_au7B47b1z3bWuYMBYro.woff2',
        '-F6qfjptAgt5VM-kVkqdyU8n3vAOwlBFgsAXHNk.woff2',
        '-F63fjptAgt5VM-kVkqdyU8n1i8q131nj-o.woff2']
    preloads += ''.join('<link rel="preload" href="ds/fonts/'+f+'" as="font" type="font/woff2" crossorigin>\n' for f in fonts)
    metadata = json.loads((OUTPUT/'assets/glove-data.json').read_text())
    inline = '<script>window.__SSK_IMAGE_PACKS__='+json.dumps(packs,separators=(',',':'))+';window.__GLOVE_DATA__='+json.dumps(metadata,separators=(',',':'))+';</script>'
    index = index.replace('</head>', preloads+inline+'\n</head>')
    (OUTPUT/'index.html').write_text(index)
    versions = version_site(OUTPUT)
    print(f'Pages package ready; {count} asset references checked; {len(versions)} content-versioned assets.')


if __name__ == '__main__':
    build()
