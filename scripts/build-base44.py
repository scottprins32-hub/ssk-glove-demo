"""Build the dependency-complete static host package without altering image bytes.

Run from any directory: python3 scripts/build-base44.py
Output: _base44/ and _base44-manifest.json. Does not deploy or touch backend data.
"""
import hashlib
import json
import pathlib
import runpy
import shutil
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / '_site'
OUTPUT = ROOT / '_base44'
MANIFEST = ROOT / '_base44-manifest.json'
ENTRY_FILES = ('index.html', 'app.js', 'glove-engine.js', 'glove-catalog.js',
               'refcode.js', 'app.css', 'favicon.svg', '.nojekyll',
               'commerce-catalog.js','commerce-pricing.js','commerce-contract.js','commerce-config.js',
               'commerce-client.js','commerce-ui.js','commerce-display.js','commerce.css',
               'order.html','order.js','merchant.html','merchant.js','merchant-auth.bundle.js')
FOLDERS = ('ds', 'assets/form', 'assets/ref', 'assets/flags', 'assets/thumbs')
MAX_ARCHIVE_BYTES = 50_000_000


def dependencies(source):
    """Keep all registered view assets, including non-default webs and badges."""
    keep = set(ENTRY_FILES)
    for name in FOLDERS:
        folder = source / name
        if not folder.is_dir():
            raise FileNotFoundError(name)
        keep.update(str(p.relative_to(source)) for p in folder.rglob('*') if p.is_file())
    for view in ('glove', 'palm', 'thumb', 'pinky'):
        filename = f'assets/{view}-data.json'
        keep.add(filename)
        data = json.loads((source / filename).read_text())
        keep.update(v for v in data['assets'].values() if not v.startswith('data:'))
        keep.update(b['thumb'] for b in data.get('bullets', []) if b.get('thumb'))
    for name in keep:
        path = source / name
        if not path.is_file() or not path.resolve().is_relative_to(source.resolve()):
            raise ValueError(f'Missing or external package dependency: {name}')
    return sorted(keep)


def package(source=SOURCE, output=OUTPUT, manifest=MANIFEST):
    # Validate before replacing a previous generated package. Stage first so
    # missing assets or the host's archive limit cannot leave a partial build.
    keep = dependencies(source)
    with tempfile.TemporaryDirectory(prefix='.base44-build-', dir=output.parent) as temporary:
        staging = pathlib.Path(temporary) / 'site'
        staging.mkdir()
        entries = []
        for name in keep:
            target = staging / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source / name, target)
            payload = target.read_bytes()
            entries.append({'path': name, 'bytes': len(payload),
                            'sha256': hashlib.sha256(payload).hexdigest()})
        archive = pathlib.Path(temporary) / 'site.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            for name in keep:
                tar.add(staging / name, arcname=name, recursive=False)
        archive_bytes = archive.stat().st_size
        if archive_bytes >= MAX_ARCHIVE_BYTES:
            raise ValueError(f'Archive is {archive_bytes:,} bytes; Base44 limit is 50 MB')
        result = {'files': entries, 'fileCount': len(entries),
                  'bytes': sum(e['bytes'] for e in entries), 'archiveBytes': archive_bytes}
        # These are disposable build outputs; source photos/traces stay in source.
        if output.exists():
            shutil.rmtree(output)
        staging.rename(output)
        manifest.write_text(json.dumps(result, indent=2) + '\n')
    return result


def build():
    runpy.run_path(str(ROOT / 'scripts/build-pages.py'), run_name='__main__')
    result = package()
    print(f"Base44 package ready: {result['fileCount']} files, "
          f"{result['bytes']:,} bytes; archive {result['archiveBytes']:,} bytes.")


if __name__ == '__main__':
    build()
