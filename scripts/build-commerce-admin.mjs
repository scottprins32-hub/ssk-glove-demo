import {build} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({configFile:false,root,build:{outDir:'glove_builder/customiser',emptyOutDir:false,lib:{entry:root+'scripts/merchant-auth-entry.js',formats:['es'],fileName:()=> 'merchant-auth.bundle.js'},minify:true}});
