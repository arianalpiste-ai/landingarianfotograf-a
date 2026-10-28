// PDF del contrato, armado a mano (sin librerías): A4, Helvetica y Helvetica-Bold con codificación WinAnsi
// (cubre tildes, ñ, ¿ ¡ « » ·), imágenes JPEG (logo y firmas) y pie con número de página.
// Uso: const bytes = contratoPdf({ CONTRATO, valores, firmaCliente, firmaArian, registro, pendiente });

const W = 595.28, H = 841.89, M = 56;              // A4 en puntos y margen
const BLUE = '0.114 0.298 0.541', INK = '0.075 0.165 0.271', SOFT = '0.29 0.373 0.471';

// Anchos de Helvetica y Helvetica-Bold (AFM) para los caracteres 32–126; el resto usa su letra base.
const HV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const BASE = { 'á':'a','à':'a','â':'a','ä':'a','é':'e','è':'e','ê':'e','ë':'e','í':'i','ì':'i','î':'i','ï':'i','ó':'o','ò':'o','ô':'o','ö':'o','ú':'u','ù':'u','û':'u','ü':'u','ñ':'n','ç':'c','Á':'A','À':'A','É':'E','È':'E','Í':'I','Ó':'O','Ú':'U','Ü':'U','Ñ':'N','Ç':'C' };
const EXTRA = { '¿':611, '¡':333, '«':556, '»':556, '·':278, '°':400, 'º':365, 'ª':370, '“':333, '”':333, '‘':222, '’':222, '–':556, '—':1000, '…':1000, '•':350, '€':556, '×':584 };
// Bytes WinAnsi de los caracteres fuera de Latin-1
const WINANSI = { '€':0x80, '‚':0x82, '„':0x84, '…':0x85, '•':0x95, '–':0x96, '—':0x97, '‘':0x91, '’':0x92, '“':0x93, '”':0x94, '™':0x99 };

function charWidth(ch, bold) {
  const t = bold ? HB : HV, c = ch.charCodeAt(0);
  if (c >= 32 && c <= 126) return t[c - 32];
  if (BASE[ch]) return t[BASE[ch].charCodeAt(0) - 32];
  return EXTRA[ch] || 556;
}
const textWidth = (s, size, bold) => [...s].reduce((w, ch) => w + charWidth(ch, bold), 0) * size / 1000;

// Texto a cadena literal de PDF (bytes WinAnsi, con \ ( ) escapados)
function pdfString(s) {
  let out = '(';
  for (const ch of s) {
    let c = ch.charCodeAt(0);
    if (WINANSI[ch]) c = WINANSI[ch];
    else if (c > 255) c = 63; // ?
    if (c === 40 || c === 41 || c === 92) out += '\\' + ch;
    else if (c < 32 || c > 126) out += '\\' + c.toString(8).padStart(3, '0');
    else out += ch;
  }
  return out + ')';
}

// Tamaño de un JPEG leyendo su marcador SOF
function jpegSize(bytes) {
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xFF) { i++; continue; }
    const m = bytes[i + 1], len = (bytes[i + 2] << 8) | bytes[i + 3];
    if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB) || (m >= 0xCD && m <= 0xCF)) {
      return { h: (bytes[i + 5] << 8) | bytes[i + 6], w: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + len;
  }
  throw new Error('JPEG sin tamaño');
}
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const latin1 = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xFF);

export function contratoPdf({ CONTRATO, valores, firmaCliente, firmaArian, logo, registro, pendiente }) {
  const images = [];                     // { name, bytes, w, h }
  const addImage = (b64) => {
    if (!b64) return null;
    const bytes = b64ToBytes(b64.replace(/^data:image\/jpeg;base64,/, ''));
    const { w, h } = jpegSize(bytes);
    const img = { name: `Im${images.length + 1}`, bytes, w, h };
    images.push(img);
    return img;
  };
  const imLogo = addImage(logo), imCliente = addImage(firmaCliente), imArian = addImage(firmaArian);

  const pages = [];
  let ops = [], y = H - M;
  const newPage = () => { ops = []; pages.push(ops); y = H - M; };
  const ensure = (need) => { if (y - need < M + 30) newPage(); };
  const text = (x, yy, s, size, bold, color = INK) => ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg ${x.toFixed(2)} ${yy.toFixed(2)} Td ${pdfString(s)} Tj ET`);
  const image = (im, x, yy, w) => { const h = w * im.h / im.w; ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${yy.toFixed(2)} cm /${im.name} Do Q`); return h; };
  const line = (x1, y1, x2, y2, color = '0.86 0.92 0.97') => ops.push(`${color} RG 0.8 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);

  // Párrafo con partes en negrita: runs = [{ t, b }]
  function paragraph(runs, { size = 10, lead = 14.5, indent = 0, color = INK, after = 6 } = {}) {
    const words = [];
    for (const r of runs) for (const part of r.t.split(/(\s+)/)) if (part) words.push({ t: part, b: r.b });
    const maxW = W - 2 * M - indent;
    let lineWords = [], lineW = 0;
    const flush = () => {
      while (lineWords.length && /^\s+$/.test(lineWords[lineWords.length - 1].t)) lineWords.pop();
      if (!lineWords.length) return;
      ensure(lead); y -= lead;
      let x = M + indent;
      for (const w of lineWords) { if (!/^\s+$/.test(w.t) || x > M + indent) { text(x, y, w.t, size, w.b, color); } x += textWidth(w.t, size, w.b); }
      lineWords = []; lineW = 0;
    };
    for (const w of words) {
      const ww = textWidth(w.t, size, w.b);
      if (lineW + ww > maxW && !/^\s+$/.test(w.t)) flush();
      if (!lineWords.length && /^\s+$/.test(w.t)) continue;
      lineWords.push(w); lineW += ww;
    }
    flush();
    y -= after;
  }
  // {campo} → valor en negrita; [[texto]] → negrita; enlaces → texto (dirección)
  const runsFrom = (tpl) => {
    const s = tpl.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, '$2 ($1)');
    const runs = []; let last = 0;
    for (const m of s.matchAll(/\{(\w+)\}|\[\[(.+?)\]\]/g)) {
      if (m.index > last) runs.push({ t: s.slice(last, m.index), b: false });
      runs.push({ t: m[1] ? String(valores[m[1]] || '') : m[2], b: true });
      last = m.index + m[0].length;
    }
    if (last < s.length) runs.push({ t: s.slice(last), b: false });
    return runs;
  };

  newPage();
  // Encabezado: logo, título y estado
  if (imLogo) { const w = 150; const h = w * imLogo.h / imLogo.w; y -= h; image(imLogo, (W - w) / 2, y, w); y -= 14; }
  const title = 'Contrato de servicio fotográfico';
  y -= 18; text((W - textWidth(title, 18, true)) / 2, y, title, 18, true, BLUE);
  y -= 16; const sub = 'Cobertura de eventos'; text((W - textWidth(sub, 11, false)) / 2, y, sub, 11, false, SOFT);
  if (pendiente) { y -= 20; const p = 'PENDIENTE DE CONFIRMACIÓN DEL FOTÓGRAFO'; text((W - textWidth(p, 9, true)) / 2, y, p, 9, true, '0.69 0.14 0.35'); }
  y -= 14;
  paragraph([{ t: CONTRATO.intro, b: false }], { color: SOFT });

  for (const c of CONTRATO.clausulas) {
    ensure(40); y -= 8;
    text(M, y - 12, c.titulo, 11.5, true, BLUE); y -= 18;
    for (const b of c.bloques) {
      if (b.si && !valores[b.si]) continue;
      if (b.tabla) {
        const [head, ...rows] = b.tabla, colW = (W - 2 * M) / head.length, rowH = 20;
        ensure(rowH * (rows.length + 1) + 8);
        const top = y;
        [head, ...rows].forEach((r, i) => {
          y -= rowH;
          r.forEach((cell, j) => text(M + j * colW + 8, y + 6.5, cell, 9.5, i === 0));
          line(M, y, W - M, y);
        });
        line(M, top, W - M, top); line(M, top, M, y); line(W - M, top, W - M, y); line(M + colW, top, M + colW, y);
        y -= 10;
      } else {
        paragraph(runsFrom(b.texto));
      }
    }
  }

  // Firmas
  ensure(190); y -= 18;
  line(M, y, W - M, y, '0.75 0.82 0.9'); y -= 22;
  text(M, y, 'Firmas', 11.5, true, BLUE); y -= 14;
  const colW = (W - 2 * M - 30) / 2, boxH = 80, top = y;
  const firmaBox = (x, label, im, nombre, fecha, vacio) => {
    let yy = top;
    text(x, yy - 10, label, 9, true, SOFT);
    yy -= 16 + boxH;
    if (im) { const w = Math.min(colW * 0.8, (boxH - 12) * im.w / im.h); image(im, x, yy + 4, w); }
    else if (vacio) text(x, yy + boxH / 2, vacio, 9.5, false, '0.69 0.14 0.35');
    line(x, yy, x + colW, yy, '0.45 0.52 0.6');
    text(x, yy - 14, nombre, 10, true); text(x, yy - 28, fecha, 9, false, SOFT);
    return yy - 28;
  };
  const yA = firmaBox(M, 'El fotógrafo', imArian, 'Arian Leonel Alpiste Sarmiento', valores.fecha_arian || '', pendiente ? 'Pendiente de confirmación' : '');
  const yB = firmaBox(M + colW + 30, 'El cliente', imCliente, valores.nombre, valores.fecha_cliente || '', '');
  y = Math.min(yA, yB) - 22;
  if (registro) paragraph([{ t: registro, b: false }], { size: 8, lead: 11, color: SOFT });

  // Pie de página
  const total = pages.length;
  pages.forEach((p, i) => {
    const foot = 'Arian Alpiste · arianalpiste.com · WhatsApp +51 989 789 691';
    p.push(`BT /F1 8 Tf ${SOFT} rg ${M} 30 Td ${pdfString(foot)} Tj ET`);
    const n = `${i + 1} / ${total}`;
    p.push(`BT /F1 8 Tf ${SOFT} rg ${(W - M - textWidth(n, 8, false)).toFixed(2)} 30 Td ${pdfString(n)} Tj ET`);
  });

  // Ensamblado de objetos
  const objs = [];                         // cada uno: Uint8Array
  const add = (s) => { objs.push(typeof s === 'string' ? latin1(s) : s); return objs.length; };
  const fontEnc = '/Encoding /WinAnsiEncoding';
  const f1 = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica ${fontEnc} >>`);
  const f2 = add(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold ${fontEnc} >>`);
  const imgIds = images.map((im) => {
    const head = latin1(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`);
    const tail = latin1('\nendstream');
    const all = new Uint8Array(head.length + im.bytes.length + tail.length);
    all.set(head); all.set(im.bytes, head.length); all.set(tail, head.length + im.bytes.length);
    return add(all);
  });
  const xobj = images.map((im, i) => `/${im.name} ${imgIds[i]} 0 R`).join(' ');
  const resources = `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << ${xobj} >> >>`;
  const pagesId = objs.length + 1 + pages.length * 2; // se reserva el número del nodo Pages
  const pageIds = pages.map((p) => {
    const content = p.join('\n');
    const cId = add(`<< /Length ${latin1(content).length} >>\nstream\n${content}\nendstream`);
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources ${resources} /Contents ${cId} 0 R >>`);
  });
  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const info = add(`<< /Title ${pdfString('Contrato de servicio fotográfico · Arian Alpiste')} /Producer (arianalpiste.com) >>`);

  const chunks = [latin1('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  let offset = chunks[0].length;
  const offsets = [];
  objs.forEach((o, i) => {
    const head = latin1(`${i + 1} 0 obj\n`), tail = latin1('\nendobj\n');
    offsets.push(offset);
    chunks.push(head, o, tail);
    offset += head.length + o.length + tail.length;
  });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  chunks.push(latin1(xref));
  const total2 = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total2);
  let at = 0; for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

// Bytes a base64 (para adjuntar en Resend)
export function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
