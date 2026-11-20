import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerce} from '../base44/functions/ssk-commerce-v15/lib/service.js';
import {createCcv} from '../base44/functions/ssk-commerce-v15/lib/ccv.js';
import {SHOP} from '../base44/functions/ssk-commerce-v15/lib/commerce-contract.js';
import {COLOUR_ORDER} from '../base44/functions/ssk-commerce-v15/lib/glove-catalog.js';
import {buildFactoryPacket} from '../base44/functions/ssk-production-v1/lib/packet.bundle.js';

test('offline rehearsal: distinct saved gloves survive the CCV basket and factory packet', async () => {
  const snapshots = new Map(), calls = [], notes = [];
  const now = () => new Date('2026-11-20T12:00:00Z');
  const orderId = 777, orderNumber = 'QA-NOT-FOR-FULFILMENT';
  const basketUrl = SHOP.origin + '/website/index.php?Show=WebShopBasket&OrderId=offline-fixture';
  let submitted;
  const ccv = createCcv({
    key: 'offline-fixture-key', secret: 'offline-fixture-secret', now,
    fetcher: async (url, options) => {
      // Every attempted remote request ends here; never forward to fetch().
      const target = new URL(url);
      assert.equal(target.origin, SHOP.origin);
      calls.push([options.method, target.pathname]);
      const base = '/api/rest/v1';
      if (target.pathname === base + '/products/' + SHOP.productId + '/') {
        return Response.json({id: SHOP.productId, name: SHOP.productName, price: 374.95});
      }
      if (target.pathname === base + '/orders/' && options.method === 'POST') {
        submitted = JSON.parse(options.body);
        return Response.json({id: orderId});
      }
      if (target.pathname === base + '/orders/' + orderId + '/') {
        return Response.json({
          id: orderId, ordernumber_full: orderNumber, currency: 'EUR', is_completed: false, paid: false,
          order_row_taxes_included: true, reservationnumber: submitted.reservationnumber, basket_href: basketUrl,
        });
      }
      if (target.pathname === base + '/orders/' + orderId + '/orderrows/') {
        return Response.json({items: submitted.orderrows.map(row => ({
          ...row, order_id: orderId, total_price: row.count * row.price, tax: 21,
        }))});
      }
      if (target.pathname === base + '/orders/' + orderId + '/ordernotes/') {
        if (options.method === 'POST') {
          notes.push({type: 'internal', note: JSON.parse(options.body).note});
          return new Response(null, {status: 204});
        }
        return Response.json({items: notes});
      }
      assert.fail('Unexpected mock endpoint: ' + target.pathname);
    },
  });
  const store = {
    reserveRate: async () => true,
    create: async data => {
      const row = {...structuredClone(data), id: 'draft_rehearsal_' + snapshots.size, created_date: now().toISOString()};
      snapshots.set(row.id, row);
      return structuredClone(row);
    },
    get: async id => structuredClone(snapshots.get(id)),
    update: async (id, patch) => Object.assign(snapshots.get(id), structuredClone(patch)),
    claim: async (id, status) => {
      const row = snapshots.get(id);
      if (row.status !== status) return false;
      row.status = 'submitting';
      return true;
    },
  };
  const run = createCommerce({
    store, ccv, now, checkoutEnabled: true,
    // The adapter validates this literal origin; no network is made to it.
    appUrl: 'https://ssk-glove-configurator-da8db964.base44.app/',
    requireAdmin: async user => assert.equal(user?.role, 'admin'),
  });
  const core = {
    lang: 'nl', size: '11.75"', pad: 'None', bullet: 7,
    colors: Object.fromEntries(COLOUR_ORDER.map(key => [key, '10'])),
    materials: {}, thumbFont: 'Block', thumbMain: '10',
  };
  const designs = [
    {...core, hand: 'RHT', webType: 'H-Web', flag: 'None', thumbText: 'QA Red'},
    {...core, hand: 'LHT', webType: 'SMK-Web', flag: 'Japan', flagPosition: 'middle', thumbText: 'QA Navy'},
  ];
  // This test covers the order data boundary, not the visual approvals.
  const previews = ['back', 'palm', 'thumb', 'pinky'].map(view => ({
    view, available: false, notes: ['Offline test: no approved image supplied.'],
  }));
  const saved = [];
  for (const design of designs) saved.push(await run({action: 'create', design, confirmed: true, previews}));
  const ids = saved.map(row => row.id);
  assert.equal(new Set(ids).size, 2);
  assert.equal(new Set(saved.map(row => row.reference)).size, 2);
  const orderInput = {
    action: 'checkout', items: saved.map(({id, checkoutToken}) => ({id, token: checkoutToken})),
    destination: 'basket',
  };
  assert.equal((await run(orderInput)).url, basketUrl);
  assert.equal((await run(orderInput)).url, basketUrl);
  assert.equal(calls.filter(([method, path]) => method === 'POST' && path.endsWith('/orders/')).length, 1);
  assert.equal(submitted.is_completed, false);
  assert.equal(submitted.paid, false);
  assert.deepEqual(submitted.customer, {});
  assert.equal(submitted.reservationnumber, 'SSK-' + ids[0]);
  assert.deepEqual(submitted.orderrows.map(row => [row.count, row.price]), [[1, 374.95], [1, 379.95]]);
  assert.deepEqual(ids.map(id => snapshots.get(id).quote.version), ['ssk-2026-10', 'ssk-2026-10']);
  assert.equal(ids.reduce((total, id) => total + snapshots.get(id).quote.total, 0), 75490);
  for (const [i, row] of submitted.orderrows.entries()) {
    assert.match(row.memo, new RegExp('Snapshot: ' + ids[i]));
    assert.ok(row.memo.includes(saved[i].reference));
    assert.ok(row.memo.includes('thumbText: ' + designs[i].thumbText));
    assert.deepEqual(snapshots.get(ids[i]).bundle, ids);
  }
  assert.equal(notes.length, 1);
  const delivery = await run({action: 'admin-production-links', id: ids[1]}, {user: {role: 'admin'}});
  assert.equal(delivery.orderId, orderId);
  for (const link of delivery.links) assert.ok(notes[0].note.includes(link.url));
  const drafts = [];
  for (const {url} of delivery.links) {
    const [id, token] = new URL(url).hash.slice(1).split('.');
    drafts.push(await run({action: 'production-read', id, token}));
  }
  const packet = await buildFactoryPacket({order: {id: orderId, ordernumber_full: orderNumber}, drafts});
  assert.ok(packet.pdfBytes.length > 0);
  assert.ok(packet.zipBytes.length > 0);
  assert.equal(packet.manifest.orderId, orderId);
  assert.equal(packet.manifest.orderNumber, orderNumber);
  assert.equal(packet.manifest.totalCustomGloves, 2);
  assert.deepEqual(packet.manifest.designs.map(d => [d.id, d.reference, d.design.hand, d.design.webType, d.design.thumbText, d.design.flag]),
    designs.map((d, i) => [ids[i], saved[i].reference, d.hand, d.webType, d.thumbText, d.flag]));
  assert.ok(packet.manifest.designs.every(d => d.previews.length === 4 && d.previews.every(p => !p.available)));
});
