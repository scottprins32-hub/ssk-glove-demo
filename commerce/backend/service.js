import {CommerceError,validateDesign,validatePreviews,quoteDesign,designCode,specification,SHOP} from '../../glove_builder/customiser/commerce-contract.js';
const encoder=new TextEncoder();
export async function tokenHash(token) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(token)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const token=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function matches(value,expected) {
  if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value)||!expected) return false;
  const hashed=await tokenHash(value);let difference=0;
  for(let i=0;i<64;i++) difference|=hashed.charCodeAt(i)^expected.charCodeAt(i);
  return difference===0;
}
export function createCommerce({store,ccv,requireAdmin,now=()=>new Date(),appUrl,checkoutEnabled=false,acceptanceTestsEnabled=false}) {
  const publicDraft=async d=>({id:d.id,reference:d.reference,design:d.design,quote:d.quote,previews:store.publicPreviews?await store.publicPreviews(d.previews):d.previews,
    expiresAt:d.expires_at,specification:specification(d.design)});
  async function save(design,previews,clientFingerprint) {
    const hour=now().toISOString().slice(0,13);
    if(!await store.reserveRate(clientFingerprint,hour))throw new CommerceError('too_many_designs',429);
    const viewToken=token(),checkoutToken=token();
    const draft=await store.create({reference:designCode(design),design,previews,quote:quoteDesign(design),
      view_hash:await tokenHash(viewToken),checkout_hash:await tokenHash(checkoutToken),status:'draft',
      client_hash:clientFingerprint,expires_at:new Date(now().getTime()+30*86400000).toISOString()});
    return {id:draft.id,reference:draft.reference,viewToken,checkoutToken};
  }
  async function load(body,kind) {
    if(typeof body.id!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(body.id)) throw new CommerceError('design_not_found',404);
    const d=await store.get(body.id);
    if(!d||!await matches(body.token,d[kind+'_hash'])) throw new CommerceError('design_not_found',404);
    if(new Date(d.expires_at)<=now()) throw new CommerceError('design_expired',410);
    return d;
  }
  async function checkPrice() {
    const product=await ccv.product();
    if(Math.round((Number(product.price)-Number(product.discount||0))*100)!==37495) throw new CommerceError('shop_price_changed',409);
    return product;
  }
  return async function run(body,{clientFingerprint='unknown',user}={}) {
    if(!body||typeof body!=='object') throw new CommerceError('invalid_request');
    switch(body.action) {
      case 'config':return {connected:ccv.configured,checkoutEnabled:ccv.configured&&checkoutEnabled===true,shop:SHOP,pricing:quoteDesign({flag:'None'}),mode:checkoutEnabled===true?'live':'approval_pending'};
      case 'create': {
        if(body.confirmed!==true) throw new CommerceError('design_confirmation_required');
        const design=validateDesign(body.design),previews=validatePreviews(body.previews);
        return save(design,previews,clientFingerprint);
      }
      case 'copy': {
        if(body.confirmed!==true)throw new CommerceError('design_confirmation_required');
        const source=await load(body,'view');
        return save(validateDesign(source.design),source.previews,clientFingerprint);
      }
      case 'read':return publicDraft(await load(body,'view'));
      case 'admin-test-checkout':
      case 'checkout': {
        const acceptanceTest=body.action==='admin-test-checkout';
        if(acceptanceTest){
          await requireAdmin(user);
          if(acceptanceTestsEnabled!==true||body.confirmed!==true||body.purpose!=='acceptance-test')throw new CommerceError('acceptance_tests_disabled',403);
        }else if(checkoutEnabled!==true)throw new CommerceError('checkout_approval_pending',503);
        let d=await load(body,'checkout');
        if(d.design.flag==='Other Flag') throw new CommerceError('flag_requires_confirmation',409);
        if(d.status==='ready') {
          const order=await ccv.order(d.ccv_order_id,d);
          if(order.is_completed){await store.update(d.id,{status:'ordered'});throw new CommerceError('already_ordered',409);}
          return {url:d.checkout_url};
        }
        if(d.status!=='draft') throw new CommerceError(d.status==='submitting'?'checkout_processing':'checkout_needs_review',409);
        if(!ccv.configured) throw new CommerceError('checkout_not_connected',503);
        await checkPrice(); // A failed read cannot have created an order, so it does not consume the claim.
        if(!await store.claim(d.id)) {
          d=await store.get(d.id);
          if(d.status==='ready') return {url:d.checkout_url};
          throw new CommerceError('checkout_processing',409);
        }
        try {
          const memo=[...(acceptanceTest?['ACCEPTANCE TEST — DO NOT FULFIL. Unpaid, incomplete test basket.']:[]),`SSK Custom Glove | ${d.reference}`,`Snapshot: ${d.id}`,`Merchant specification: ${appUrl}merchant.html#${d.id}`,
            ...specification(d.design).map(([k,v])=>`${k}: ${v}`),
            `Glove incl. flag: EUR ${(d.quote.total/100).toFixed(2)}; shipping is calculated by CCV.`,
            'Specifications are authoritative; previews may be estimated or unavailable.'].join('\n');
          const result=await ccv.prepare(d,memo);
          await store.update(d.id,{status:'ready',ccv_order_id:result.id,checkout_url:result.url});
          return {url:result.url};
        } catch(error) {
          // After claim, any interruption could conceal a successful CCV write. Never retry the POST automatically.
          await store.update(d.id,{status:'uncertain',last_error:error.code||'checkout_outcome_unknown',
            ...(Number.isSafeInteger(error.ccvOrderId)&&error.ccvOrderId>0?{ccv_order_id:error.ccvOrderId}:{})}).catch(()=>{});
          const failure=new CommerceError('checkout_needs_review',409);
          failure.upstreamStatus=error.upstreamStatus;failure.upstreamDetail=error.upstreamDetail;
          throw failure;
        }
      }
      case 'status': {
        const d=await load(body,'checkout');
        if(!d.ccv_order_id) return {status:d.status,paid:false};
        const order=await ccv.order(d.ccv_order_id,d);
        return {status:order.is_completed?'ordered':d.status,paid:order.paid===true};
      }
      case 'admin-list': {
        await requireAdmin(user);
        return {drafts:(await store.list()).map(d=>({id:d.id,reference:d.reference,status:d.status,created:d.created_date,
          expires:d.expires_at,total:d.quote.total,ccvOrderId:d.ccv_order_id||null,lastError:d.last_error||null}))};
      }
      case 'admin-read': {
        await requireAdmin(user);const d=await store.get(body.id);
        if(!d)throw new CommerceError('design_not_found',404);return publicDraft(d);
      }
      case 'admin-check':await requireAdmin(user);return {connected:ccv.configured,checkoutEnabled:ccv.configured&&checkoutEnabled===true,acceptanceTestsEnabled:acceptanceTestsEnabled===true,product:ccv.configured?{id:(await checkPrice()).id}:null,shop:SHOP};
      case 'admin-order-check': {
        await requireAdmin(user);const d=await store.get(body.id);
        if(!d?.ccv_order_id)throw new CommerceError('design_not_found',404);
        const order=await ccv.order(d.ccv_order_id,d),row=order.verifiedRow;
        return {orderId:order.id,paid:order.paid===true,completed:order.is_completed===true,currency:order.currency,
          gloveTotal:d.quote.total,shipping:Number(order.total_shipping),total:Number(order.total_price),
          taxPercent:Number(row.tax),specificationVerified:true};
      }
      case 'admin-reconcile': {
        await requireAdmin(user);
        const d=await store.get(body.id);
        if(!d||!['submitting','uncertain','ready'].includes(d.status)) throw new CommerceError('reconciliation_not_allowed',409);
        const order=await ccv.order(Number(body.orderId),d);
        if(order.is_completed) {
          await store.update(d.id,{status:'ordered',ccv_order_id:order.id});
          return {status:'ordered',paid:order.paid===true};
        }
        const {safeCheckoutUrl}=await import('../../glove_builder/customiser/commerce-contract.js');
        await store.update(d.id,{status:'ready',ccv_order_id:order.id,checkout_url:safeCheckoutUrl(order.checkout_href||order.basket_href)});
        return {status:'ready',paid:order.paid===true};
      }
      default:throw new CommerceError('unknown_action');
    }
  };
}
