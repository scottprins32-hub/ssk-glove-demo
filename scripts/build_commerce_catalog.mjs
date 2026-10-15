import {readFile,writeFile} from 'node:fs/promises';
import {UNCONFIRMED_BULLETS} from '../glove_builder/customiser/glove-catalog.js';
const target=new URL('../glove_builder/customiser/commerce-catalog.js',import.meta.url);
const data=JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/glove-data.json',import.meta.url)));
const catalog={palettes:Object.fromEntries(Object.entries(data.palettes).map(([key,rows])=>[key,rows.map(([id,name])=>({id,name}))])),
  bullets:data.bullets.map((b,index)=>({index,name:b.name,active:b.active!==false&&!UNCONFIRMED_BULLETS.includes(b.name)}))};
const text='// Generated from current renderer metadata; run scripts/build_commerce_catalog.mjs.\nexport const COMMERCE_CATALOG = '+JSON.stringify(catalog,null,2)+';\n';
if(process.argv.includes('--check')) {
  if(await readFile(target,'utf8')!==text) throw Error('Commerce catalogue is stale');
} else await writeFile(target,text);
