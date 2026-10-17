import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {COLOUR_ORDER} from '../glove_builder/customiser/glove-catalog.js';
import {API_ENDPOINT,API_REVISION} from '../glove_builder/customiser/commerce-config.js';
const report={endpoint:API_ENDPOINT,revision:API_REVISION,date:new Date().toISOString(),checks:[],syntheticIds:[]};
async function call(action,input={},expected=200){const r=await fetch(API_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})}),body=await r.json();assert.equal(r.status,expected,JSON.stringify(body));report.checks.push({action,status:r.status,error:body.error});if(expected===200)assert.equal(body.apiRevision,API_REVISION);return body;}
const design={hand:'RHT',size:'11.75"',webType:'H-Web',pad:'None',bullet:7,colors:Object.fromEntries(COLOUR_ORDER.map(f=>[f,'10'])),materials:{back3:'snakeskin'},flag:'Japan',flagPosition:'middle',thumbText:'QA',thumbFont:'Block',thumbMain:'10',thumbOutline:'inactive',lang:'en'};
const config=await call('config');assert.equal(config.connected,false,'Smoke test must run before CCV keys are enabled');
const saved=await call('create',{design,confirmed:true,previews:['back','palm','thumb','pinky'].map(view=>({view,available:false,notes:['Synthetic API smoke test.']}))});report.syntheticIds.push(saved.id);
const read=await call('read',{id:saved.id,token:saved.viewToken});assert.equal(read.quote.total,37995);assert.equal(read.design.thumbText,'QA');assert.equal(read.design.thumbOutline,null);assert.equal(read.checkout_hash,undefined);assert.equal(read.checkout_url,undefined);
await call('read',{id:saved.id,token:saved.checkoutToken},404);
await call('checkout',{id:saved.id,token:saved.viewToken},404);
await call('checkout',{id:saved.id,token:saved.checkoutToken},503);
const state=await call('status',{id:saved.id,token:saved.checkoutToken});assert.equal(state.status,'draft');assert.equal(state.paid,false);
const copy=await call('copy',{id:saved.id,token:saved.viewToken,confirmed:true});report.syntheticIds.push(copy.id);assert.notEqual(copy.id,saved.id);assert.notEqual(copy.checkoutToken,saved.checkoutToken);
const copied=await call('read',{id:copy.id,token:copy.viewToken});assert.deepEqual(copied.design,read.design);
await call('admin-list',{},403);
const forbidden=await fetch(API_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.invalid'},body:'{"action":"config"}'});assert.equal(forbidden.status,403);report.checks.push({action:'disallowed-origin',status:forbidden.status});
report.quote=read.quote;report.tokensRecorded=false;report.passed=true;
await writeFile('outputs/ccv-commerce-r01/HOSTED-SMOKE.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
