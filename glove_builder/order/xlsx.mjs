/* A workbook with one sheet, written without a dependency.

   An .xlsx is a zip of XML parts. This writes the five parts Excel, Numbers
   and Google Sheets need to open a plain table, with every cell as an
   inline string or a number, and deflates them with Node's zlib. Enough for
   an order sheet; nothing here formats or formulas.

   Node only (zlib, Buffer). Used by api/order.mjs. */

import { deflateRawSync } from 'node:zlib';

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** files: [{name, data: Buffer|string}] -> Buffer of a zip (deflate). */
export function zip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  // A fixed DOS date: the workbook's own timestamps are its content, not
  // its zip entries, and a constant keeps two writes of one order identical.
  const dosTime = 0, dosDate = (46 << 9) | (1 << 5) | 1;   // 2026-01-01
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, 'utf8');
    const comp = deflateRawSync(raw, { level: 6 });
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);              // UTF-8 names
    local.writeUInt16LE(8, 8);                   // deflate
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, comp);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10); central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32); central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36); central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, end]);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Control characters are not allowed in XML 1.0 at all.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

export function colLetter(i) {           // 0 -> A, 26 -> AA
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** rows: array of arrays (string | number | ''), sheetName, widths: [n…] in
    characters per column (optional). Returns a Buffer. */
export function workbook(rows, sheetName = 'Sheet1', widths = null) {
  const xmlRows = rows.map((cells, r) => {
    const xs = cells.map((v, c) => {
      const ref = colLetter(c) + (r + 1);
      if (v === '' || v === null || v === undefined) return '';
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${xs}</row>`;
  }).join('');
  const cols = widths
    ? '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>'
    : '';
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${xmlRows}</sheetData></worksheet>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  return zip([
    { name: '[Content_Types].xml', data: types },
    { name: '_rels/.rels', data: rels },
    { name: 'xl/workbook.xml', data: wb },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    { name: 'xl/worksheets/sheet1.xml', data: sheet },
  ]);
}
