import {
  hashValue,
  normalizeEmail,
  normalizePhone,
  sendCapiEvent
} from '../lib/meta-capi.js';

const EVENT_SOURCE_URL = 'https://cal.com/arian-alpiste-sarmiento-gzfq0v/15min';

const text = (body, status = 200) => new Response(body, {
  status,
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const hexToBytes = (hex) => {
  if (!/^[a-f0-9]{64}$/i.test(hex || '')) return null;
  return new Uint8Array(hex.match(/.{2}/g).map((pair) => parseInt(pair, 16)));
};

async function verifySignature(rawBody, signature, secret) {
  const received = hexToBytes(signature);
  if (!received || !secret) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  if (expected.length !== received.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ received[index];
  return difference === 0;
}

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-cal-signature-256');
  if (!(await verifySignature(rawBody, signature, env.CALCOM_WEBHOOK_SECRET))) {
    console.warn('cal-webhook: firma inválida o ausente');
    return text('Firma inválida', 401);
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return text('JSON inválido', 400); }
  if (event.triggerEvent && event.triggerEvent !== 'BOOKING_CREATED') {
    return text(`Ignorado: trigger "${event.triggerEvent}" no soportado`);
  }

  const payload = event.payload || {};
  const trackedSlug = env.CAL_EVENT_SLUG || '15min';
  if (payload.type !== trackedSlug) return text(`Ignorado: slug "${payload.type}" no rastreado`);

  const attendee = (payload.attendees || [])[0] || {};
  const [firstName, ...lastNames] = String(attendee.name || '').trim().split(/\s+/).filter(Boolean);
  const hashedEmail = await normalizeEmail(attendee.email);
  const hashedPhone = await normalizePhone(attendee.phoneNumber, env.PHONE_DEFAULT_COUNTRY_CODE || '51');
  if (!payload.uid) return text('Reserva sin UID; no se puede garantizar idempotencia', 422);
  const eventId = `cal-${payload.uid}`;

  try {
    await sendCapiEvent(env, {
      eventName: 'Lead',
      eventId,
      eventSourceUrl: EVENT_SOURCE_URL,
      userData: {
        em: hashedEmail ? [hashedEmail] : undefined,
        ph: hashedPhone ? [hashedPhone] : undefined,
        fn: firstName ? [await hashValue(firstName)] : undefined,
        ln: lastNames.length ? [await hashValue(lastNames.join(' '))] : undefined
      },
      customData: { content_name: payload.title || trackedSlug }
    });
  } catch (error) {
    console.error('cal-webhook: error notificando a Meta:', error);
    return text('Error temporal al notificar a Meta; Cal.com puede reintentar', 502);
  }
  return text('OK');
}

export function onRequest() {
  return text('Method Not Allowed', 405);
}
