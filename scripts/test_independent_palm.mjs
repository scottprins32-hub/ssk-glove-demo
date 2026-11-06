import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as catalogue from '../glove_builder/customiser/glove-catalog.js';
import {markPicked,linkedFields,cleanPicked,chosenColour} from '../glove_builder/customiser/picked.js';
import {normaliseMaterials} from '../glove_builder/customiser/commerce-pricing.js';
import {validateDesign} from '../glove_builder/customiser/commerce-contract.js';
import {encodeV4,decodeV4} from '../glove_builder/customiser/refcode.js';
const app=await readFile(new URL('../glove_builder/customiser/app.js',import.meta.url),'utf8');
const data=JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/glove-data.json',import.meta.url)));
const colors=()=>Object.fromEntries(catalogue.COLOUR_ORDER.map(f=>[f,'10']));

test('actual palette setter edits and marks Back 2 and palm independently',()=>{
 const fn=app.slice(app.indexOf('function setColour('),app.indexOf('/* Paint mode:'));
 const S={startId:'blank',colors:{...colors(),back2:'32',palm:'10'},picked:{}};
 const context={S,held:null,snapshot(){},indexIsOnePiece:()=>false,middleIsOnePiece:()=>false,markPicked,linkedFields,draw(){},paint(){}};
 vm.runInNewContext(fn+';globalThis.edit=setColour;',context);
 context.edit('back2','70');assert.equal(S.colors.palm,'10');assert.equal(S.colors.back2,'70');
 assert.equal(chosenColour(S,'palm'),null);assert.equal(chosenColour(S,'back2'),'70');
 context.edit('palm','20');assert.equal(S.colors.back2,'70');assert.equal(S.colors.palm,'20');assert.equal(S.colors.laces,'10');
 assert.deepEqual(linkedFields('palm',false,false),[]);assert.deepEqual(linkedFields('back2',false,false),[]);
});

test('saved drafts, shared designs and reference codes retain two different colours',()=>{
 const fn=app.slice(app.indexOf('function cleanState('),app.indexOf('// A syntactically valid JSON object'));
 const context={...catalogue,DATA:data,VIEW_KEYS:{back:1,palm:1,thumb:1,pinky:1},cleanMaterials:normaliseMaterials,cleanPicked,coupleFlagPanels(){}};
 vm.runInNewContext(fn+';globalThis.clean=cleanState;',context);
 const draft={hand:'RHT',size:'11.75"',pad:'None',webType:'H-Web',bullet:7,colors:{...colors(),back2:'70',palm:'20'},materials:{back1:'snakeskin'}};
 const cleaned=context.clean(draft);assert.equal(cleaned.colors.back2,'70');assert.equal(cleaned.colors.palm,'20');assert.equal(cleaned.materials.belt,'snakeskin');
 const valid=validateDesign(cleaned),decoded=decodeV4(encodeV4(valid,data.bullets[7].name));
 assert.equal(decoded.colors.back2,'70');assert.equal(decoded.colors.palm,'20');assert.equal(decoded.materials.belt,'snakeskin');
 assert.equal(draft.materials.belt,undefined);
});
