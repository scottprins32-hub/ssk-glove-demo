// HD candidate ownership only. These maps are deliberately not production masks.
// Pixel coordinates are normalized per generated frame; source alpha is retained.
export const labels = {
  web:'Webleer',palm:'Palm en doorlopende aansluiting',back1:'Back 1 · duim-wingtip',
  back2:'Back 2 · duim',back3:'Back 3',back4:'Back 4',back5:'Back 5',back6:'Back 6',
  back78:'Back 7 + 8 · nog te scheiden',back9:'Back 9 · pink-wingtip',
  belt:'Polsband',binding:'Binding',lining:'Voering',welting:'Welting',
  laces:'Veters',stitching:'Stiksel',embroidery:'Borduring',badge:'Duimlogo',unassigned:'Nog toe te wijzen'
};
export const fields=Object.keys(labels), idOf=k=>fields.indexOf(k)+1;
const inPoly=(x,y,p)=>{let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){
  const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!=(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
}return inside};
function nearLine(x,y,p,width){for(let i=1;i<p.length;i++){
  const [a,b]=p[i-1],[c,d]=p[i],dx=c-a,dy=d-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy)));
  if(Math.hypot(x-a-t*dx,y-b-t*dy)<width)return true;
}return false;}
const webRegions={
  back:[[.645,0],[.97,.06],[.99,.6],[.84,.65],[.63,.51]],
  thumb:[[.30,0],[.85,.19],[.52,.62],[.22,.72],[.055,.53],[.14,.25]],
  palm:[[.10,.19],[.405,.03],[.47,.50],[.33,.57],[.20,.52]]
};
const seamLines={
 back:[[[.18,.23],[.21,.48],[.27,.69]],[[.35,.095],[.27,.33],[.32,.50],[.38,.72]],[[.58,.035],[.49,.28],[.48,.51],[.49,.69]]],
 thumb:[[[.89,.225],[.78,.47],[.67,.73],[.625,.94]]],
 palm:[[[.40,.055],[.49,.46]],[[.55,.065],[.58,.51]],[[.74,.065],[.79,.55]],[[.87,.18],[.89,.67]]]
};
function leather(view,x,y){
 if(inPoly(x,y,webRegions[view]))return 'web';
 if(view==='thumb'){
  if(y>.95)return 'binding';
  if(inPoly(x,y,[[.08,.57],[.53,.61],[.44,.75],[.24,.8],[.12,.71]]))return 'palm';
  if(x>.94-.34*y)return 'back1';
  if(x<.31&&y<.56)return 'back3';
  return 'back2';
 }
 if(view==='palm'){
  if(y>.94)return 'binding';
  if(x<.08&&y>.35)return 'back1';
  if(x>.92&&y>.35)return 'back9';
  return 'palm';
 }
 if(y>.82)return 'belt';
 if(((x-.46)/.235)**2+((y-.77)/.078)**2<1)return 'lining';
 if(((x-.46)/.265)**2+((y-.77)/.105)**2<1)return 'binding';
 if(x>.64&&y>.49)return y<.64?'palm':'back2';
 if(x<.18)return 'back9';
 const cut1=.355-.005*y,cut2=.395+.17*y,cut3=.5+.09*y,cut4=.57+.015*y;
 if(x<cut1)return 'back78';
 if(x<cut2)return 'back6';
 if(x<cut3)return 'back5';
 if(x<cut4)return 'back4';
 return 'back3';
}
export function identify(imageData,view){
 const {width:w,height:h,data:d}=imageData,n=w*h,ids=new Uint8Array(n),white=new Uint8Array(n);
 // Candidate chromatic separation. Small connected light strokes are thread;
 // broad light straps are lace; explicit narrow seam corridors identify welting.
 for(let i=0;i<n;i++){
  if(!d[4*i+3])continue;const r=d[4*i],g=d[4*i+1],b=d[4*i+2],x=(i%w)/w,y=Math.floor(i/w)/h;
  let role=leather(view,x,y);
  if(view==='thumb'&&((x-.505)/.10)**2+((y-.808)/.065)**2<1)role='badge';
  if(view==='back'&&y>.83&&x>.36&&x<.70)role='embroidery';
  const isLight=Math.min(r,g,b)>100&&Math.max(r,g,b)-Math.min(r,g,b)<65;
  if(isLight&&role!=='badge'&&role!=='embroidery'){
    if(view==='back'&&x>.12&&x<.27&&y>.17&&y<.54)role='embroidery';
    else if(seamLines[view].some(p=>nearLine(x,y,p,.012)))role='welting';
    else {role='laces';white[i]=1;}
  }
  ids[i]=idOf(role);
 }
 const visited=new Uint8Array(n),queue=new Int32Array(n);let components=0;
 for(let i=0;i<n;i++)if(white[i]&&!visited[i]){
  let head=0,tail=1;queue[0]=i;visited[i]=1;
  while(head<tail){const p=queue[head++],x=p%w;for(const q of [x?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(q>=0&&q<n&&white[q]&&!visited[q]){visited[q]=1;queue[tail++]=q;}}
  if(tail<220*w*h/1600000){for(let j=0;j<tail;j++)ids[queue[j]]=idOf('stitching');}
  components++;
 }
 const counts={};for(const id of ids)if(id){const k=fields[id-1];counts[k]=(counts[k]||0)+1;}
 return {ids,counts,components,w,h};
}
export function packed(map){
 const runs=[];let last=map.ids[0],count=0;for(const id of map.ids){if(id===last)count++;else{runs.push(last,count);last=id;count=1;}}runs.push(last,count);
 return {revision:'HD-CANDIDATE-OWNERSHIP-1',status:'UNVERIFIED_DRAFT',productionReady:false,width:map.w,height:map.h,encoding:'id,count RLE; row major',fields:Object.fromEntries(fields.map((x,i)=>[i+1,x])),counts:map.counts,runs};
}
export function tint(original,map,colors,selected,showMap=false){
 const result=new ImageData(new Uint8ClampedArray(original.data),map.w,map.h),d=result.data;
 for(let i=0;i<map.ids.length;i++){
  const id=map.ids[i];if(!id)continue;const role=fields[id-1],hex=colors[role];
  if(showMap){const hue=(id*137.508)%360,amp=110;d[4*i]=128+amp*Math.cos(hue*Math.PI/180);d[4*i+1]=128+amp*Math.cos((hue+120)*Math.PI/180);d[4*i+2]=128+amp*Math.cos((hue+240)*Math.PI/180);}
  else if(hex){const rgb=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16));const red=d[4*i]>d[4*i+1]*1.35,shade=red?Math.min(1.2,d[4*i]/175):Math.min(1.15,(d[4*i]+d[4*i+1]+d[4*i+2])/720);for(let c=0;c<3;c++)d[4*i+c]=rgb[c]*shade;}
  if(selected&&role===selected){d[4*i]=d[4*i]*.55+45;d[4*i+1]=d[4*i+1]*.55+100;d[4*i+2]=d[4*i+2]*.55+100;}
 }
 return result;
}
