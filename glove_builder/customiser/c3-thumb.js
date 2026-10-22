/* Contract C3 (outputs/2d-finish-plan/CONTRACT-C3.json). For the webs it
   lists, the thumb side is drawn on a generated body — never the photograph —
   and per Scott's 29 Sep correction (draft-3) there are TWO body families,
   ONE fixed webless body each, and one web-local insert per web:
     - i  : standard-i, spiral-i share the webless i-fixed body.
     - em : smlee, em-rocket, closed-diamond-net share the webless em-fixed body.
   Until the installer writes a REVIEWED block, or if a body's layers or ANY
   insert of a web in its servesWebs is missing, there is no view for that
   body and the photographed thumb side behaves exactly as before. */
const C3_ROLES = ['leather', 'laces', 'stitching', 'palm', 'cut', 'idmap'];
/* The route is driven by this table, not by data-block keys: an edited
   thumb-data.json cannot invent a body id, swap a family or claim a web. */
const C3_FAMILIES = Object.freeze({
  'i-fixed':  Object.freeze({ family: 'i',  servesWebs: Object.freeze(['standard-i', 'spiral-i']) }),
  'em-fixed': Object.freeze({ family: 'em', servesWebs: Object.freeze(['smlee', 'em-rocket', 'closed-diamond-net']) })
});
export function estimatedThumbViews(v) {
  const B = v && v.ready !== false && v.DATA.estimatedBody;
  if (!B || B.contractRevision !== 'C3' || B.status !== 'REVIEWED'
      || B.label !== 'estimated' || !B.bodies) return null;
  const views = {}, bodyOfWeb = {}, inserts = (B.inserts && typeof B.inserts === 'object') ? B.inserts : {};
  for (const [bodyId, spec] of Object.entries(C3_FAMILIES)) {
    const body = B.bodies[bodyId];
    if (!body || body.family !== spec.family || !body.thumbCircle
        || !Array.isArray(body.servesWebs)
        || body.servesWebs.length !== spec.servesWebs.length
        || !spec.servesWebs.every(s => body.servesWebs.includes(s))) continue;
    if (body.servesWebs.some(s => bodyOfWeb[s])) continue;
    if (!body.servesWebs.every(s => inserts[s] && typeof inserts[s] === 'object')) continue;
    const imgs = {}, bbox = {};
    if (v.imgs._hdLeather) imgs._hdLeather = v.imgs._hdLeather;
    if (v.imgs._hdLace) imgs._hdLace = v.imgs._hdLace;
    if (v.imgs._snakeLeather) imgs._snakeLeather = v.imgs._snakeLeather;
    let ok = true;
    const take = (name, key) => {
      if (!key || !v.imgs[key]) { ok = false; return; }
      imgs[name] = v.imgs[key];
      if (v.DATA.bbox[key]) bbox[name] = v.DATA.bbox[key];
    };
    for (const [name, key] of Object.entries(body.layers || {})) take(name, key);
    for (const s of body.servesWebs) for (const key of Object.values(inserts[s])) take(key, key);
    const extra = (body.zones || []).filter(z => z.id === 'welting' && z.n === 10
      && z.field === 'welting' && z.group === 'lace').slice(0, 1);
    const zones = [...v.DATA.zones, ...extra.filter(z => !v.DATA.zones.some(base => base.id === z.id))];
    if (!ok || !imgs.glove || !imgs._idmap || !imgs.thumb_circle_art
        || !zones.every(z => imgs[z.id] && bbox[z.id])
        || !body.servesWebs.every(s => C3_ROLES.every(r => imgs[inserts[s][r]] && bbox[inserts[s][r]]))) continue;
    const shown = extra.map(z => z.field);
    const thumbWebs = Object.fromEntries(body.servesWebs.map(s => [s, inserts[s]]));
    const DATA = { ...v.DATA, zones, bbox, thumbWebs, thumbCircle: body.thumbCircle,
                   surfaceDetails: null,
                   sheen: body.sheen || {}, webMarker: null,
                   fieldsShown: [...v.DATA.fieldsShown, ...shown],
                   fieldsNotShown: v.DATA.fieldsNotShown.filter(f => !shown.includes(f)) };
    const c = document.createElement('canvas');
    c.width = DATA.w; c.height = DATA.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(imgs._idmap, 0, 0);
    const viewName = 'thumbEstimated:' + bodyId;
    views[viewName] = { DATA, imgs, idData: g.getImageData(0, 0, DATA.w, DATA.h).data };
    for (const s of body.servesWebs) bodyOfWeb[s] = viewName;
  }
  return Object.keys(views).length ? { views, bodyOfWeb } : null;
}