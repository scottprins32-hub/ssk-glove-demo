import {navigateCheckout} from './embed-context.js';
import {api,errorMessage,readOrderItems,getCheckoutKey,saveCheckoutKey,orderItemsFragment,checkoutStorageAvailable,formatMoney,removeFromCart,TEST_MODE} from './commerce-client.js';
import {SHOP,safeCheckoutUrl} from './commerce-contract.js';
import {displayDraft,node} from './commerce-display.js';
const status=document.querySelector('#status'),host=document.querySelector('#order-content');
// Shared copies and multi-glove removal change only this document's fragment.
// Reload the snapshot and capabilities instead of leaving the previous controls mounted.
window.addEventListener('hashchange',()=>location.reload());
const items=readOrderItems();
async function start() {
  if(!items)throw Object.assign(Error(),{code:'design_not_found'});
  // Every glove in the order is its own saved snapshot with its own code.
  const drafts=[];for(const item of items)drafts.push(await api('read',item));
  const config=await api('config').catch(()=>({connected:false})),lead=drafts[0],en=lead.design.lang==='en',tr=(nl,english)=>en?english:nl,many=drafts.length>1;
  document.documentElement.lang=en?'en':'nl';document.querySelector('h1').textContent=many?tr(`Je ${drafts.length} handschoenen en bestelling`,`Your ${drafts.length} gloves and order`):tr('Je ontwerp en bestelling','Your design and order');
  document.querySelector('.eyebrow').textContent=many?tr('JOUW HANDSCHOENEN','YOUR GLOVES'):tr('JOUW HANDSCHOEN','YOUR GLOVE');
  host.hidden=false;
  const journey=node('ol',null,'commerce-journey');journey.setAttribute('aria-label',tr('Bestelstappen','Order steps'));
  for(const [index,label] of [tr('Ontwerp opgeslagen','Design saved'),tr('Controleer je bestelling','Review your order'),tr('Adres en betaling bij SSK','Address and payment at SSK')].entries()) {
    const step=node('li',label);if(index===1)step.setAttribute('aria-current','step');journey.append(step);
  }
  host.before(journey);
  const soonest=drafts.map(d=>new Date(d.expiresAt)).sort((a,b)=>a-b)[0];
  status.textContent=tr('Vaste ontwerpversie · bewaard tot ','Fixed design · saved until ')+new Intl.DateTimeFormat(en?'en-GB':'nl-NL',{dateStyle:'long'}).format(soonest);
  let aside;
  drafts.forEach((draft,index)=>{
    aside=displayDraft(draft,host,{index,count:drafts.length});
    {
      const drop=node('a',tr('Deze handschoen uit de bestelling halen','Remove this glove from the order'),'btn');
      const remaining=items.filter(i=>i.id!==draft.id);
      drop.href=remaining.length?'./order.html#'+orderItemsFragment(remaining):'./index.html';
      drop.onclick=()=>{removeFromCart(draft.id);};
      aside.append(drop);
    }
  });
  if(TEST_MODE)host.prepend(node('p',tr('Testmodus — geen echte bestelling of betaling.','Test mode — no real order or payment.'),'commerce-debug'));
  // The order card: with one glove it is that glove's price card; with
  // several it comes after them, with the total of all.
  let card=aside;
  if(many){
    card=node('section',null,'commerce-card commerce-order');card.append(node('h2',tr('Je bestelling','Your order')));
    const lines=node('table',null,'commerce-order-lines');
    drafts.forEach((d,i)=>{const row=node('tr');row.append(node('th',`${i+1}. ${d.reference}`),node('td',formatMoney(d.quote.total,lead.design.lang)));lines.append(row);});
    const sum=node('tr');sum.append(node('th',tr(`Totaal ${drafts.length} handschoenen, exclusief verzendkosten`,`Total for ${drafts.length} gloves, excluding shipping`)),node('td',formatMoney(drafts.reduce((n,d)=>n+d.quote.total,0),lead.design.lang)));lines.append(sum);
    card.append(lines,node('p',tr('Elke handschoen gaat met zijn eigen ontwerpcode en specificatie mee naar de SSK-webshop, als aparte regel in één bestelling.','Each glove goes to the SSK webshop with its own design code and specification, as its own line in one order.'),'commerce-small'));
    host.append(card);
  }
  const ownAll=()=>items.every(i=>getCheckoutKey(i.id));
  const button=node('button',ownAll()?tr('Verder naar de SSK-winkelmand','Continue to the SSK basket'):many?tr('Deze handschoenen zelf bestellen','Order these gloves'):tr('Dit ontwerp zelf bestellen','Order this design'),'btn btn-primary');button.type='button';
  const message=node('p','', 'note');message.setAttribute('role','status');
  const help=node('p',tr('Hierna vul je in de SSK-webshop je adres in, kies je de bezorging en betaal je. Je ontwerp en personalisatie gaan automatisch mee.','Next, enter your address, choose delivery and pay in the SSK webshop. Your design and personalization are transferred automatically.'),'commerce-small');
  let completed=false;
  const returnLink=node('a',tr('Terug naar SSK Custom Glove','Return to SSK Custom Glove'),'btn');returnLink.href=SHOP.productUrl;returnLink.target='_top';
  const share=node('button',tr('Ontwerplink kopiëren','Copy design link'),'btn');share.onclick=async()=>{
    try{await navigator.clipboard.writeText(location.href);message.textContent=tr('De ontwerplink is gekopieerd.','Design link copied.');}catch{message.textContent=tr('Kopieer de volledige ontwerplink uit de adresbalk.','Copy the full design link from the address bar.');}
  };
  const consent=node('label',null,'commerce-confirm'),check=node('input');check.type='checkbox';
  consent.append(check,document.createTextNode(many?tr(' Ik heb deze ontwerpen gecontroleerd en wil ermee verder naar de SSK-webshop.',' I checked these designs and want to continue to the SSK webshop.'):tr(' Ik heb dit ontwerp gecontroleerd en wil ermee verder naar de SSK-webshop.',' I checked this design and want to continue to the SSK webshop.')));
  function disable(code){button.disabled=true;message.textContent=errorMessage({code},lead.design.lang);}
  if(!config.connected)disable('checkout_not_connected');
  else if(config.checkoutEnabled!==true)disable('checkout_approval_pending');
  if(drafts.some(d=>d.design.flag==='Other Flag'))disable('flag_requires_confirmation');
  if(!checkoutStorageAvailable())disable('checkout_storage_required');
  button.onclick=async()=>{
    if(button.disabled||completed)return;
    if(!checkoutStorageAvailable()){disable('checkout_storage_required');return;}
    if(!check.checked){message.textContent=many?tr('Bevestig eerst je gecontroleerde ontwerpen.','Confirm your reviewed designs first.'):tr('Bevestig eerst je gecontroleerde ontwerp.','Confirm your reviewed design first.');check.focus();return;}
    button.disabled=true;
    try {
      if(!ownAll()){
        // Someone else's link: every glove becomes an own snapshot with
        // its own checkout authority, then the order reopens on those.
        const own=[];
        for(const item of items){
          if(getCheckoutKey(item.id)){own.push({id:item.id,token:item.token});continue;}
          const copy=await api('copy',{...item,confirmed:true});
          saveCheckoutKey(copy.id,copy.checkoutToken);
          if(!getCheckoutKey(copy.id)){disable('checkout_storage_required');return;}
          own.push({id:copy.id,token:copy.viewToken});
        }
        location.assign('./order.html#'+orderItemsFragment(own));return;
      }
      message.textContent=tr('Je winkelwagen wordt klaargezet…','Preparing your basket…');
      const keys=items.map(i=>({id:i.id,token:getCheckoutKey(i.id)}));
      const result=await api('checkout',many?{items:keys,destination:'basket'}:{...keys[0],destination:'basket'});navigateCheckout(safeCheckoutUrl(result.url));
    } catch(error){message.textContent=errorMessage(error,lead.design.lang);button.disabled=false;if(error.code==='cart_already_open'&&error.basketUrl){const url=safeCheckoutUrl(error.basketUrl),existing=node('button',tr('Bestaande SSK-winkelmand openen','Open existing SSK basket'),'btn');existing.type='button';existing.onclick=()=>navigateCheckout(url);message.replaceChildren(document.createTextNode(errorMessage(error,lead.design.lang)),existing);}}
  };
  const refresh=node('button',tr('Bestelstatus controleren','Check order status'),'btn');refresh.disabled=!getCheckoutKey(lead.id)||!config.connected;
  refresh.onclick=async()=>{refresh.disabled=true;try{const result=await api('status',{id:lead.id,token:getCheckoutKey(lead.id)});if(['uncertain','submitting'].includes(result.status)){button.disabled=true;message.textContent=errorMessage({code:result.status==='uncertain'?'checkout_needs_review':'checkout_processing'},lead.design.lang);return;}completed=result.status==='ordered';button.disabled=completed||!config.connected||config.checkoutEnabled!==true||drafts.some(d=>d.design.flag==='Other Flag')||!checkoutStorageAvailable();message.textContent=completed?(result.paid?tr('Je bestelling is geplaatst en betaald. Je ontvangt de bevestiging van SSK.','Your order is placed and paid. SSK will send your confirmation.'):tr('Je bestelling is geplaatst. De betaling is nog niet bevestigd door SSK.','Your order is placed. Payment has not yet been confirmed by SSK.')):result.status==='ready'?tr('Je winkelwagen staat klaar. Je kunt verder om af te rekenen.','Your basket is ready. Continue to checkout.'):tr('Je ontwerp is opgeslagen. Je kunt verder naar afrekenen.','Your design is saved. You can continue to checkout.');if(completed){button.disabled=true;button.textContent=tr('Bestelling geplaatst','Order placed');consent.hidden=true;}}catch(error){message.textContent=errorMessage(error,lead.design.lang);}finally{refresh.disabled=false;}};
  const checkoutActions=node('div',null,'commerce-actions commerce-checkout-actions');checkoutActions.append(button);
  const secondary=node('div',null,'commerce-actions commerce-secondary');secondary.append(refresh,share,returnLink);
  card.append(help,consent,checkoutActions,message,secondary);
}
start().catch(error=>{status.textContent=errorMessage(error);const back=node('a','Terug naar de ontwerper / Back to designer','btn');back.href='./index.html';host.hidden=false;host.replaceChildren(back);});
