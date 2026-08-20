// netlify/functions/cal-webhook.js
//
// Recibe el webhook "Booking created" de Cal.com para el evento
// https://cal.com/arian-alpiste-sarmiento-gzfq0v/15min y:
//   1) Verifica la firma HMAC (header x-cal-signature-256) contra CALCOM_WEBHOOK_SECRET.
//   2) Filtra por el slug del tipo de evento que queremos rastrear (CAL_EVENT_SLUG).
//   3) Envia un evento "Lead" a Meta Conversions API con event_id para deduplicar
//      contra el pixel del navegador (si en el futuro se agrega el pixel base).
//   4) Agrega a la persona (hasheada) a la audiencia personalizada
//      "Agendaron llamada - [Estudio]" (find-or-create automatico).
//
// Nunca escribas tokens ni secretos en este archivo: todos viven en las
// variables de entorno de Netlify (Site settings -> Environment variables).

const crypto = require('crypto');
const {
  hashValue,
  normalizeEmail,
  normalizePhone,
  sendCapiEvent,
  findOrCreateAudience,
  addUserToAudience,
} = require('./capi');

// Slug del evento de Cal.com a rastrear: la ultima parte de la URL.
// https://cal.com/arian-alpiste-sarmiento-gzfq0v/15min -> "15min"
const TRACKED_EVENT_SLUG = process.env.CAL_EVENT_SLUG || '15min';

// Nombre de la audiencia personalizada a alimentar en Meta Ads.
// Se puede sobreescribir agregando CAL_AUDIENCE_NAME en Netlify sin tocar codigo.
const AUDIENCE_NAME = process.env.CAL_AUDIENCE_NAME || 'Agendaron llamada - Arian Alpiste';

// URL del evento, usada como event_source_url en el evento CAPI.
const EVENT_SOURCE_URL = 'https://cal.com/arian-alpiste-sarmiento-gzfq0v/15min';

/** Verifica la firma HMAC-SHA256 que Cal.com manda en x-cal-signature-256. */
function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const rawBody = event.body || '';
  const headers = event.headers || {};
  const signature = headers['x-cal-signature-256'] || headers['X-Cal-Signature-256'];
  const secret = process.env.CALCOM_WEBHOOK_SECRET;

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn('cal-webhook: firma invalida o ausente');
    return { statusCode: 401, body: 'Firma invalida' };
  }

  let json;
  try {
    json = JSON.parse(rawBody);
  } catch (err) {
    return { statusCode: 400, body: 'JSON invalido' };
  }

  // Solo nos interesan las reservas nuevas.
  if (json.triggerEvent && json.triggerEvent !== 'BOOKING_CREATED') {
    return { statusCode: 200, body: `Ignorado: trigger "${json.triggerEvent}" no soportado` };
  }

  const payload = json.payload || {};

  // Filtro por slug: sin esto, cualquier otro tipo de evento de Cal.com
  // (ej. una consulta de 30min, una sesion de fotos, etc.) contaminaria la audiencia.
  if (payload.type !== TRACKED_EVENT_SLUG) {
    return { statusCode: 200, body: `Ignorado: slug "${payload.type}" no rastreado` };
  }

  const attendee = (payload.attendees && payload.attendees[0]) || {};
  const email = attendee.email;
  const phone = attendee.phoneNumber;
  const fullName = (attendee.name || '').trim();
  const [firstName, ...restName] = fullName.split(/\s+/).filter(Boolean);
  const lastName = restName.join(' ');

  const hashedEmail = normalizeEmail(email);
  const hashedPhone = normalizePhone(phone);
  const hashedFirstName = firstName ? hashValue(firstName) : null;
  const hashedLastName = lastName ? hashValue(lastName) : null;

  // UID de la reserva de Cal.com: identificador unico y estable para deduplicar.
  const eventId = payload.uid ? `cal-${payload.uid}` : `cal-${Date.now()}`;

  try {
    // 1) Evento CAPI (Lead) con deduplicacion por event_id.
  await sendCapiEvent({
    eventName: 'Lead',
    eventId,
    eventSourceUrl: EVENT_SOURCE_URL,
    actionSource: 'system_generated',
    userData: {
      em: hashedEmail ? [hashedEmail] : undefined,
      ph: hashedPhone ? [hashedPhone] : undefined,
      fn: hashedFirstName ? [hashedFirstName] : undefined,
      ln: hashedLastName ? [hashedLastName] : undefined,
    },
    customData: {
      content_name: payload.title || TRACKED_EVENT_SLUG,
    },
  });

  // 2) Audiencia personalizada: find-or-create + agregar usuario hasheado.
  const audienceId = await findOrCreateAudience(AUDIENCE_NAME);
    if (audienceId) {
      await addUserToAudience(audienceId, { hashedEmail, hashedPhone });
    }
  } catch (err) {
    // Respondemos 200 igual para que Cal.com no reintente indefinidamente,
  // pero dejamos el error en los logs de Netlify Functions para depurar.
  console.error('cal-webhook: error notificando a Meta:', err);
    return { statusCode: 200, body: 'Recibido, con errores al notificar a Meta (ver logs de Netlify)' };
  }

  return { statusCode: 200, body: 'OK' };
};
