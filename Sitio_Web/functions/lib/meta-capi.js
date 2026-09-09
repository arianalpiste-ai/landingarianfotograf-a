const GRAPH_VERSION = 'v23.0';

const bytesToHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export async function hashValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return bytesToHex(new Uint8Array(digest));
}

export const normalizeEmail = (email) => hashValue(email);

export async function normalizePhone(phone, defaultCountryCode = '51') {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9) digits = defaultCountryCode + digits;
  return hashValue(digits);
}

const readJson = async (response) => response.json().catch(() => ({}));

export async function sendCapiEvent(env, {
  eventName,
  eventId,
  eventSourceUrl,
  actionSource = 'system_generated',
  userData = {},
  customData = {}
}) {
  const pixelId = env.META_PIXEL_ID;
  const accessToken = env.META_ACCESS_TOKEN;
  if (!pixelId || !accessToken) throw new Error('Faltan META_PIXEL_ID o META_ACCESS_TOKEN en Cloudflare Pages.');

  const cleanUserData = Object.fromEntries(
    Object.entries(userData).filter(([, value]) => value !== undefined && value !== null)
  );
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: actionSource,
        event_source_url: eventSourceUrl,
        user_data: cleanUserData,
        custom_data: customData
      }]
    })
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(`Meta CAPI error (${response.status}): ${JSON.stringify(body)}`);
  return body;
}
