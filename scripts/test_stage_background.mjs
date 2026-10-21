import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stageBackground} from '../glove_builder/customiser/stage-background.js';
const l = hex => {
 const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
};
const ratio=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
test('every catalogue colour alone gets at least 3:1 nominal material contrast',async()=>{
 const data=JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/glove-data.json',import.meta.url)));
 for(const c of Object.values(data.palettes).flat()){
  const backdrop=stageBackground([c[2]]);
  assert.match(backdrop,/^#([0-9a-f]{2})\1\1$/);
  assert.ok(ratio(c[2],backdrop)>=3,`${c[1]} ${c[2]} / ${backdrop}`);
 }
});
test('white uses medium grey and dark colours retain a light stage',()=>{
 assert.equal(stageBackground(['#ffffff']),'#949494');
 assert.equal(stageBackground(['#101010']),'#ececec');
 assert.ok(ratio('#ffffff',stageBackground(['#ffffff','#101010']))>=3);
 assert.ok(ratio('#101010',stageBackground(['#ffffff','#101010']))>=3);
});
test('mixed materials use the strongest minimum if 3:1 is impossible',()=>{
 const colors=['#ff0000','#ffffff','#101010'];
 const selected=stageBackground(colors), weakest=Math.min(...colors.map(c=>ratio(c,selected)));
 for(let v=64;v<=236;v+=4){
  const bg='#'+v.toString(16).repeat(3);
  assert.ok(Math.min(...colors.map(c=>ratio(c,bg)))<=weakest+1e-12);
 }
 assert.equal(stageBackground(colors),stageBackground(colors.reverse()));
});
test('invalid/unselected values are safe, and choosing a background never mutates input',()=>{
 const colors=Object.freeze(['#112233',undefined,'bad',null]);
 assert.equal(stageBackground(colors),stageBackground(['#112233']));
 assert.equal(stageBackground([undefined]),'#a0a0a0');
});
