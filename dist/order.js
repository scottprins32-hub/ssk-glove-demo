import {api,errorMessage,readOrderFragment,getCheckoutKey,saveCheckoutKey,orderFragment,checkoutStorageAvailable,TEST_MODE} from './commerce-client.js?v=52a6ddc269486f8b';
import {SHOP,safeCheckoutUrl} from './commerce-contract.js?v=73ea8e70c59c3041';
import {displayDraft,node} from './commerce-display.js?v=d81a4b5418794e64';
const status=document.querySelector('#status'),host=document.querySelector('#order-content');
const credentials=readOrderFragment();
async function start() {
  if(!credentials)throw Object.assign(Error(),{code:'design_not_found'});
  const draft=await api('read',credentials),config=await api('config').catch(()=>({connected:false})),en=draft.design.lang==='en',tr=(nl,english)=>en?english:nl;
  document.documentElement.lang=en?'en':'nl';document.querySelector('h1').textContent=tr('Je ontwerp en bestelling','Your design and order');document.querySelector('.eyebrow').textContent=tr('JOUW HANDSCHOEN','YOUR GLOVE');
  host.hidden=false;status.textContent=tr('Vaste ontwerpversie · bewaard tot ','Fixed design · saved until ')+new Intl.DateTimeFormat(en?'en-GB':'nl-NL',{dateStyle:'long'}).format(new Date(draft.expiresAt));
  const aside=displayDraft(draft,host);
  if(TEST_MODE)host.prepend(node('p',tr('Testmodus — geen echte bestelling of betaling.','Test mode — no real order or payment.'),'commerce-debug'));
  const button=node('button',getCheckoutKey(draft.id)?tr('Verder naar veilig afrekenen','Continue to secure checkout'):tr('Dit ontwerp zelf bestellen','Order this design'),'btn btn-primary');button.type='button';
  const message=node('p','', 'note');message.setAttribute('role','status');
  const returnLink=node('a',tr('Terug naar SSK Custom Glove','Return to SSK Custom Glove'),'btn');returnLink.href=SHOP.productUrl;
  const share=node('button',tr('Ontwerplink kopiëren','Copy design link'),'btn');share.onclick=async()=>{
    try{await navigator.clipboard.writeText(location.href);message.textContent=tr('De ontwerplink is gekopieerd.','Design link copied.');}catch{message.textContent=tr('Kopieer de volledige ontwerplink uit de adresbalk.','Copy the full design link from the address bar.');}
  };
  const consent=node('label',null,'commerce-confirm'),check=node('input');check.type='checkbox';
  consent.append(check,document.createTextNode(tr(' Ik heb dit ontwerp gecontroleerd en wil ermee verder naar de SSK-webshop.',' I checked this design and want to continue to the SSK webshop.')));
  function disable(code){button.disabled=true;message.textContent=errorMessage({code},draft.design.lang);}
  if(!config.connected)disable('checkout_not_connected');
  if(draft.design.flag==='Other Flag')disable('flag_requires_confirmation');
  if(!checkoutStorageAvailable())disable('checkout_storage_required');
  button.onclick=async()=>{
    if(!checkoutStorageAvailable()){disable('checkout_storage_required');return;}
    if(!check.checked){message.textContent=tr('Bevestig eerst je gecontroleerde ontwerp.','Confirm your reviewed design first.');check.focus();return;}
    button.disabled=true;
    try {
      const key=getCheckoutKey(draft.id);
      if(!key){
        const own=await api('copy',{...credentials,confirmed:true});
        saveCheckoutKey(own.id,own.checkoutToken);
        if(!getCheckoutKey(own.id)){disable('checkout_storage_required');return;}
        location.assign('./order.html#'+orderFragment(own.id,own.viewToken));return;
      }
      message.textContent=tr('Je winkelwagen wordt klaargezet…','Preparing your basket…');
      const result=await api('checkout',{id:draft.id,token:key});location.assign(safeCheckoutUrl(result.url));
    } catch(error){message.textContent=errorMessage(error,draft.design.lang);button.disabled=false;}
  };
  const refresh=node('button',tr('Bestelstatus controleren','Check order status'),'btn');refresh.disabled=!getCheckoutKey(draft.id)||!config.connected;
  refresh.onclick=async()=>{refresh.disabled=true;try{const result=await api('status',{id:draft.id,token:getCheckoutKey(draft.id)});message.textContent=tr('Status bij CCV: ','CCV status: ')+result.status+tr(' · betaald: ',' · paid: ')+(result.paid?tr('ja','yes'):tr('nee','no'));if(result.status==='ordered')button.disabled=true;}catch(error){message.textContent=errorMessage(error,draft.design.lang);}finally{refresh.disabled=false;}};
  aside.append(consent,node('div',null,'commerce-actions'));aside.lastChild.append(button,refresh,share,returnLink);aside.append(message);
}
start().catch(error=>{status.textContent=errorMessage(error);const back=node('a','Terug naar de ontwerper / Back to designer','btn');back.href='./index.html';host.hidden=false;host.replaceChildren(back);});
