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
const {WEBS,WEB_REFERENCES}=await import(new URL('glove-catalog.js',process.argv[2]));
const groups={};
for(const view of ['back','palm','thumb','pinky']) {
 const file=view==='back'?'glove':view;
 const data=JSON.parse(await readFile(new URL('assets/'+file+'-data.json',process.argv[2])));
 groups[view]=renderAssets(data,true).map(key=>data.assets[key]);
 // The traced native H palm uses its empty plate and individual cutouts.
 // Keep the old full-photo plate available as an individual fallback for
 // alternate webs, without also duplicating it in the eager native pack.
 if((view==='palm' && data.nativePalmTrace)||(view==='back' && data.nativeBackTrace))groups[view]=groups[view].filter(name=>name!==data.assets.glove);
}
groups['web-options']=[...WEBS.filter(w=>w.sizes.includes('11.75"')),...WEB_REFERENCES].filter(w=>w.img?.endsWith('.jpg')).map(w=>w.img);
console.log(JSON.stringify(groups));"""
    result=subprocess.run(['node','--input-type=module','-e',code,
        (root/'glove-engine.js').resolve().as_uri(),root.resolve().as_uri()+'/'],check=True,capture_output=True,text=True)
    groups=json.loads(result.stdout)
    # Group the small thumb masks; large plates keep their individual cache
    # entries. This removes request overhead without duplicating enough bytes
    # to exceed the host's 50 MB archive limit. Nothing is transcoded.
    groups['thumb']=[name for name in groups['thumb'] if (root/name).stat().st_size<=32_768]
    # Large full-resolution textures/badges already have individual versioned
    # URLs. Avoid storing a second copy inside the eager back pack; the loader
    # requests those original files directly, without transcoding any pixels.
    groups['back']=[name for name in groups['back'] if (root/name).stat().st_size<=131_072]
    # Shared HD surfaces are used by every view. Keep one individually cached
    # original rather than moving their duplicate from the back pack to palm.
    data=json.loads((root/'assets/glove-data.json').read_text())
    surfaces={data['assets'][key] for key in ['_hdLeather','_hdLace'] if key in data['assets']}
    groups={view:[name for name in names if name not in surfaces] for view,names in groups.items()}
    groups['back'].extend(str(p.relative_to(root)) for p in (root/'assets/flags').glob('*.svg'))
    return write_packs(root,groups)
