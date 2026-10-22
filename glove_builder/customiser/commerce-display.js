import {displaySpecification} from './commerce-summary.js';
import {formatMoney,restoreLink} from './commerce-client.js';
export function node(tag,text,cls) {const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
export const viewNames={back:'Achterkant',palm:'Palm',thumb:'Duimzijde',pinky:'Pinkzijde'};
/* One glove: its four views, specification and price card. With `index` and
   `count` it is one of several in the same order and the host keeps the
   gloves before it. Returns the price card, where the order controls go. */
export function displayDraft(draft,host,{index=0,count=1}={}) {
  const en=draft.design.lang==='en',tr=(nl,english)=>en?english:nl,names=en?{back:'Back',palm:'Palm',thumb:'Thumb side',pinky:'Pinky side'}:viewNames;
  if(index===0)host.replaceChildren();
  const grid=node('div',null,'commerce-grid'),body=node('div'),aside=node('aside',null,'commerce-card commerce-checkout');
  body.id=count>1?'design-proof-'+(index+1):'design-proof';
  if(count>1){const head=node('div',null,'commerce-glove-head');head.append(node('h2',tr(`Handschoen ${index+1} van ${count}`,`Glove ${index+1} of ${count}`)),node('code',draft.reference));body.append(head);}
  const previews=node('div',null,'commerce-previews');
  for(const p of draft.previews) {
    const figure=node('figure');
    if(p.available){const image=node('img');image.src=p.imageUrl||p.dataUrl;image.alt=names[p.view];figure.append(image);}
    else figure.append(node('div',tr('Voor dit web is geen goedgekeurde afbeelding van deze kant.','No approved image of this side is available for this web.'),'unavailable'));
    const caption=node('figcaption',names[p.view]);
    for(const note of p.notes)caption.append(node('p',note,'commerce-small'));
    figure.append(caption);previews.append(figure);
  }
  body.append(previews);
  const spec=node('section',null,'commerce-card');spec.append(node('h2',tr('Jouw specificatie','Your specification')));
  const table=node('table',null,'commerce-spec'), readableRows=displaySpecification(draft.specification,draft.design.lang);
  for(const [key,value] of readableRows){const tr=node('tr');tr.append(node('th',key),node('td',String(value)));table.append(tr);}
  for(const [label,amount] of [[tr('Custom handschoen','Custom glove'),draft.quote.base],...(draft.quote.flag?[[tr('Vlag','Flag'),draft.quote.flag]]:[]),[tr('Totaal exclusief verzendkosten','Total excluding shipping'),draft.quote.total]]){const row=node('tr');row.append(node('th',label),node('td',formatMoney(amount,draft.design.lang)));table.append(row);}
  spec.append(table,node('p',tr('Vaste ontwerpversie — geen orderbevestiging of betalingsbewijs.','Fixed design — not an order confirmation or payment receipt.'),'commerce-small'));body.append(spec);
  aside.append(node('h2','SSK Custom Glove'),node('p',draft.reference,'commerce-small'),node('p',formatMoney(draft.quote.total,draft.design.lang),'commerce-price'),
    node('p',draft.quote.flag?tr('Inclusief €5 voor je vlag. Crocodile pattern zonder meerprijs.','Includes €5 for your flag. Crocodile pattern has no surcharge.'):tr('Crocodile pattern zonder meerprijs.','Crocodile pattern has no surcharge.'),'commerce-small'),
    node('p',tr('Verzendkosten en bezorggegevens worden in de SSK-webshop afgehandeld.','Shipping and delivery details are handled in the SSK webshop.'),'commerce-small'));
  const inspect=node('button',tr('Bekijk de vier beelden en je keuzes','Review the four views and your choices'),'btn');inspect.type='button';inspect.onclick=()=>body.scrollIntoView({behavior:'smooth',block:'start'});aside.append(inspect);
  const actions=node('div',null,'commerce-actions'),edit=node('a',tr('Ontwerp aanpassen','Edit design'),'btn');edit.href=restoreLink(draft.design);
  const print=node('button',tr('Afdrukken / PDF bewaren','Print / save PDF'),'btn');print.onclick=()=>window.print();
  const download=node('button',tr('Specificatie downloaden','Download specification'),'btn');download.onclick=()=>{
    const content=['SSK Custom Glove',draft.reference,...readableRows.map(([k,v])=>`${k}: ${v}`),formatMoney(draft.quote.total,draft.design.lang)].join('\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'})),link=node('a');link.href=url;link.download='SSK-'+draft.id+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  actions.append(edit,print,download);if(count>1)body.insertBefore(actions,body.children[1]);else body.prepend(actions);
  if(count>1)grid.className+=' commerce-glove';grid.append(body,aside);host.append(grid);return aside;
}
