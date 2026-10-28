import { normalizeEmail, normalizePhone, sendCapiEvent } from '../lib/meta-capi.js';
import CONTRATO from '../lib/contrato-eventos.json';

// Contrato digital (/contrato): valida, calcula el precio con la lista oficial, guarda el contrato en D1 (binding DB),
// manda una copia al cliente y otra a Arian por Resend, y avisa a Meta con un Purchase.
// Meta solo recibe correo y celular (cifrados) si la persona marcó la casilla opcional, igual que en /api/contacto.
// El texto del contrato y los paquetes salen de lib/contrato-eventos.json, que genera integrar.py.

const PRODUCTION_HOSTS = new Set(['arianalpiste.com', 'www.arianalpiste.com']);
// Versión de la Política de privacidad aceptada (la misma que registra /api/contacto). Cambiarla cuando cambie /privacidad.
const PRIVACY_VERSION = '27 de octubre de 2026';
const OWNER_EMAIL = 'hola@arianalpiste.com';
const MAX_PER_HOUR = 5;          // contratos por IP en una hora
const MIN_SECONDS = 20;          // nadie llena y firma un contrato en menos tiempo

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const SIGNATURE_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const clean = (value, max) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
const soles = (n) => 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const fechaLarga = (iso) => new Date(iso + 'T12:00:00-05:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });

// Texto del contrato con los datos de la persona: {campo} → valor, [[texto]] → texto resaltado.
function renderContrato(valores) {
  // Los enlaces del texto (por ejemplo, a la Política de privacidad) van como texto con la dirección al lado.
  const inline = (text) => escapeHtml(text.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, '$2 ($1)'))
    .replace(/\{(\w+)\}/g, (_, k) => `<strong>${escapeHtml(valores[k] || '')}</strong>`)
    .replace(/\[\[(.+?)\]\]/g, '<strong>$1</strong>');
  const html = [`<p>${escapeHtml(CONTRATO.intro)}</p>`];
  for (const c of CONTRATO.clausulas) {
    html.push(`<h3 style="margin:20px 0 6px;font-size:15px;color:#1D4C8A">${escapeHtml(c.titulo)}</h3>`);
    for (const b of c.bloques) {
      if (b.si && !valores[b.si]) continue;
      if (b.tabla) {
        const [head, ...rows] = b.tabla;
        html.push('<table style="border-collapse:collapse;margin:6px 0 10px;font-size:14px">'
          + '<tr>' + head.map((h) => `<th style="border:1px solid #DCEBF8;padding:6px 10px;text-align:left;background:#EEF6FD">${escapeHtml(h)}</th>`).join('') + '</tr>'
          + rows.map((r) => '<tr>' + r.map((d) => `<td style="border:1px solid #DCEBF8;padding:6px 10px">${escapeHtml(d)}</td>`).join('') + '</tr>').join('')
          + '</table>');
      } else {
        html.push(`<p style="margin:0 0 8px">${inline(b.texto)}</p>`);
      }
    }
  }
  return html.join('\n');
}

async function sendEmail(env, { to, replyTo, subject, html, attachments }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'Web Arian Alpiste <contacto@formularios.arianalpiste.com>',
      to: [to], reply_to: replyTo, subject, html, attachments
    })
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== (env.ALLOWED_ORIGIN || url.origin)) return json({ ok: false, error: 'Origen no permitido.' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'Formato no permitido.' }, 415);

  // La firma en PNG ocupa la mayor parte: 400 KB alcanzan de sobra
  const raw = await request.text();
  if (raw.length > 400000) return json({ ok: false, error: 'La firma es demasiado grande. Bórrala y firma de nuevo.' }, 413);
  let input;
  try { input = JSON.parse(raw); } catch { return json({ ok: false, error: 'Solicitud inválida.' }, 400); }

  // Robots: campo trampa lleno o envío en menos de MIN_SECONDS → se responde «ok» sin hacer nada
  if (clean(input.sitio, 200) || Number(input.tiempo) < MIN_SECONDS) return json({ ok: true, eventId: null, valor: null });

  if (!env.DB) { console.error('Falta el binding DB (D1) en Cloudflare Pages'); return json({ ok: false, error: 'El contrato no está disponible por ahora. Escríbeme por WhatsApp.' }, 503); }
  if (!env.RESEND_API_KEY) { console.error('Falta el secreto RESEND_API_KEY'); return json({ ok: false, error: 'El servicio de correo no está configurado.' }, 503); }

  // Si la página quedó guardada con una versión vieja del contrato, se pide recargar para que acepte la vigente
  if (input.hash !== CONTRATO.hash) return json({ ok: false, error: 'El contrato se actualizó. Recarga la página y vuelve a firmar.' }, 409);

  const d = {
    evento: clean(input.evento, 20), evento_otro: clean(input.evento_otro, 80), paquete: clean(input.paquete, 20), modo: clean(input.modo, 20),
    fecha: clean(input.fecha, 10), hora: clean(input.hora, 5), direccion: clean(input.direccion, 200), acuerdos: clean(input.acuerdos, 600),
    nombre: clean(input.nombre, 120), correo: clean(input.correo, 160).toLowerCase(), celular: clean(input.celular, 20)
  };
  const paquete = CONTRATO.paquetes.find((p) => p.id === d.paquete);
  const faltan = [];
  if (!CONTRATO.eventos.includes(d.evento)) faltan.push('el tipo de evento');
  if (d.evento === 'Otro' && d.evento_otro.length < 2) faltan.push('qué evento es');
  if (!paquete || !paquete.horas[d.evento] || !CONTRATO.plazos[d.modo]) faltan.push('el paquete');
  if (!DATE_PATTERN.test(d.fecha)) faltan.push('la fecha');
  if (!TIME_PATTERN.test(d.hora)) faltan.push('la hora de llegada');
  if (d.direccion.length < 5) faltan.push('la dirección');
  if (d.nombre.length < 3) faltan.push('tu nombre completo');
  if (!EMAIL_PATTERN.test(d.correo)) faltan.push('un correo válido');
  if (d.celular.replace(/\D/g, '').length < 9) faltan.push('un celular válido');
  if (!SIGNATURE_PATTERN.test(input.firma || '') || input.firma.length < 2000) faltan.push('tu firma');
  if (input.acepta_privacidad !== 'si') faltan.push('aceptar el contrato y la Política de privacidad');
  if (faltan.length) return json({ ok: false, error: `Falta completar: ${faltan.join(', ')}.` }, 400);

  const aceptaMeta = input.acepta_meta === 'si';
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 400);
  const ahora = new Date();
  const ahoraLima = ahora.toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'medium' });

  // Límite por IP
  const desde = new Date(ahora.getTime() - 3600 * 1000).toISOString();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM contratos WHERE ip = ? AND creado_en > ?').bind(ip, desde).first();
  if (n >= MAX_PER_HOUR) return json({ ok: false, error: 'Recibí varios contratos desde tu conexión. Escríbeme por WhatsApp y lo vemos.' }, 429);

  // Precio con la lista oficial: nunca el que manda el navegador
  const total = paquete.precios[d.modo];
  const eventoTxt = d.evento === 'Otro' ? d.evento_otro : d.evento;
  const valores = {
    nombre: d.nombre, correo: d.correo, celular: d.celular, evento: eventoTxt.toLowerCase(), fecha: fechaLarga(d.fecha), hora: d.hora,
    direccion: d.direccion, acuerdos: d.acuerdos, paquete: `${paquete.id} · ${d.modo === 'foto y video' ? 'Foto y video' : 'Solo foto'}`,
    horas: paquete.horas[d.evento], fotos: paquete.fotos, video: d.modo === 'foto y video' ? 'Sí' : 'No', plazo: CONTRATO.plazos[d.modo],
    total: soles(total), adelanto: soles(total / 2), saldo: soles(total / 2)
  };

  const id = crypto.randomUUID();
  const eventId = `contrato-${id}`;
  await env.DB.prepare(`INSERT INTO contratos (id, creado_en, nombre, correo, celular, evento, paquete, modo, precio, fecha_evento, hora, direccion, acuerdos,
      acepta_privacidad, acepta_meta, privacidad_version, contrato_version, contrato_hash, ip, user_agent, firma_png, event_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, ahora.toISOString(), d.nombre, d.correo, d.celular, eventoTxt, paquete.id, d.modo, total, d.fecha, d.hora, d.direccion, d.acuerdos,
      aceptaMeta ? 1 : 0, PRIVACY_VERSION, CONTRATO.version, CONTRATO.hash, ip, userAgent, input.firma, eventId)
    .run();

  // Correos: copia al cliente (con los datos de pago) y aviso a Arian (con el registro completo)
  const contratoHtml = renderContrato(valores);
  const firma = [{ filename: 'firma.png', content: input.firma.split(',')[1] }];
  const pago = env.PAGO_DATOS ? `<p style="margin:0 0 8px"><strong>Datos para el adelanto (${escapeHtml(valores.adelanto)}, dentro de las 24 horas):</strong><br>${escapeHtml(env.PAGO_DATOS).replace(/\n/g, '<br>')}</p>` : '';
  const registro = `<p style="font-size:13px;color:#4A5F78">Aceptado el ${escapeHtml(ahoraLima)} (hora de Lima) · Versión del contrato ${escapeHtml(CONTRATO.version)} · Huella ${CONTRATO.hash.slice(0, 16)} · Política de privacidad del ${PRIVACY_VERSION} · N.º ${id.slice(0, 8)}</p>`;
  const wrap = (inner) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#132A45;max-width:640px">${inner}</div>`;
  const errores = [];
  try {
    await sendEmail(env, {
      to: d.correo, replyTo: OWNER_EMAIL, subject: `Tu contrato con Arian Alpiste · ${valores.paquete} · ${valores.fecha}`, attachments: firma,
      html: wrap(`<p>Hola, ${escapeHtml(d.nombre.split(' ')[0])}:</p><p>Gracias por firmar. Aquí está tu contrato completo, con los datos que llenaste. Guárdalo.</p>
        <p style="margin:0 0 8px"><strong>${escapeHtml(valores.paquete)}</strong> para tu ${escapeHtml(valores.evento)} del ${escapeHtml(valores.fecha)} · Total ${escapeHtml(valores.total)}</p>
        ${pago}<p>Cuando hagas el adelanto, mándame el comprobante por WhatsApp al +51 989 789 691 y te confirmo la fecha.</p>
        <hr style="border:0;border-top:1px solid #DCEBF8;margin:20px 0">${contratoHtml}<hr style="border:0;border-top:1px solid #DCEBF8;margin:20px 0">${registro}`)
    });
  } catch (e) { console.error('Correo al cliente', e); errores.push('cliente'); }
  try {
    await sendEmail(env, {
      to: OWNER_EMAIL, replyTo: d.correo, subject: `Contrato firmado: ${d.nombre} · ${valores.paquete} · ${valores.fecha}`, attachments: firma,
      html: wrap(`<p><strong>${escapeHtml(d.nombre)}</strong> firmó el contrato.</p>
        <p style="margin:0 0 8px">${escapeHtml(valores.paquete)} · ${escapeHtml(eventoTxt)} · ${escapeHtml(valores.fecha)} a las ${escapeHtml(d.hora)} · ${escapeHtml(d.direccion)}<br>
        Total ${escapeHtml(valores.total)} · Adelanto ${escapeHtml(valores.adelanto)} · Correo ${escapeHtml(d.correo)} · Celular ${escapeHtml(d.celular)}</p>
        ${d.acuerdos ? `<p style="margin:0 0 8px"><strong>Otros acuerdos:</strong> ${escapeHtml(d.acuerdos)}</p>` : ''}
        <p style="margin:0 0 8px"><strong>Registro de consentimiento</strong> (guarda este correo como prueba)<br>
        Contrato y Política de privacidad: aceptados · Uso para anuncios en Meta: ${aceptaMeta ? 'Sí, aceptado' : 'No aceptado'}<br>
        IP: ${escapeHtml(ip || 'Sin dato')} · Navegador: ${escapeHtml(userAgent || 'Sin dato')}</p>
        ${errores.length ? '<p style="color:#B0245A"><strong>Ojo:</strong> no se pudo enviar la copia al cliente. Reenvíale este correo.</p>' : ''}
        <hr style="border:0;border-top:1px solid #DCEBF8;margin:20px 0">${contratoHtml}<hr style="border:0;border-top:1px solid #DCEBF8;margin:20px 0">${registro}`)
    });
  } catch (e) { console.error('Correo a Arian', e); }

  // Meta: Purchase desde el servidor, con el mismo ID que el de la página de gracias (Meta junta los dos en uno).
  // En vistas previas y pruebas locales no se envía. Sin la casilla opcional, va sin correo ni celular.
  if (PRODUCTION_HOSTS.has(url.hostname)) {
    const fbp = /^fb\.\d\.\d+\.\d+$/.test(clean(input.fbp, 120)) ? clean(input.fbp, 120) : undefined;
    const fbc = /^fb\.\d\.\d+\.[\w-]+$/.test(clean(input.fbc, 500)) ? clean(input.fbc, 500) : undefined;
    const userData = { client_ip_address: ip || undefined, client_user_agent: userAgent || undefined, fbp, fbc };
    if (aceptaMeta) {
      userData.em = [await normalizeEmail(d.correo)];
      userData.ph = [await normalizePhone(d.celular, env.PHONE_DEFAULT_COUNTRY_CODE || '51')];
    }
    const send = sendCapiEvent(env, {
      eventName: 'Purchase', eventId, actionSource: 'website', eventSourceUrl: 'https://arianalpiste.com/contrato', userData,
      customData: { value: total, currency: 'PEN', content_name: 'Contrato firmado', content_ids: [paquete.id], content_type: 'product', service_line: 'eventos' }
    }).catch((e) => console.error('Meta CAPI (contrato)', e));
    context.waitUntil ? context.waitUntil(send) : await send;
  }

  return json({ ok: true, eventId, valor: total });
}
