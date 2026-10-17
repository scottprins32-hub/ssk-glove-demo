"""Bundle original image bytes into a few requests, without transcoding pixels."""
import json
import pathlib
import subprocess


def write_packs(root, groups):
    root=pathlib.Path(root)
    folder=root/'assets/runtime';folder.mkdir(parents=True,exist_ok=True)
    entries={}
    for view, names in groups.items():
        payload=bytearray();pack=f'assets/runtime/{view}.pack'
        for name in dict.fromkeys(names):
            if name in entries or name.startswith('data:'):continue
            path=(root/name).resolve()
            if not path.is_relative_to(root.resolve()) or not path.is_file():
                raise ValueError('Missing or external packed asset: '+name)
            data=path.read_bytes()
            suffix=path.suffix.lower()
            mime={'.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'}.get(suffix)
            if not mime:raise ValueError('Unsupported packed image: '+name)
            entries[name]={'pack':pack,'offset':len(payload),'length':len(data),'type':mime}
            payload.extend(data)
        (root/pack).write_bytes(payload)
    (folder/'manifest.json').write_text(json.dumps(entries,separators=(',',':')))
    return entries


def build_packs(root):
    root=pathlib.Path(root)
    # Use the actual renderer dependency traversal rather than a second copy of
    # its ownership rules. Only native bodies are packed; alternate webs stay lazy.
    code="""import {readFile} from 'node:fs/promises';
const {renderAssets}=await import(process.argv[1]);
const groups={};
for(const view of ['back','palm','thumb','pinky']) {
 const file=view==='back'?'glove':view;
 const data=JSON.parse(await readFile(new URL('assets/'+file+'-data.json',process.argv[2])));
 groups[view]=renderAssets(data,true).map(key=>data.assets[key]);
}
console.log(JSON.stringify(groups));"""
    result=subprocess.run(['node','--input-type=module','-e',code,
        (root/'glove-engine.js').resolve().as_uri(),root.resolve().as_uri()+'/'],check=True,capture_output=True,text=True)
    groups=json.loads(result.stdout)
    # The thumb stays individually cached to keep the full-quality host archive
    # below Base44's 50 MB limit; its requests are multiplexed by the loader.
    groups.pop('thumb')
    groups['back'].extend(str(p.relative_to(root)) for p in (root/'assets/flags').glob('*.svg'))
    return write_packs(root,groups)
