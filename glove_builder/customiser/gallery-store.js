/* Saved designs the user keeps on this device to browse later.
   One list in localStorage, shared by the configurator (save) and the
   gallery page (browse). Nothing here leaves the device. */

const GALLERY_KEY = 'ssk-gallery-v1';
const MAX_DESIGNS = 40;
const validDesign = d => d && typeof d === 'object' &&
  ['id','name','refcode','savedAt','thumb','state'].every(k => typeof d[k] === 'string') &&
  d.id.length > 0 && d.state.length > 0 && /^data:image\/(jpeg|png|webp);base64,/.test(d.thumb);

export function loadGallery() {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(validDesign) : [];
  } catch (e) { return []; }
}

export function saveGallery(list) {
  // Let callers report failure; claiming a save here would lose the design.
  localStorage.setItem(GALLERY_KEY, JSON.stringify(list));
}

export function addDesign(design) {
  const list = loadGallery();
  list.unshift(design);
  if (list.length > MAX_DESIGNS) list.length = MAX_DESIGNS;
  saveGallery(list);
  return design;
}

export function removeDesign(id) {
  saveGallery(loadGallery().filter((d) => d.id !== id));
}

export function getDesign(id) {
  return loadGallery().find((d) => d.id === id) || null;
}