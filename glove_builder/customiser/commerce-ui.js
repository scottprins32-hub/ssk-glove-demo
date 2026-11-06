import {navigateCheckout} from './embed-context.js';
import {validateDesign,safeCheckoutUrl} from './commerce-contract.js';
import {api,errorMessage,saveCheckoutKey,getCheckoutKey,checkoutStorageAvailable,orderItemsFragment,loadCart,addToCart,removeFromCart,formatMoney,MAX_ORDER_ITEMS,TEST_MODE} from './commerce-client.js';
import {quoteDesign} from './commerce-pricing.js';
/* The order panel on the review step. One glove goes straight to the order
   page; a team order parks each saved glove (its own snapshot, its own
   code) and builds the next, and the order page then lists them all. */
export function mountCommerce(host,{lang,complete,capture,getDesign,onParked}) {
  let busy=false, cachedSnapshot=null;
  const en=lang==='en',panel=document.createElement('section');panel.className='commerce-panel';
  const tr=(nl,english)=>en?english:nl;
  const heading=document.createElement('h3');heading.textContent=tr('Ontwerp bewaren en bestellen','Save your design and order');
  const lead=document.createElement('p');lead.className='note';lead.textContent=tr(
    'Bewaar een vaste versie van je keuzes. Iedereen met je ontwerplink kan die bekijken. Voeg je handschoen toe aan de SSK-winkelmand. Je gegevens, verzendkosten en betaling regel je daar. Meer handschoenen in één bestelling? Bewaar deze en bouw de volgende.',
    'Save a fixed version of your choices. Anyone with your design link can view it. Add your glove to the SSK basket. Enter your details, choose shipping and pay there. Several gloves in one order? Save this one and build the next.');
  const label=document.createElement('label');label.className='commerce-confirm';const confirm=document.createElement('input');confirm.type='checkbox';
  label.append(confirm,document.createTextNode(tr(' Ik heb mijn keuzes en personalisatie gecontroleerd.',' I have checked my choices and personalization.')));
  const status=document.createElement('p');status.className='note';status.setAttribute('role','status');
  const acts=document.createElement('div');acts.className='commerce-actions';
  const button=document.createElement('button');button.type='button';button.className='btn btn-primary';
  button.dataset.orderSave='true';
  const another=document.createElement('button');another.type='button';another.className='btn btn-ghost';
  another.textContent=tr('Bewaren en nog een handschoen bouwen','Save and build another glove');
  const existingBasket=document.createElement('button');existingBasket.type='button';existingBasket.className='btn btn-ghost';existingBasket.hidden=true;
  existingBasket.textContent=tr('Bestaande SSK-winkelmand openen','Open existing SSK basket');
  const cartBox=document.createElement('div');cartBox.className='commerce-cart';
  const orderLink=document.createElement('a');orderLink.className='btn btn-ghost';
  if(TEST_MODE){const test=document.createElement('p');test.className='note note-warn';test.textContent=tr('Testmodus — geen echte bestelling of betaling.','Test mode — no real order or payment.');panel.append(test);}

  function paintCart() {
    const cart=loadCart();cartBox.replaceChildren();
    button.textContent=tr('Aan winkelmandje toevoegen','Add to basket');
    another.hidden=cart.length>=MAX_ORDER_ITEMS-1;
    button.disabled=!complete||busy||(cart.length>=MAX_ORDER_ITEMS&&!cart.some(i=>i.id===cachedSnapshot?.saved.id));
    if(cart.length>=MAX_ORDER_ITEMS)status.textContent=tr('Je bestelling bevat maximaal zes handschoenen. Bekijk je bestelling of verwijder eerst een handschoen.','Your order holds up to six gloves. Review your order or remove a glove first.');
    if(!cart.length){orderLink.hidden=true;return;}
    const h=document.createElement('p');h.className='commerce-cart-head';
    h.textContent=tr(`Al in je bestelling: ${cart.length} ${cart.length===1?'handschoen':'handschoenen'}`,`Already in your order: ${cart.length} ${cart.length===1?'glove':'gloves'}`);
    const ul=document.createElement('ul');ul.className='commerce-cart-list';
    cart.forEach((item,i)=>{
      const li=document.createElement('li');
      const code=document.createElement('code');code.textContent=item.reference||item.id;
      const price=document.createElement('span');price.textContent=formatMoney(item.total||0,lang);
      const rm=document.createElement('button');rm.type='button';rm.className='btn-link';rm.textContent=tr('Verwijder','Remove');
      rm.setAttribute('aria-label',tr(`Handschoen ${i+1} uit de bestelling halen`,`Remove glove ${i+1} from the order`));
      rm.onclick=()=>{removeFromCart(item.id);paintCart();};
      li.append(document.createTextNode(`${i+1}. `),code,price,rm);ul.append(li);
    });
    orderLink.hidden=false;orderLink.href='./order.html#'+orderItemsFragment(cart);
    orderLink.textContent=tr('Bestelling bekijken zonder deze handschoen','Review the order without this glove');
    cartBox.append(h,ul);
  }
  async function save() {
    if(busy||!complete)return null;
    let design;
    try {design=validateDesign(getDesign());}
    catch(error) {status.textContent=errorMessage(error,lang);return null;}
    const signature=JSON.stringify(design);
    const reuse=cachedSnapshot?.signature===signature;
    if(loadCart().length>=MAX_ORDER_ITEMS&&!reuse){paintCart();return null;}
    if(!confirm.checked){status.textContent=tr('Bevestig eerst dat je het ontwerp hebt gecontroleerd.','Please confirm that you reviewed your design.');confirm.focus();return null;}
    busy=true;button.disabled=another.disabled=confirm.disabled=true;status.textContent=tr('De vier aanzichten worden klaargezet…','Preparing the four views…');
    try {
      if(!checkoutStorageAvailable())throw Object.assign(Error(),{code:'checkout_storage_required'});
      if(reuse)return cachedSnapshot.saved;
      const previews=await capture();
      if(JSON.stringify(validateDesign(getDesign()))!==signature)throw Object.assign(Error(),{code:'invalid_design'});
      status.textContent=tr('Je vaste ontwerpversie wordt opgeslagen…','Saving your fixed design…');
      const saved=await api('create',{design,previews,confirmed:true});
      saveCheckoutKey(saved.id,saved.checkoutToken);
      cachedSnapshot={signature,saved:{...saved,total:quoteDesign(design).total}};
      return cachedSnapshot.saved;
    } catch(error) {
      console.warn('SSK order save:',error.code||error.message||'unavailable');
      status.textContent=errorMessage(error,lang)+(TEST_MODE?' ['+(error.code||error.message||'unavailable')+']':'');
      busy=false;button.disabled=another.disabled=confirm.disabled=false;return null;
    }
  }
  button.disabled=!complete;another.disabled=!complete;
  if(!complete)status.textContent=tr('Rond eerst de ontbrekende ontwerpkeuzes af.','Complete the required design choices first.');
  button.onclick=async()=>{
    const saved=await save();if(!saved)return;
    try {
      const items=addToCart(saved);
      // An older session's saved glove needs its own checkout authority;
      // the order page can safely copy that snapshot before proceeding.
      if(items.some(i=>!getCheckoutKey(i.id))) { location.assign('./order.html#'+orderItemsFragment(items)); return; }
      status.textContent=tr('Je handschoen wordt aan de SSK-winkelmand toegevoegd…','Adding your glove to the SSK basket…');
      const result=await api('checkout',{items:items.map(i=>({id:i.id,token:getCheckoutKey(i.id)})),destination:'basket'});
      navigateCheckout(safeCheckoutUrl(result.url));
    } catch(error) { status.textContent=errorMessage(error,lang);if(error.code==='cart_already_open'&&error.basketUrl){const url=safeCheckoutUrl(error.basketUrl);existingBasket.hidden=false;existingBasket.onclick=()=>navigateCheckout(url);} }
    finally {busy=false;button.disabled=another.disabled=confirm.disabled=false;paintCart();}
  };
  another.onclick=async()=>{
    const saved=await save();if(!saved)return;
    try {
    const items=addToCart(saved);
    status.textContent=tr(`Handschoen ${items.length} bewaard als ${saved.reference}. Bouw nu de volgende.`,`Glove ${items.length} saved as ${saved.reference}. Now build the next one.`);
    button.disabled=another.disabled=confirm.disabled=false;confirm.checked=false;paintCart();
    cachedSnapshot=null;
    if(onParked)onParked(saved,items);
    } catch(error) {status.textContent=errorMessage(error,lang);}
    finally {busy=false;button.disabled=another.disabled=confirm.disabled=false;paintCart();}
  };
  acts.append(button,another,orderLink,existingBasket);
  panel.append(heading,lead,cartBox,label,acts,status);host.append(panel);paintCart();
}
