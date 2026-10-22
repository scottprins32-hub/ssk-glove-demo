import {api,errorMessage,saveCheckoutKey,orderItemsFragment,loadCart,addToCart,removeFromCart,formatMoney,MAX_ORDER_ITEMS,TEST_MODE} from './commerce-client.js';
import {quoteDesign} from './commerce-pricing.js';
/* The order panel on the review step. One glove goes straight to the order
   page; a team order parks each saved glove (its own snapshot, its own
   code) and builds the next, and the order page then lists them all. */
export function mountCommerce(host,{lang,complete,capture,getDesign,onParked}) {
  const en=lang==='en',panel=document.createElement('section');panel.className='commerce-panel';
  const tr=(nl,english)=>en?english:nl;
  const heading=document.createElement('h3');heading.textContent=tr('Ontwerp bewaren en bestellen','Save your design and order');
  const lead=document.createElement('p');lead.className='note';lead.textContent=tr(
    'Bewaar een vaste versie van je keuzes. Iedereen met je ontwerplink kan die bekijken. Betalen en verzendkosten worden in de SSK-webshop afgehandeld. Meer handschoenen in één bestelling? Bewaar deze en bouw de volgende.',
    'Save a fixed version of your choices. Anyone with your design link can view it. Payment and shipping are handled in the SSK webshop. Several gloves in one order? Save this one and build the next.');
  const label=document.createElement('label');label.className='commerce-confirm';const confirm=document.createElement('input');confirm.type='checkbox';
  label.append(confirm,document.createTextNode(tr(' Ik heb mijn keuzes en personalisatie gecontroleerd.',' I have checked my choices and personalization.')));
  const status=document.createElement('p');status.className='note';status.setAttribute('role','status');
  const acts=document.createElement('div');acts.className='commerce-actions';
  const button=document.createElement('button');button.type='button';button.className='btn btn-primary';
  const another=document.createElement('button');another.type='button';another.className='btn btn-ghost';
  another.textContent=tr('Bewaren en nog een handschoen bouwen','Save and build another glove');
  const cartBox=document.createElement('div');cartBox.className='commerce-cart';
  const orderLink=document.createElement('a');orderLink.className='btn btn-ghost';
  if(TEST_MODE){const test=document.createElement('p');test.className='note note-warn';test.textContent=tr('Testmodus — geen echte bestelling of betaling.','Test mode — no real order or payment.');panel.append(test);}

  function paintCart() {
    const cart=loadCart();cartBox.replaceChildren();
    button.textContent=cart.length?tr(`Opslaan en bestelling bekijken (${cart.length+1} handschoenen)`,`Save and review order (${cart.length+1} gloves)`):tr('Opslaan en bestelling bekijken','Save and review order');
    another.hidden=cart.length>=MAX_ORDER_ITEMS-1;
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
    if(!confirm.checked){status.textContent=tr('Bevestig eerst dat je het ontwerp hebt gecontroleerd.','Please confirm that you reviewed your design.');confirm.focus();return null;}
    button.disabled=another.disabled=confirm.disabled=true;status.textContent=tr('De vier aanzichten worden klaargezet…','Preparing the four views…');
    try {
      const design=getDesign(),signature=JSON.stringify(design),previews=await capture();
      if(JSON.stringify(getDesign())!==signature)throw Object.assign(Error(),{code:'invalid_design'});
      status.textContent=tr('Je vaste ontwerpversie wordt opgeslagen…','Saving your fixed design…');
      const saved=await api('create',{design,previews,confirmed:true});
      saveCheckoutKey(saved.id,saved.checkoutToken);
      return {...saved,total:quoteDesign(design).total};
    } catch(error) {
      console.warn('SSK order save:',error.code||error.message||'unavailable');
      status.textContent=errorMessage(error,lang)+(TEST_MODE?' ['+(error.code||error.message||'unavailable')+']':'');
      button.disabled=another.disabled=confirm.disabled=false;return null;
    }
  }
  button.disabled=!complete;another.disabled=!complete;
  if(!complete)status.textContent=tr('Rond eerst de ontbrekende ontwerpkeuzes af.','Complete the required design choices first.');
  button.onclick=async()=>{
    const saved=await save();if(!saved)return;
    const items=addToCart(saved);
    // Capability lives in the fragment so it is not sent as a URL query/referrer.
    location.assign('./order.html#'+orderItemsFragment(items));
  };
  another.onclick=async()=>{
    const saved=await save();if(!saved)return;
    const items=addToCart(saved);
    status.textContent=tr(`Handschoen ${items.length} bewaard als ${saved.reference}. Bouw nu de volgende.`,`Glove ${items.length} saved as ${saved.reference}. Now build the next one.`);
    button.disabled=another.disabled=confirm.disabled=false;confirm.checked=false;paintCart();
    if(onParked)onParked(saved,items);
  };
  acts.append(button,another,orderLink);
  panel.append(heading,lead,cartBox,label,acts,status);host.append(panel);paintCart();
}
