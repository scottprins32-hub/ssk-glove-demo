// Owned-app measurements only. No browser debugging, cache clearing, remote
// telemetry or draft storage. Do not submit orders from this measurement page. Unique URL keys simulate an empty cache.
const runner=document.querySelector('#runner'), status=document.querySelector('#status');
const runs=[];
const aliases=await (await fetch('performance-modules.json',{cache:'no-store'})).json();
let current, nonce='';
function observer(config) {
  performance.setResourceTimingBufferSize(5000);
  const start=performance.now();
  let pending={label:'initial',start:config.direct?0:start,clicked:true}, serial=0;
  const errors=[];
  addEventListener('error',e=>errors.push(e.message||'resource error'));
  addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  function send(detail){
    if(config.direct){
      let report=document.querySelector('#performance-report');
      if(!report){report=document.createElement('pre');report.id='performance-report';report.hidden=true;document.body.append(report);}
      const entries=JSON.parse(report.textContent||'[]');entries.push(detail);
      report.textContent=JSON.stringify(entries);report.dataset.count=String(entries.filter(e=>e.entry).length);
    }else parent.postMessage({sskTiming:config.id,...detail},config.origin);
  }
  const begin=e=>{
    const b=e.target.closest?.('#steps button,#stageview button'+(location.search.includes('quality=1')?',#body button':''));
    if(!b)return;
    const view=b.dataset.view;
    const step=b.parentElement.id==='steps'?[...b.parentElement.children].indexOf(b):undefined;
    const label=view?'view:'+view:(step===undefined?'choice:':'step:')+b.textContent.trim();
    if(pending?.label===label&&e.type!=='click')return;
    const now=performance.now(),intentStart=pending?.label===label?pending.intentStart:now;
    pending={label,start:now,intentStart,clicked:e.type==='click',view,step};serial++;
  };
  document.addEventListener('pointerover',begin,true);
  document.addEventListener('click',begin,true);
  let latest, polling=false;
  const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0;};
  const complete=()=>pending?.clicked&&latest?.ready&&latest.flagsReady&&latest.reviewReady&&document.fonts.status==='loaded'
    && (!pending.view||pending.view===latest.view)
    && (pending.step===undefined||pending.step===latest.step)
    && ![...document.querySelectorAll('[data-preview-pending]')].some(visible)
    && ![...document.querySelectorAll('img')].some(e=>visible(e)&&(!e.complete||!e.naturalWidth));
  function poll(){
    if(!pending){polling=false;return;}
    if(!complete()){requestAnimationFrame(poll);return;}
    const token=serial;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(token!==serial||!pending||!complete()){requestAnimationFrame(poll);return;}
      const ended=performance.now();
      const entry={label:pending.label,ms:ended-pending.start,
        ...(pending.intentStart===undefined?{}:{intentMs:ended-pending.intentStart}),...latest,
        navigation:performance.getEntriesByType('navigation').map(n=>({ttfb:n.responseStart,htmlEnd:n.responseEnd,bytes:n.transferSize,type:n.type})),
        viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,
        resourceCount:performance.getEntriesByType('resource').length,
        transferred:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0),
        resources:performance.getEntriesByType('resource').map(r=>({name:r.name,start:r.startTime,duration:r.duration,bytes:r.transferSize})),errors:[...errors]};
      pending=null;polling=false;
      if(location.search.includes('quality=1')){
        const canvas=document.querySelector('#glove');
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        crypto.subtle.digest('SHA-256',pixels).then(buf=>{entry.pixelHash=[...new Uint8Array(buf)].map(n=>n.toString(16).padStart(2,'0')).join('');send({entry});});
      }else send({entry});
    }));
  }
  window.__SSK_PERF__={nonce:config.nonce,protocol:config.protocol,failure(error){send({error:String(error?.stack||error)});},ready(state){
    latest=state;if(pending&&!polling){polling=true;requestAnimationFrame(poll);}
  }};
}
function output(){document.querySelector('#report').textContent=JSON.stringify(runs,null,2);}
addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==runner.contentWindow||e.data.sskTiming!==current?.id)return;
  if(e.data.error){current.error=e.data.error;output();status.textContent=e.data.error;return;}
  const entry=e.data.entry;
  if(!entry)return;
  if(entry.label==='initial')entry.ms=performance.now()-current.start;
  current.entries.push(entry);output();status.textContent=entry.label+' '+Math.round(entry.ms)+' ms';
  document.querySelector('#report').dataset.count=String(current.entries.length);
});
async function run(cold){
  document.querySelector('#report').dataset.count='0';
  if(cold||!nonce)nonce=crypto.randomUUID();
  const id=crypto.randomUUID();
  current={id,mode:cold?'cache-busted cold':'cached reload',nonce,date:new Date().toISOString(),entries:[],start:performance.now()};runs.push(current);
  status.textContent='Loading…';output();
  const url=path=>{const u=new URL(path,location.href);u.searchParams.set('bench',nonce);return u.href;};
  const response=await fetch(url('index.html'));
  if(!response.ok)throw new Error('Live index HTTP '+response.status);
  const html=await response.text();
  const doc=new DOMParser().parseFromString(html,'text/html');
  const base=doc.createElement('base');base.href=new URL('./',location.href).href;doc.head.prepend(base);
  // Keep all existing content versions and route aliases to a single module URL.
  const imports={};for(const [alias,path] of Object.entries(aliases))imports[new URL(alias,base.href).href]=url(path);
  const map=doc.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});
  const setup=doc.createElement('script');setup.textContent='('+observer.toString()+')('+JSON.stringify({id,nonce,origin:location.origin,protocol:location.protocol})+');';
  doc.head.insertBefore(setup,base.nextSibling);doc.head.insertBefore(map,setup.nextSibling);
  for(const node of doc.querySelectorAll('link[href],script[src]')){
    const attr=node.tagName==='LINK'?'href':'src';
    const source=node.getAttribute(attr);
    if(source&&!/^(?:https?:)?\/\//.test(source))node.setAttribute(attr,url(node.tagName==='SCRIPT'||node.rel==='modulepreload'?source.split('?')[0]:source));
  }
  // Fonts are dependencies of CSS, so route them through the same cold key.
  const font=doc.querySelector('link[href*="tokens/fonts.css"]');
  if(font){
    const fontURL=font.href;
    const css=await (await fetch(fontURL)).text();
    const style=doc.createElement('style');style.textContent=css.replace(/url\((['"]?)([^)'" ]+)\1\)/g,(_,q,path)=>'url("'+url(new URL(path,fontURL).href)+'")');font.replaceWith(style);
  }
  runner.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
}
document.querySelector('#cold').onclick=()=>run(true).catch(e=>status.textContent=e.message);
document.querySelector('#warm').onclick=()=>run(false).catch(e=>status.textContent=e.message);
await run(true);
