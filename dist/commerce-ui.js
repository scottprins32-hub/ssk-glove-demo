import {api,errorMessage,saveCheckoutKey,orderFragment,TEST_MODE} from './commerce-client.js?v=52a6ddc269486f8b';
export function mountCommerce(host,{lang,complete,capture,getDesign}) {
  const en=lang==='en',panel=document.createElement('section');panel.className='commerce-panel';
  const heading=document.createElement('h3');heading.textContent=en?'Save your design and order':'Ontwerp bewaren en bestellen';
  const lead=document.createElement('p');lead.className='note';lead.textContent=en?
    'Save a fixed version of your choices. Anyone with your design link can view it. Payment and shipping are handled in the SSK webshop.':
    'Bewaar een vaste versie van je keuzes. Iedereen met je ontwerplink kan die bekijken. Betalen en verzendkosten worden in de SSK-webshop afgehandeld.';
  const label=document.createElement('label');label.className='commerce-confirm';const confirm=document.createElement('input');confirm.type='checkbox';
  label.append(confirm,document.createTextNode(en?' I have checked my choices and personalization.':' Ik heb mijn keuzes en personalisatie gecontroleerd.'));
  const status=document.createElement('p');status.className='note';status.setAttribute('role','status');
  const button=document.createElement('button');button.type='button';button.className='btn btn-primary';
  button.textContent=en?'Save and review order':'Opslaan en bestelling bekijken';button.disabled=!complete;
  if(!complete)status.textContent=en?'Complete the required design choices first.':'Rond eerst de ontbrekende ontwerpkeuzes af.';
  if(TEST_MODE){const test=document.createElement('p');test.className='note note-warn';test.textContent=en?'Test mode — no real order or payment.':'Testmodus — geen echte bestelling of betaling.';panel.append(test);}
  button.onclick=async()=>{
    if(!confirm.checked){status.textContent=en?'Please confirm that you reviewed your design.':'Bevestig eerst dat je het ontwerp hebt gecontroleerd.';confirm.focus();return;}
    button.disabled=true;confirm.disabled=true;status.textContent=en?'Preparing the four views…':'De vier aanzichten worden klaargezet…';
    try {
      const design=getDesign(),signature=JSON.stringify(design),previews=await capture();
      if(JSON.stringify(getDesign())!==signature)throw Object.assign(Error(),{code:'invalid_design'});
      status.textContent=en?'Saving your fixed design…':'Je vaste ontwerpversie wordt opgeslagen…';
      const saved=await api('create',{design,previews,confirmed:true});
      saveCheckoutKey(saved.id,saved.checkoutToken);
      // Capability lives in the fragment so it is not sent as a URL query/referrer.
      location.assign('./order.html#'+orderFragment(saved.id,saved.viewToken));
    } catch(error) {console.warn('SSK order save:',error.code||error.message||'unavailable');status.textContent=errorMessage(error,lang)+(TEST_MODE?' ['+(error.code||error.message||'unavailable')+']':'');button.disabled=false;confirm.disabled=false;}
  };
  panel.append(heading,lead,label,button,status);host.append(panel);
}
