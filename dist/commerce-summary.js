import {T,HANDS,PADS,FLAGS} from './glove-catalog.js?v=79ed09cc257578db';
import {COMMERCE_CATALOG} from './commerce-catalog.js?v=3ff6e3f82cc1585e';

// Keep stored keys stable for the shop, but show readable localized labels.
export function displaySpecification(rows,lang='nl') {
  const en=lang==='en',t=T[en?'en':'nl'];
  const labels={'Design':en?'Design code':'Ontwerpcode','Throwing hand':t.hand,'Size':t.size,'Web':t.webType,
    'Finger protection':t.pad,'Badge':t.bullet,'Flag':t.flag,'Flag position':t.flagPosition,
    web:t.webColor,palm:t.palm,belt:t.belt,lining:t.lining,binding:t.binding,welting:t.welting,laces:t.laces,
    thumb_loops:t.thumbLoops,pinky_loops:t.pinkyLoops,stitching:t.stitching,ring_emb:t.ringEmb,pad_color:t.padColor,
    flagOther:en?'Custom flag':'Eigen vlag'};
  return rows.map(([key,value])=>{
    const material=key.endsWith(' material'),field=material?key.slice(0,-9):key;
    const label=labels[field]||t[field]||(/^back[1-9]$/.test(field)?'Back '+field.slice(4):field);
    let shown=value;
    const catalogue=key==='Throwing hand'?HANDS:key==='Finger protection'?PADS:key==='Flag'?FLAGS:null;
    if(catalogue){const choice=catalogue.find(c=>c.id===value);shown=choice?.[en?'en':'nl']||value;}
    if(key==='Flag position')shown=value==='middle'?t.middleFinger:t.indexFinger;
    if(material&&value==='Standard leather')shown=en?'Standard leather':'Normaal leer';
    if(['thumbMain','thumbOutline','numberColor'].includes(key)){
      const colour=COMMERCE_CATALOG.palettes.embroidery.find(c=>c.id===value);if(colour)shown=value+' · '+colour.name;
    }
    return [material?label+' · '+(en?'material':'leertype'):label,shown];
  });
}
