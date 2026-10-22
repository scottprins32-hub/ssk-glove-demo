import {API_ENDPOINT,APP_ID,TEST_MODE,API_REVISION} from './commerce-config.js';
export {TEST_MODE};
const messages={
  checkout_approval_pending:['Bestellen is nog niet geopend. Je ontwerp blijft bewaard; SSK geeft bestellen vrij na goedkeuring.','Ordering is awaiting SSK approval. Your saved design remains available.'],
  checkout_storage_required:['Sta sessieopslag toe om veilig af te rekenen, of open de ontwerplink in een andere browser. Bekijken en downloaden blijven beschikbaar.','Allow session storage for secure checkout, or open this design link in another browser. Viewing and downloading remain available.'],
  already_ordered:['Dit ontwerp is al overgedragen als bestelling. Controleer je bestelling bij SSK.','This design has already been ordered. Check your order with SSK.'],
  checkout_not_connected:['Afrekenen wordt binnenkort beschikbaar. Je ontwerp is veilig opgeslagen; je kunt het bewaren of downloaden.','Checkout is not connected yet. Your design is saved; you can keep or download it.'],
  checkout_processing:['Je winkelwagen wordt klaargezet. Wacht even en controleer opnieuw.','Your basket is being prepared. Please check again shortly.'],
  checkout_needs_review:['De winkel heeft mogelijk al een winkelwagen aangemaakt. Maak geen tweede bestelling. Bewaar dit ontwerp; SSK kan de aansluiting controleren.','The shop may already have created a basket. Keep this design; SSK can check the connection before another attempt.'],
  shop_price_changed:['De winkelprijs is gewijzigd. SSK moet de prijs controleren voordat je kunt afrekenen.','The shop price has changed. SSK needs to check it before checkout.'],
  flag_requires_confirmation:['Deze eigen vlag moet SSK eerst bevestigen. Bewaar je ontwerp en neem contact op met SSK.','SSK must confirm this custom flag first. Keep your design and contact SSK.'],
  design_expired:['Deze opgeslagen versie is verlopen. Open je bewaarde ontwerp in de ontwerper en sla een nieuwe versie op.','This saved version has expired. Open your saved design in the builder and save a new version.'],
  design_not_found:['Dit ontwerp is niet beschikbaar. Controleer of je de volledige ontwerplink hebt geopend.','This design is not available. Check that you opened its complete link.'],
  admin_required:['Log in als SSK-beheerder om dit overzicht te openen.','Sign in as an SSK administrator to view this page.'],
  too_many_designs:['Je hebt veel versies opgeslagen. Probeer het later opnieuw; je lokale ontwerp blijft bewaard.','You saved many versions. Try again later; your local design is still saved.'],
  service_unavailable:['Opslaan is tijdelijk niet bereikbaar. Je ontwerp blijft in deze browser bewaard. Probeer het opnieuw.','Saving is temporarily unavailable. Your design remains in this browser. Try again.'],
  invalid_design:['Rond de ontbrekende ontwerpkeuzes af en controleer je ontwerp opnieuw.','Complete the missing design choices and review your design again.']
};
export const errorMessage=(error,lang='nl')=>(messages[error?.code]||messages[String(error?.code||'').startsWith('invalid_design')?'invalid_design':'service_unavailable'])[lang==='en'?1:0];
export async function api(action,input={},options={}) {
  let response;
  try {response=await fetch(API_ENDPOINT,{method:'POST',cache:'no-store',credentials:'omit',signal:options.signal||AbortSignal.timeout(30000),
    headers:{'Content-Type':'application/json','X-App-Id':APP_ID,...(options.token?{Authorization:'Bearer '+options.token}:{})},
    body:JSON.stringify({action,...input})});}
  catch {throw Object.assign(Error('service_unavailable'),{code:'service_unavailable'});}
  let data;try{data=await response.json();}catch{throw Object.assign(Error('service_unavailable'),{code:'service_unavailable'});}
  if(!response.ok) throw Object.assign(Error(data.error||'service_unavailable'),{code:data.error||'service_unavailable'});
  if(data.apiRevision!==API_REVISION)throw Object.assign(Error('service_unavailable'),{code:'service_unavailable'});
  return data;
}
export const formatMoney=(cents,lang='nl')=>new Intl.NumberFormat(lang==='en'?'en-IE':'nl-NL',{style:'currency',currency:'EUR'}).format(cents/100);
export const orderFragment=(id,token)=>`${id}.${token}`;
export function readOrderFragment(hash=location.hash) {
  const m=/^#?([A-Za-z0-9_-]{8,80})\.([a-f0-9]{64})$/.exec(hash);
  return m?{id:m[1],token:m[2]}:null;
}
// Several gloves in one order: the fragment lists each snapshot with its own
// view capability, comma separated, in the order they go to the shop.
export const MAX_ORDER_ITEMS=6;
export const orderItemsFragment=items=>items.map(i=>orderFragment(i.id,i.token||i.viewToken)).join(',');
export function readOrderItems(hash=location.hash) {
  const parts=String(hash).replace(/^#/,'').split(',').filter(Boolean);
  if(!parts.length||parts.length>MAX_ORDER_ITEMS)return null;
  const items=parts.map(p=>readOrderFragment('#'+p));
  if(items.some(i=>!i)||new Set(items.map(i=>i.id)).size!==items.length)return null;
  return items;
}
/* The gloves parked for one order, on this device. Each entry is a saved
   snapshot with its own code; the checkout keys stay in sessionStorage. */
const CART_KEY='ssk-cart-v1';
export function loadCart() {
  try{const list=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(list)?list.filter(i=>i&&typeof i.id==='string'&&typeof i.viewToken==='string').slice(0,MAX_ORDER_ITEMS):[];}catch{return [];}
}
export function saveCart(items) {try{if(items.length)localStorage.setItem(CART_KEY,JSON.stringify(items.slice(0,MAX_ORDER_ITEMS)));else localStorage.removeItem(CART_KEY);}catch{}}
export function addToCart(item) {const items=loadCart().filter(i=>i.id!==item.id);items.push({id:item.id,viewToken:item.viewToken,reference:item.reference,total:item.total,when:new Date().toISOString()});saveCart(items);return items;}
export function removeFromCart(id) {const items=loadCart().filter(i=>i.id!==id);saveCart(items);return items;}
export function clearCart() {saveCart([]);}
export function saveCheckoutKey(id,key) {try{sessionStorage.setItem('ssk-checkout:'+id,key);}catch{}}
export function getCheckoutKey(id) {try{return sessionStorage.getItem('ssk-checkout:'+id);}catch{return null;}}
export function restoreLink(design) {
  const json=JSON.stringify({...design,schemaVersion:1,view:'back',personalCheck:false});
  const bytes=new TextEncoder().encode(json);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return './index.html#'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function checkoutStorageAvailable() {
  try{const key='ssk-checkout-probe';sessionStorage.setItem(key,'1');sessionStorage.removeItem(key);return true;}catch{return false;}
}
