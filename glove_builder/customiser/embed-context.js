const SHOP_ORIGIN='https://sskeurope.ccvshop.nl';
export function trustedEmbed(referrer,ancestors,selfOrigin) {
  let parent;try{parent=new URL(referrer).origin;}catch{return false;}
  const allowed=new Set([SHOP_ORIGIN,selfOrigin]);
  return allowed.has(parent)&&Array.from(ancestors||[]).every(origin=>allowed.has(origin));
}
export function navigateCheckout(url,win=window) {
  const target=new URL(url);
  if(target.origin!==SHOP_ORIGIN||target.username||target.password)throw Error('invalid_checkout_response');
  if(win.parent!==win&&trustedEmbed(win.document.referrer,win.location.ancestorOrigins,win.location.origin)) {
    // Referrer becomes the builder after an internal page navigation.
    // Always address the real merchant parent by its exact target origin.
    win.parent.postMessage({type:'ssk:checkout',url:target.href},SHOP_ORIGIN);
    try {if(win.parent.location?.origin===win.location.origin)win.parent.location.assign(target.href);}catch{}
    return;
  }
  win.location.assign(target.href);
}
if(typeof window!=='undefined'&&window.parent!==window) {
  if(!trustedEmbed(document.referrer,location.ancestorOrigins,location.origin)) {
    document.documentElement.replaceChildren();
    throw Error('This configurator can only be embedded by SSK Europe.');
  }
  document.documentElement.dataset.embedded='true';
}
