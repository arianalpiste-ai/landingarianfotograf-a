import { normalizeEmail, normalizePhone, sendCapiEvent } from '../lib/meta-capi.js';
import { PRODUCTION_HOSTS, OWNER_EMAIL, SITE, escapeHtml, valoresDe, pdfBase64, sendEmail, wrapEmail, pagoHtml, tokenOk, horaLima } from '../lib/contrato-comun.js';

// Contrato digital, paso 2 de 2: Arian revisa y confirma (o rechaza) desde el enlace de su correo.
// GET solo muestra la página: los correos y antivirus abren los enlaces solos y eso no debe confirmar nada.
// POST (los botones de la página) confirma: guarda el estado, manda al cliente el PDF firmado por los dos
// y avisa a Meta con el Purchase. Rechazar solo marca el contrato; el cliente no recibe nada.

const page = (title, body, status = 200) => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title>
<style>body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#F5F9FE;color:#132A45;line-height:1.55}
main{max-width:620px;margin:0 auto;padding:28px 18px 60px}h1{font-size:1.5rem;margin:0 0 6px}.muted{color:#4A5F78;font-size:.92rem}
.card{background:#fff;border:1px solid #DCEBF8;border-radius:16px;padding:18px;margin-top:18px}dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0}
dt{color:#4A5F78;font-size:.88rem}dd{margin:0;font-weight:600}.sig{max-width:260px;width:100%;border:1px dashed #9EBFE3;border-radius:12px;background:#fff;margin-top:8px}
.actions{display:grid;gap:10px;margin-top:20px}button{font:inherit;font-weight:700;min-height:52px;border-radius:999px;border:2px solid #1D4C8A;cursor:pointer}
.ok{background:#1D4C8A;color:#fff}.no{background:#fff;color:#B0245A;border-color:#E7B5C8}.tag{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.8rem;font-weight:700}
.p{background:#FFF1C9}.c{background:#DFF3E6;color:#1E6B3A}.r{background:#FDECF2;color:#8E1D48}</style></head><body><main>${body}</main></body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' } });

const ESTADOS = { pendiente: ['Pendiente', 'p'], confirmado: ['Confirmado', 'c'], rechazado: ['Rechazado', 'r'] };

function resumen(row) {
  const v = valoresDe(row);
  const [txt, cls] = ESTADOS[row.estado] || [row.estado, 'p'];
  return `<span class="tag ${cls}">${txt}</span>
  <div class="card"><dl>
    <dt>Cliente</dt><dd>${escapeHtml(row.nombre)}</dd>
    <dt>Correo</dt><dd>${escapeHtml(row.correo)}</dd>
    <dt>Celular</dt><dd>${escapeHtml(row.celular)}</dd>
    <dt>Evento</dt><dd>${escapeHtml(row.evento)}</dd>
    <dt>Paquete</dt><dd>${escapeHtml(v.paquete)}</dd>
    <dt>Fecha</dt><dd>${escapeHtml(v.fecha)} · ${escapeHtml(row.hora)}</dd>
    <dt>Dirección</dt><dd>${escapeHtml(row.direccion)}</dd>
    <dt>Total</dt><dd>${escapeHtml(v.total)} (adelanto ${escapeHtml(v.adelanto)})</dd>
    ${row.acuerdos ? `<dt>Acuerdos</dt><dd>${escapeHtml(row.acuerdos)}</dd>` : ''}
    <dt>Firmó</dt><dd>${escapeHtml(horaLima(row.creado_en))}</dd>
    <dt>Anuncios</dt><dd>${row.acepta_meta ? 'Aceptó' : 'No aceptó'}</dd>
  </dl><img class="sig" src="${escapeHtml(row.firma_png)}" alt="Firma del cliente"></div>`;
}

async function load(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let id = url.searchParams.get('id'), t = url.searchParams.get('t'), accion = '';
  if (request.method === 'POST') {
    const form = await request.formData();
    id = String(form.get('id') || ''); t = String(form.get('t') || ''); accion = String(form.get('accion') || '');
  }
  if (!env.DB || !(await tokenOk(env, id, t))) return { error: page('Enlace no válido', '<h1>Enlace no válido</h1><p class="muted">Abre el enlace completo desde el correo del contrato.</p>', 403) };
  const row = await env.DB.prepare('SELECT * FROM contratos WHERE id = ?').bind(id).first();
  if (!row) return { error: page('No encontrado', '<h1>No encontré ese contrato</h1>', 404) };
  return { row, id, t, accion, url };
}

export async function onRequestGet(context) {
  const r = await load(context);
  if (r.error) return r.error;
  const { row, id, t } = r;
  const botones = row.estado === 'pendiente' ? `<form method="post" class="actions">
      <input type="hidden" name="id" value="${escapeHtml(id)}"><input type="hidden" name="t" value="${escapeHtml(t)}">
      <button class="ok" name="accion" value="confirmar">Confirmar y firmar</button>
      <button class="no" name="accion" value="rechazar">Rechazar</button>
      <p class="muted">Al confirmar, ${escapeHtml(row.nombre.split(' ')[0])} recibe el contrato en PDF firmado por los dos.</p>
    </form>` : `<p class="muted" style="margin-top:18px">Este contrato ya fue ${row.estado === 'confirmado' ? 'confirmado' : 'rechazado'}${row.revisado_en ? ' el ' + escapeHtml(horaLima(row.revisado_en)) : ''}.</p>`;
  return page('Revisar contrato', `<h1>Revisar contrato</h1><p class="muted">Contrato N.º ${escapeHtml(id.slice(0, 8))}</p>${resumen(row)}${botones}`);
}

export async function onRequestPost(context) {
  const r = await load(context);
  if (r.error) return r.error;
  const { row, id, accion, url } = r;
  const { env, request } = context;
  if (row.estado !== 'pendiente') return onRequestGet({ ...context, request: new Request(`${url.origin}${url.pathname}?id=${id}&t=${r.t}`) });
  if (accion !== 'confirmar' && accion !== 'rechazar') return page('Acción no válida', '<h1>Acción no válida</h1>', 400);

  const ahora = new Date().toISOString();
  const estado = accion === 'confirmar' ? 'confirmado' : 'rechazado';
  // Solo pasa de «pendiente» una vez, aunque se presione dos veces
  const upd = await env.DB.prepare("UPDATE contratos SET estado = ?, revisado_en = ? WHERE id = ? AND estado = 'pendiente'").bind(estado, ahora, id).run();
  if (!upd.meta || upd.meta.changes !== 1) return onRequestGet({ ...context, request: new Request(`${url.origin}${url.pathname}?id=${id}&t=${r.t}`) });
  row.estado = estado; row.revisado_en = ahora;

  if (estado === 'rechazado') {
    return page('Contrato rechazado', `<h1>Contrato rechazado</h1><p class="muted">No se le envió nada a ${escapeHtml(row.nombre)}. Escríbele por WhatsApp si hace falta corregir algo.</p>${resumen(row)}`);
  }

  const v = valoresDe(row);
  const avisos = [];
  let adjunto = [];
  try { adjunto = [{ filename: `Contrato-Arian-Alpiste-${id.slice(0, 8)}.pdf`, content: pdfBase64(row) }]; }
  catch (e) { console.error('PDF final', e); avisos.push('No se pudo generar el PDF.'); }
  try {
    await sendEmail(env, {
      to: row.correo, replyTo: OWNER_EMAIL, subject: `Tu contrato confirmado · ${v.paquete} · ${v.fecha}`, attachments: adjunto,
      html: wrapEmail(`<p>Hola, ${escapeHtml(row.nombre.split(' ')[0])}:</p>
        <p>Revisé tu contrato y ya está firmado por los dos. Te lo adjunto en PDF: guárdalo.</p>
        <p style="margin:0 0 8px"><strong>${escapeHtml(v.paquete)}</strong> para tu ${escapeHtml(v.evento)} del ${escapeHtml(v.fecha)} a las ${escapeHtml(row.hora)} · Total ${escapeHtml(v.total)}</p>
        ${pagoHtml(env, row)}
        <p>Cuando hagas el adelanto, mándame el comprobante por WhatsApp al +51 989 789 691 y te confirmo la fecha.</p>
        <p style="font-size:13px;color:#4A5F78">Contrato N.º ${id.slice(0, 8)}</p>`)
    });
  } catch (e) { console.error('Correo final al cliente', e); avisos.push('No se pudo enviar el correo al cliente: reenvíale el PDF.'); }
  try {
    await sendEmail(env, {
      to: OWNER_EMAIL, replyTo: row.correo, subject: `Confirmado: ${row.nombre} · ${v.paquete} · ${v.fecha}`, attachments: adjunto,
      html: wrapEmail(`<p>Confirmaste el contrato de <strong>${escapeHtml(row.nombre)}</strong>. Esta es la versión firmada por los dos que recibió.</p>
        ${avisos.length ? `<p style="color:#B0245A"><strong>Ojo:</strong> ${avisos.map(escapeHtml).join(' ')}</p>` : ''}`)
    });
  } catch (e) { console.error('Copia final a Arian', e); }

  // Meta: la venta cuenta recién ahora. Correo y celular cifrados solo si aceptó la casilla opcional.
  if (PRODUCTION_HOSTS.has(url.hostname)) {
    const userData = { client_ip_address: row.ip || undefined, client_user_agent: row.user_agent || undefined, fbp: row.fbp || undefined, fbc: row.fbc || undefined };
    if (row.acepta_meta) {
      userData.em = [await normalizeEmail(row.correo)];
      userData.ph = [await normalizePhone(row.celular, env.PHONE_DEFAULT_COUNTRY_CODE || '51')];
    }
    const send = sendCapiEvent(env, {
      eventName: 'Purchase', eventId: row.event_id, actionSource: 'website', eventSourceUrl: `${SITE}/contrato`, userData,
      customData: { value: row.precio, currency: 'PEN', content_name: 'Contrato firmado', content_ids: [row.paquete], content_type: 'product', service_line: 'eventos' }
    }).catch((e) => console.error('Meta CAPI (contrato)', e));
    context.waitUntil ? context.waitUntil(send) : await send;
  }

  return page('Contrato confirmado', `<h1>Contrato confirmado</h1><p class="muted">${escapeHtml(row.nombre)} recibió el PDF firmado por los dos.</p>
    ${avisos.length ? `<p style="color:#B0245A">${avisos.map(escapeHtml).join(' ')}</p>` : ''}${resumen(row)}`);
}
