import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGallery,saveGallery,addDesign,removeDesign} from '../glove_builder/customiser/gallery-store.js';
const design=i=>({id:String(i),name:'QA '+i,refcode:'SSK4-QA',savedAt:'2026-10-17T12:00:00Z',thumb:'data:image/jpeg;base64,/9j/AA==',state:'eyJmb28iOjF9'});
let data;
function storage(){data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
test('blocked storage must report save and delete failure, never success',()=>{storage();globalThis.localStorage.setItem=()=>{throw Error('QuotaExceededError');};assert.throws(()=>addDesign(design(1)));assert.throws(()=>saveGallery([]));assert.throws(()=>removeDesign('1'));assert.deepEqual(loadGallery(),[]);});
test('a failed gallery write preserves earlier saved designs',()=>{storage();addDesign(design(1));globalThis.localStorage.setItem=()=>{throw Error('QuotaExceededError');};assert.throws(()=>addDesign(design(2)));assert.deepEqual(loadGallery().map(d=>d.id),['1']);});
test('gallery filters malformed entries and retains valid neighbours',()=>{storage();data.set('ssk-gallery-v1',JSON.stringify([null,{},design(1),{...design(2),state:3}]));assert.deepEqual(loadGallery().map(d=>d.id),['1']);});
test('gallery stores forty newest designs, reopens exact state, deletes only selected',()=>{storage();for(let i=0;i<42;i++)addDesign(design(i));const saved=loadGallery();assert.equal(saved.length,40);assert.equal(saved[0].id,'41');assert.equal(saved[0].state,design(41).state);removeDesign('20');assert.equal(loadGallery().length,39);assert.equal(loadGallery()[0].id,'41');});
