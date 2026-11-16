/* Installed only in SSK product896372573. Only the verified CCV checkout destination is sent to the merchant. */
(()=>{
 const BUILDER='https://ssk-glove-configurator-da8db964.base44.app',SHOP='https://sskeurope.ccvshop.nl';
 const section=document.getElementById('ssk-custom-builder'),frame=document.getElementById('ssk-custom-builder-frame');
 if(location.origin!==SHOP||!section||!frame||frame.dataset.mounted)return;
 frame.dataset.mounted='true';
 const legacy=document.querySelector('.product__content-top');
 if(legacy&&legacy.contains(section)) {legacy.before(section);legacy.hidden=true;legacy.style.display='none';}
 section.style.cssText='display:block;width:100%;margin:24px 0 36px;';
 frame.style.cssText='display:block;width:100%;height:calc(100svh - 132px);min-height:680px;max-height:1050px;border:1px solid #d8d8d8;border-radius:6px;background:#f7f7f7;';
 window.addEventListener('message',event=>{
  if(event.origin!==BUILDER||event.source!==frame.contentWindow||event.data?.type!=='ssk:checkout'||typeof event.data.url!=='string')return;
  let url;try{url=new URL(event.data.url);}catch{return;}
  if(url.origin!==SHOP||url.username||url.password||url.pathname!=='/website/index.php'||!['WebShopOneStepCheckout','WebShopBasket'].includes(url.searchParams.get('Show'))||!url.searchParams.get('OrderId'))return;
  location.assign(url.href);
 });
})();
