import { CONTRATO, PRIVACY_VERSION, OWNER_EMAIL, SITE, escapeHtml, soles, valoresDe, pdfBase64, sendEmail, wrapEmail, pagoHtml, tokenFor } from '../lib/contrato-comun.js';

// Contrato digital (/contrato), paso 1 de 2: firma del cliente.
// Valida, calcula el precio con la lista oficial y guarda el contrato en D1 (binding DB) como «pendiente».
// Manda al cliente su copia en PDF (solo con su firma, marcada pendiente) con los datos del adelanto, y a Arian
// un aviso con el enlace para revisar y confirmar. Nada lleva la firma de Arian ni avisa a Meta hasta que él
// confirma en /api/contrato-revisar.

const MAX_PER_HOUR = 5;          // contratos por IP en una hora
const MIN_SECONDS = 20;          // nadie llena y firma un contrato en menos tiempo
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const SIGNATURE_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const clean = (value, max) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== (env.ALLOWED_ORIGIN || url.origin)) return json({ ok: false, error: 'Origen no permitido.' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false, error: 'Formato no permitido.' }, 415);

  // La firma ocupa la mayor parte: 400 KB alcanzan de sobra
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
  if (!SIGNATURE_PATTERN.test(input.firma || '') || input.firma.length < 800) faltan.push('tu firma');
  if (input.acepta_privacidad !== 'si') faltan.push('aceptar el contrato y la Política de privacidad');
  if (faltan.length) return json({ ok: false, error: `Falta completar: ${faltan.join(', ')}.` }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 400);
  const ahora = new Date();

  // Límite por IP
  const desde = new Date(ahora.getTime() - 3600 * 1000).toISOString();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM contratos WHERE ip = ? AND creado_en > ?').bind(ip, desde).first();
  if (n >= MAX_PER_HOUR) return json({ ok: false, error: 'Recibí varios contratos desde tu conexión. Escríbeme por WhatsApp y lo vemos.' }, 429);

  // Cookies del Pixel (solo existen si aceptó las cookies); se guardan para el Purchase que sale al confirmar
  const fbp = /^fb\.\d\.\d+\.\d+$/.test(clean(input.fbp, 120)) ? clean(input.fbp, 120) : null;
  const fbc = /^fb\.\d\.\d+\.[\w-]+$/.test(clean(input.fbc, 500)) ? clean(input.fbc, 500) : null;

  const id = crypto.randomUUID();
  const row = {
    id, creado_en: ahora.toISOString(), nombre: d.nombre, correo: d.correo, celular: d.celular,
    evento: d.evento === 'Otro' ? d.evento_otro : d.evento, evento_tipo: d.evento, paquete: paquete.id, modo: d.modo,
    precio: paquete.precios[d.modo], fecha_evento: d.fecha, hora: d.hora, direccion: d.direccion, acuerdos: d.acuerdos,
    acepta_meta: input.acepta_meta === 'si' ? 1 : 0, contrato_hash: CONTRATO.hash, ip, user_agent: userAgent,
    firma_png: input.firma, event_id: `contrato-${id}`, estado: 'pendiente', revisado_en: null, fbp, fbc
  };
  await env.DB.prepare(`INSERT INTO contratos (id, creado_en, nombre, correo, celular, evento, evento_tipo, paquete, modo, precio, fecha_evento, hora,
      direccion, acuerdos, acepta_privacidad, acepta_meta, privacidad_version, contrato_version, contrato_hash, ip, user_agent, firma_png, event_id, estado, fbp, fbc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`)
    .bind(row.id, row.creado_en, row.nombre, row.correo, row.celular, row.evento, row.evento_tipo, row.paquete, row.modo, row.precio,
      row.fecha_evento, row.hora, row.direccion, row.acuerdos, row.acepta_meta, PRIVACY_VERSION, CONTRATO.version, row.contrato_hash,
      row.ip, row.user_agent, row.firma_png, row.event_id, row.fbp, row.fbc)
    .run();

  const v = valoresDe(row);
  let adjunto = [];
  try { adjunto = [{ filename: `Contrato-Arian-Alpiste-${id.slice(0, 8)}-pendiente.pdf`, content: pdfBase64(row) }]; }
  catch (e) { console.error('PDF del contrato', e); }

  // Copia al cliente: su PDF (pendiente de mi firma) y los datos del adelanto
  let clienteOk = true;
  try {
    await sendEmail(env, {
      to: row.correo, replyTo: OWNER_EMAIL, subject: `Recibí tu contrato · ${v.paquete} · ${v.fecha}`, attachments: adjunto,
      html: wrapEmail(`<p>Hola, ${escapeHtml(row.nombre.split(' ')[0])}:</p>
        <p>Gracias por firmar. Te adjunto tu copia del contrato en PDF, con tu firma. Lo reviso y te envío el contrato firmado también por mí.</p>
        <p style="margin:0 0 8px"><strong>${escapeHtml(v.paquete)}</strong> para tu ${escapeHtml(v.evento)} del ${escapeHtml(v.fecha)} a las ${escapeHtml(row.hora)} · Total ${escapeHtml(v.total)}</p>
        ${pagoHtml(env, row)}
        <p>Cuando hagas el adelanto, mándame el comprobante por WhatsApp al +51 989 789 691.</p>
        <p style="font-size:13px;color:#4A5F78">Contrato N.º ${id.slice(0, 8)}</p>`)
    });
  } catch (e) { console.error('Correo al cliente', e); clienteOk = false; }

  // Aviso a Arian con el enlace para revisar y confirmar
  const link = `${SITE}/api/contrato-revisar?id=${id}&t=${await tokenFor(env, id)}`;
  try {
    await sendEmail(env, {
      to: OWNER_EMAIL, replyTo: row.correo, subject: `Revisar contrato: ${row.nombre} · ${v.paquete} · ${v.fecha}`, attachments: adjunto,
      html: wrapEmail(`<p><strong>${escapeHtml(row.nombre)}</strong> firmó el contrato. Revisa los datos y confírmalo para enviarle la versión firmada por ti.</p>
        <p style="margin:0 0 8px">${escapeHtml(v.paquete)} · ${escapeHtml(row.evento)} · ${escapeHtml(v.fecha)} a las ${escapeHtml(row.hora)}<br>
        ${escapeHtml(row.direccion)}<br>Total ${escapeHtml(v.total)} · Adelanto ${escapeHtml(v.adelanto)}<br>
        Correo ${escapeHtml(row.correo)} · Celular ${escapeHtml(row.celular)}</p>
        ${row.acuerdos ? `<p style="margin:0 0 8px"><strong>Otros acuerdos:</strong> ${escapeHtml(row.acuerdos)}</p>` : ''}
        <p style="margin:18px 0"><a href="${link}" style="display:inline-block;background:#1D4C8A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Revisar y confirmar</a></p>
        <p style="margin:0 0 8px"><strong>Registro de consentimiento</strong> (guarda este correo como prueba)<br>
        Contrato y Política de privacidad (versión del ${PRIVACY_VERSION}): aceptados · Uso para anuncios en Meta: ${row.acepta_meta ? 'Sí, aceptado' : 'No aceptado'}<br>
        IP: ${escapeHtml(ip || 'Sin dato')} · Navegador: ${escapeHtml(userAgent || 'Sin dato')}</p>
        ${clienteOk ? '' : '<p style="color:#B0245A"><strong>Ojo:</strong> no se pudo enviar la copia al cliente. Escríbele por WhatsApp.</p>'}
        <p style="font-size:13px;color:#4A5F78">Contrato N.º ${id.slice(0, 8)} · Versión ${escapeHtml(CONTRATO.version)}</p>`)
    });
  } catch (e) { console.error('Correo a Arian', e); }

  // Sin eventId: la página de gracias no manda Purchase. Meta recibe la venta cuando Arian confirma.
  return json({ ok: true, eventId: null, valor: row.precio });
}
