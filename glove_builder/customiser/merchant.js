import {createClient} from './merchant-auth.bundle.js';
import {APP_ID,API_REVISION} from './commerce-config.js';
import {displayDraft,node} from './commerce-display.js';
import {errorMessage,formatMoney} from './commerce-client.js';
const client=createClient({appId:APP_ID,appBaseUrl:'https://ssk-glove-configurator-da8db964.base44.app',requiresAuth:false});
const status=document.querySelector('#status'),actions=document.querySelector('#merchant-actions'),list=document.querySelector('#merchant-list'),detail=document.querySelector('#merchant-detail');
async function call(action,input={}) {
 try {const response=await client.functions.invoke('ssk-commerce-v11',{action,...input});const result=response.data??response;
 if(result.apiRevision!==API_REVISION)throw Object.assign(Error(),{code:'service_unavailable'});
 if(result.error)throw Object.assign(Error(result.error),{code:result.error});return result;
 }catch(error){throw Object.assign(Error(),{code:error.code||error.response?.data?.error||'service_unavailable'});}
}
async function open(id){
 const draft=await call('admin-read',{id});history.replaceState(null,'','#'+id);const aside=displayDraft(draft,detail);
 const label=node('label','CCV-bestelnummer voor controle'),input=node('input');input.type='text';input.inputMode='numeric';input.pattern='[0-9]+';label.append(input);
 const reconcile=node('button','Bestaande CCV-bestelling controleren','btn');reconcile.onclick=async()=>{
  if(!/^[1-9][0-9]*$/.test(input.value.trim())){status.textContent='Vul een geldig CCV-bestelnummer in.';input.focus();return;}
  reconcile.disabled=true;try{const result=await call('admin-reconcile',{id,orderId:input.value.trim()});status.textContent='CCV-status: '+result.status+' · betaald: '+(result.paid?'ja':'nee');await refresh();}catch(e){status.textContent=errorMessage(e);}finally{reconcile.disabled=false;}
 };
 aside.append(node('p','Controle maakt geen nieuwe CCV-bestelling aan. De ontwerpcode, valuta en het bedrag moeten overeenkomen.','note'),label,reconcile);
}
async function refresh(){
 const {drafts}=await call('admin-list');list.replaceChildren();const table=node('table',null,'commerce-spec');
 const head=node('tr');for(const label of ['Ontwerp','Status','Bedrag','CCV'])head.append(node('th',label));table.append(head);
 for(const d of drafts){const row=node('tr'),cell=node('td'),button=node('button',d.reference,'btn');button.onclick=()=>open(d.id).catch(e=>{status.textContent=errorMessage(e);});cell.append(button);row.append(cell,node('td',d.status+(d.lastError?' · controle nodig':'')),node('td',formatMoney(d.total)),node('td',String(d.ccvOrderId||'—')));table.append(row);}list.append(table);
}
async function start(){
 let user;try{user=await client.auth.me();}catch{}
 if(user?.role!=='admin'){
  status.textContent='Alleen SSK-beheerders hebben toegang tot ontwerpen en bestelstatussen.';
  const login=node('button','Inloggen als beheerder','btn btn-primary');login.onclick=()=>client.auth.redirectToLogin(location.href);actions.append(login);return;
 }
 status.textContent='Ingelogd als SSK-beheerder.';
 const reload=node('button','Vernieuwen','btn');reload.onclick=()=>refresh().catch(e=>{status.textContent=errorMessage(e);});
 const check=node('button','Winkelaansluiting controleren','btn');check.onclick=async()=>{check.disabled=true;try{const c=await call('admin-check');status.textContent=c.connected?'CCV-product en prijs gecontroleerd. Bestellen: '+(c.checkoutEnabled?'INGESCHAKELD':'UIT — wacht op goedkeuring van Pim')+'. Beheertests: '+(c.acceptanceTestsEnabled?'aan':'uit')+'.':'API-sleutels ontbreken. Opslaan werkt; afrekenen blijft uitgeschakeld.';}catch(e){status.textContent=errorMessage(e);}finally{check.disabled=false;}};
 actions.append(reload,check);await refresh();const id=location.hash.slice(1);if(/^[a-zA-Z0-9_-]{8,80}$/.test(id))await open(id);
}
start().catch(e=>{status.textContent=errorMessage(e);});
