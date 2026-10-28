import CONTRATO from './contrato-eventos.json';
import { LOGO, FIRMA_ARIAN } from './contrato-imagenes.js';
import { contratoPdf, bytesToBase64 } from './contrato-pdf.js';

// Piezas compartidas por /api/contrato (firma del cliente) y /api/contrato-revisar (confirmación de Arian).
export { CONTRATO };
export const PRODUCTION_HOSTS = new Set(['arianalpiste.com', 'www.arianalpiste.com']);
// Versión de la Política de privacidad aceptada (la misma que registra /api/contacto). Cambiarla cuando cambie /privacidad.
export const PRIVACY_VERSION = '27 de octubre de 2026';
export const OWNER_EMAIL = 'hola@arianalpiste.com';
export const SITE = 'https://arianalpiste.com';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
export const soles = (n) => 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
export const fechaLarga = (iso) => new Date(iso + 'T12:00:00-05:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });
export const horaLima = (iso) => new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' });
export const diaLima = (iso) => new Date(iso).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long', year: 'numeric' });

// Datos que se escriben dentro del contrato, a partir de la fila guardada en D1
export function valoresDe(row) {
  const paquete = CONTRATO.paquetes.find((p) => p.id === row.paquete);
  const video = row.modo === 'foto y video';
  return {
    nombre: row.nombre, correo: row.correo, celular: row.celular, evento: String(row.evento).toLowerCase(),
    fecha: fechaLarga(row.fecha_evento), hora: row.hora, direccion: row.direccion, acuerdos: row.acuerdos || '',
    paquete: `${row.paquete} · ${video ? 'Foto y video' : 'Solo foto'}`, horas: paquete.horas[row.evento_tipo] || '', fotos: paquete.fotos,
    video: video ? 'Sí' : 'No', plazo: CONTRATO.plazos[row.modo], total: soles(row.precio), adelanto: soles(row.precio / 2), saldo: soles(row.precio / 2),
    fecha_cliente: `Firmado el ${horaLima(row.creado_en)}`,
    fecha_arian: row.revisado_en ? `Firmado el ${horaLima(row.revisado_en)}` : ''
  };
}

export function registroTexto(row) {
  const partes = [`Contrato N.º ${String(row.id).slice(0, 8)}`, `Firmado por el cliente el ${horaLima(row.creado_en)} (hora de Lima), desde la IP ${row.ip || 'sin dato'}`];
  if (row.estado === 'confirmado' && row.revisado_en) partes.push(`Confirmado y firmado por el fotógrafo el ${horaLima(row.revisado_en)}`);
  partes.push(`Versión del contrato ${CONTRATO.version}, huella ${String(row.contrato_hash).slice(0, 16)}`);
  return partes.join(' · ');
}

// PDF en base64, listo para adjuntar. Sin confirmar: solo la firma del cliente y la marca «pendiente».
export function pdfBase64(row) {
  const confirmado = row.estado === 'confirmado';
  const bytes = contratoPdf({
    CONTRATO, valores: valoresDe(row), logo: LOGO, firmaCliente: row.firma_png,
    firmaArian: confirmado ? FIRMA_ARIAN : null, registro: registroTexto(row), pendiente: !confirmado
  });
  return bytesToBase64(bytes);
}

export async function sendEmail(env, { to, replyTo, subject, html, attachments }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ from: env.CONTACT_FROM || 'Web Arian Alpiste <contacto@formularios.arianalpiste.com>', to: [to], reply_to: replyTo, subject, html, attachments })
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

export const wrapEmail = (inner) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#132A45;max-width:600px">${inner}</div>`;

export function pagoHtml(env, row) {
  if (!env.PAGO_DATOS) return '';
  return `<p style="margin:0 0 8px"><strong>Datos para el adelanto (${escapeHtml(soles(row.precio / 2))}, dentro de las 24 horas):</strong><br>${escapeHtml(env.PAGO_DATOS).replace(/\n/g, '<br>')}</p>`;
}

// Enlace de revisión: solo sirve para ese contrato. La clave es CONTRATO_SECRETO, o la de Resend si no existe.
export async function tokenFor(env, id) {
  const secret = env.CONTRATO_SECRETO || env.RESEND_API_KEY || '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('contrato:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(id))));
  return Array.from(sig.slice(0, 20), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function tokenOk(env, id, token) {
  if (!id || !token) return false;
  const good = await tokenFor(env, id);
  if (good.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
