import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const report=JSON.parse(await readFile('outputs/ccv-commerce-r01/live-atomic-output.json','utf8'));
assert.equal(report.error,undefined);for(const field of ['claims','admissions','resets']){assert.equal(report[field].length,5);assert.ok(report[field].every(r=>r.success===true&&r.has_more===false));}
const sum=key=>report[key].reduce((n,x)=>n+x.updated,0);
assert.equal(sum('claims'),1);assert.equal(sum('admissions'),3);assert.equal(sum('resets'),1);assert.equal(report.finalRate.uses,3);assert.equal(report.finalDraft.status,'submitting');assert.ok(report.cleanup.every(x=>x.deleted));
console.log('Opened live platform response evidence: 5 claim attempts / 1 winner; 5 admission attempts / 3 at limit; 5 resets / 1 reset; synthetic fixtures removed.');
