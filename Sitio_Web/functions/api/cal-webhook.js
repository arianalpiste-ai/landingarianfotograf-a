import {
  addUserToAudience,
  findOrCreateAudience,
  hashValue,
  normalizeEmail,
  normalizePhone,
  sendCapiEvent
} from '../lib/meta-capi.js';

const EVENT_SOURCE_URL = 'https://cal.com/arian-alpiste-sarmiento-gzfq0v/15min';

const text = (body, status = 200) => new Response(body, {
  status,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
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
    console.error('cal-webhook: firma inválida o ausente', {
      hasSignature: Boolean(signature),
      hasConfiguredSecret: Boolean(env.CALCOM_WEBHOOK_SECRET)
    });
    return text('Firma inválida', 401);
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return text('JSON inválido', 400); }
  console.log('cal-webhook: payload autenticado recibido', {
    triggerEvent: event.triggerEvent || null,
    payloadType: event.payload?.type || null,
    hasUid: Boolean(event.payload?.uid)
  });
  if (event.triggerEvent && event.triggerEvent !== 'BOOKING_CREATED') {
    console.log('cal-webhook: evento ignorado por trigger', { triggerEvent: event.triggerEvent });
    return text(`Ignorado: trigger "${event.triggerEvent}" no soportado`);
  }

  const payload = event.payload || {};
  const trackedSlug = env.CAL_EVENT_SLUG || '15min';
  if (payload.type !== trackedSlug) {
    console.log('cal-webhook: evento ignorado por slug', { payloadType: payload.type || null, trackedSlug });
    return text(`Ignorado: slug "${payload.type}" no rastreado`);
  }

  const attendee = (payload.attendees || [])[0] || {};
  const [firstName, ...lastNames] = String(attendee.name || '').trim().split(/\s+/).filter(Boolean);
  const hashedEmail = await normalizeEmail(attendee.email);
  const hashedPhone = await normalizePhone(attendee.phoneNumber, env.PHONE_DEFAULT_COUNTRY_CODE || '51');
  const eventId = payload.uid ? `cal-${payload.uid}` : `cal-${crypto.randomUUID()}`;

  try {
    console.log('cal-webhook: enviando Lead a Meta CAPI', {
      eventId,
      pixelId: env.META_PIXEL_ID || null,
      hasEmail: Boolean(hashedEmail),
      hasPhone: Boolean(hashedPhone)
    });
    const metaResult = await sendCapiEvent(env, {
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
    console.log('cal-webhook: Meta CAPI aceptó Lead', {
      eventId,
      eventsReceived: metaResult.events_received ?? null,
      traceId: metaResult.fbtrace_id || null
    });
    const audienceId = await findOrCreateAudience(env, env.CAL_AUDIENCE_NAME || 'Agendaron llamada - Arian Alpiste');
    await addUserToAudience(env, audienceId, { hashedEmail, hashedPhone });
  } catch (error) {
    console.error('cal-webhook: error notificando a Meta', {
      eventId,
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    return text('Recibido, con errores al notificar a Meta (ver logs de Cloudflare Pages)');
  }
  return text('OK');
}

export function onRequest() {
  return text('Method Not Allowed', 405);
}
