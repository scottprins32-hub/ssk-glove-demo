"""Version dependency URLs by content; unchanged image bytes retain their cache."""
import hashlib
import json
import pathlib
import re
from urllib.parse import urlsplit


def version_site(root):
    root = pathlib.Path(root)
    versions = {}
    def digest(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    # Only runtime view assets and catalog pictures enter the browser map.
    paths = set()
    for view in ('glove', 'palm', 'thumb', 'pinky'):
        name = f'assets/{view}-data.json'
        if not (root / name).is_file():
            continue
        paths.add(name)
        data = json.loads((root / name).read_text())
        paths.update(v for v in data.get('assets', {}).values() if not v.startswith('data:'))
        paths.update(b['thumb'] for b in data.get('bullets', []) if b.get('thumb'))
    for folder in ('assets/form', 'assets/ref', 'assets/flags', 'assets/thumbs', 'assets/runtime'):
        paths.update(str(p.relative_to(root)) for p in (root / folder).rglob('*') if p.is_file())
    for name in sorted(paths):
        path = root / name
        if not path.is_file() or not path.resolve().is_relative_to(root.resolve()):
            raise ValueError(f'Missing or external versioned dependency: {name}')
        versions[name] = digest(path)

    done, visiting = {}, set()
    imports = re.compile(r'((?:from\s*|import\s*(?:\(\s*)?)([\'"]))(\./[^\'"?#]+\.js)(\2)')
    def module(path):
        if path in done:
            return done[path]
        if path in visiting:
            raise ValueError(f'Cyclic module graph needs explicit version handling: {path}')
        visiting.add(path)
        def rewrite(match):
            dependency = (path.parent / match[3]).resolve()
            if not dependency.is_relative_to(root.resolve()) or not dependency.is_file():
                raise ValueError(f'Missing or external module: {match[3]}')
            return match[1] + match[3] + '?v=' + module(dependency) + match[4]
        path.write_text(imports.sub(rewrite, path.read_text()))
        visiting.remove(path)
        done[path] = digest(path)
        return done[path]
    for path in root.glob('*.js'):
        module(path.resolve())

    def reference(value, base):
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc or value.startswith(('#', '/')):
            return value
        path = (base / parsed.path).resolve()
        if not path.is_file() or not path.is_relative_to(root.resolve()):
            return value
        query = '&'.join(p for p in parsed.query.split('&') if p and not p.startswith('v='))
        return parsed.path + '?' + (query + '&' if query else '') + 'v=' + digest(path) + ('#' + parsed.fragment if parsed.fragment else '')
    for path in root.rglob('*.css'):
        path.write_text(re.sub(r'url\(([^)]*)\)', lambda m: 'url(' + repr(reference(m[1].strip().strip('\'"'), path.parent)) + ')', path.read_text()))
    revision=hashlib.sha256(json.dumps({'assets':versions,'modules':{str(p.relative_to(root.resolve())):v for p,v in done.items()}},sort_keys=True).encode()).hexdigest()[:24]
    manifest = '<script>window.__SSK_RENDER_REVISION__='+json.dumps(revision)+';window.__SSK_ASSET_VERSIONS__=' + json.dumps(versions, separators=(',', ':')).replace('<', '\\u003c') + ';</script>'
    for path in root.glob('*.html'):
        html = re.sub(r'(\b(?:src|href)=[\'"])([^\'"]+)([\'"])', lambda m: m[1] + reference(m[2], path.parent) + m[3], path.read_text())
        path.write_text(html.replace('</head>', manifest + '\n</head>'))
    return versions
