"""Package the hosted configurator for GitHub Pages; keep asset paths relative."""
import json
import pathlib
import shutil

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
    print(f'Pages package ready; {count} asset references checked.')


if __name__ == '__main__':
    build()
