/* Gallery page: lists the designs saved from the configurator.
   Reads the shared localStorage list, renders a card per design, and
   opens a design back in the configurator through its share-link hash. */

import { T } from './glove-catalog.js?v=79ed09cc257578db';
import { loadGallery, removeDesign } from './gallery-store.js?v=ad62ea297ef5739a';

let lang = (() => {
  try { return JSON.parse(localStorage.getItem('ssk-glove-v1'))?.lang === 'en' ? 'en' : 'nl'; }
  catch (e) { return 'nl'; }
})();
const t = (k) => T[lang][k] || k;
const $ = (s) => document.querySelector(s);

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-IE',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

function render() {
  document.documentElement.lang = lang;
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t);
  $('#lang-nl').classList.toggle('is-on', lang === 'nl');
  $('#lang-en').classList.toggle('is-on', lang === 'en');

  const grid = $('#gallery-grid');
  const empty = $('#gallery-empty');
  const list = loadGallery();
  grid.textContent = '';

  if (!list.length) {
    grid.hidden = true;
    empty.hidden = false;
    empty.textContent = t('galleryEmpty');
    return;
  }
  grid.hidden = false;
  empty.hidden = true;

  for (const d of list) {
    const card = document.createElement('article');
    card.className = 'gcard';

    const img = document.createElement('img');
    img.src = d.thumb; img.alt = d.name; img.loading = 'lazy';

    const body = document.createElement('div');
    body.className = 'gcard-body';

    const name = document.createElement('h3');
    name.textContent = d.name;

    const ref = document.createElement('p');
    ref.className = 'gcard-ref';
    ref.textContent = d.refcode;

    const date = document.createElement('p');
    date.className = 'gcard-date';
    date.textContent = t('savedOn').replace('%s', fmtDate(d.savedAt));

    const acts = document.createElement('div');
    acts.className = 'gcard-acts';

    const open = document.createElement('a');
    open.className = 'btn btn-primary';
    open.href = 'index.html#' + d.state;
    open.textContent = t('openDesign');

    const del = document.createElement('button');
    del.className = 'btn btn-ghost';
    del.type = 'button';
    del.textContent = t('deleteDesign');
    del.onclick = () => {
      if (confirm(t('confirmDelete'))) {
        try { removeDesign(d.id); render(); }
        catch { let error = document.querySelector('#gallery-status');
          if (!error) { error = document.createElement('p'); error.id = 'gallery-status'; error.setAttribute('role','status'); grid.before(error); }
          error.textContent = t('gallerySaveFail');
        }
      }
    };

    acts.append(open, del);
    body.append(name, ref, date, acts);
    card.append(img, body);
    grid.appendChild(card);
  }
}

$('#lang-nl').onclick = () => { lang = 'nl'; render(); };
$('#lang-en').onclick = () => { lang = 'en'; render(); };
render();