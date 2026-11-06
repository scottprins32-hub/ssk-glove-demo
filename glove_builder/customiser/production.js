import {api,readOrderFragment,errorMessage} from './commerce-client.js';
import {node,viewNames} from './commerce-display.js';
import {displaySpecification} from './commerce-summary.js';

export function renderProduction(draft,host){
  host.replaceChildren();host.hidden=false;
  const summary=node('section',null,'commerce-card');
  summary.append(node('h2',draft.reference),node('p','Vaste ontwerpversie bij CCV-bestelling '+draft.production.ccvOrderId),
    node('p','Controleer de betaling en bestelstatus in CCV. Deze ontwerpkaart is alleen een productiespecificatie, geen betaalbewijs.','note'));
  const actions=node('div',null,'commerce-actions');
  const print=node('button','Afdrukken / PDF bewaren','btn btn-primary');print.type='button';print.onclick=()=>window.print();
  const download=(name,data,type)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const spec=node('button','Specificatie opslaan','btn');spec.type='button';spec.onclick=()=>download('SSK-'+draft.id+'-specificatie.txt',
    ['SSK Custom Glove',draft.reference,'CCV-bestelling: '+draft.production.ccvOrderId,...displaySpecification(draft.specification).map(([k,v])=>k+': '+v)].join('\n'),'text/plain;charset=utf-8');
  const json=node('button','Volledig ontwerp opslaan (JSON)','btn');json.type='button';json.onclick=()=>download('SSK-'+draft.id+'-ontwerp.json',JSON.stringify(draft,null,2),'application/json');
  actions.append(print,spec,json);summary.append(actions);host.append(summary);
  const previews=node('div',null,'commerce-previews');
  for(const p of draft.previews){
    const figure=node('figure'),caption=node('figcaption',viewNames[p.view]||p.view);
    if(p.available){const image=node('img');image.src=p.imageUrl||p.dataUrl;image.alt=viewNames[p.view]||p.view;figure.append(image);
      const link=node('a','Afbeelding opslaan','btn');link.href=image.src;link.download='SSK-'+draft.id+'-'+p.view+'.'+(image.src.startsWith('data:image/webp')?'webp':'png');
      link.onclick=async event=>{event.preventDefault();try{const response=await fetch(image.src);if(!response.ok)throw Error('image_unavailable');const blob=await response.blob();download(link.download,blob,blob.type);}catch{caption.append(node('p','Opslaan lukte niet. Probeer opnieuw of bewaar het volledige ontwerp als JSON.','note'));}};
      caption.append(link);
    }else figure.append(node('div','Geen goedgekeurde afbeelding voor dit aanzicht.','unavailable'));
    for(const note of p.notes||[])caption.append(node('p',note,'commerce-small'));
    figure.append(caption);previews.append(figure);
  }
  host.append(node('h2','De vier aanzichten'),previews);
  const card=node('section',null,'commerce-card'),table=node('table',null,'commerce-spec');card.append(node('h2','Volledige specificatie'));
  for(const [key,value] of displaySpecification(draft.specification)){const row=node('tr');row.append(node('th',key),node('td',String(value)));table.append(row);}
  card.append(table,node('p','De specificatie is leidend. Afbeeldingen kunnen een benadering zijn; opmerkingen per aanzicht staan bij de afbeelding.','note'));host.append(card);
}

async function start(){
  const status=document.querySelector('#status'),host=document.querySelector('#production-content'),item=readOrderFragment();
  if(!item){status.textContent='Deze ontwerplink is onvolledig. Open de volledige link uit de interne notitie bij de CCV-bestelling.';return;}
  try{const draft=await api('production-read',item);renderProduction(draft,host);
    status.textContent='Alleen-lezen ontwerpkaart · beschikbaar tot '+new Intl.DateTimeFormat('nl-NL',{dateStyle:'long'}).format(new Date(draft.expiresAt))+'. Deel deze link alleen met de betrokken SSK-medewerker of fabrikant.';
  }catch(error){status.textContent=errorMessage(error);}
}
if(typeof document!=='undefined'&&document.querySelector('#production-content'))start();
