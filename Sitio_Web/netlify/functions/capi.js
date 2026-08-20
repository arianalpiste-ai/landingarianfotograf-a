// netlify/functions/capi.js
//
// Utilidades compartidas para enviar eventos a la Meta Conversions API (CAPI)
// y para gestionar la audiencia personalizada "Agendaron llamada - [Estudio]".
//
// Regla de oro: este archivo NUNCA contiene tokens ni secretos escritos a mano.
// Todo se lee de las variables de entorno de Netlify (Site settings -> Environment variables):
//   META_PIXEL_ID, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID.

const crypto = require('crypto');

// Version de Graph API de Meta. Revisar cada tanto en developers.facebook.com/docs/graph-api/changelog
// y subirla antes de que Meta la marque como deprecada (ventana tipica ~2 anos).
const GRAPH_VERSION = 'v23.0';

/** Normaliza (trim + minusculas) y hashea con SHA256. Devuelve null si no hay valor. */
function hashValue(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/** Normaliza un email antes de hashear. */
function normalizeEmail(email) {
  return hashValue(email);
}

/**
* Normaliza un telefono a formato E.164 sin '+' antes de hashear.
* Si el numero tiene 9 digitos (celular peruano tipico sin codigo de pais),
* antepone el codigo de pais por defecto (51 = Peru).
* Ajustar PHONE_DEFAULT_COUNTRY_CODE en Netlify si el estudio opera en otro pais.
*/
function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  const defaultCountry = process.env.PHONE_DEFAULT_COUNTRY_CODE || '51';
  if (digits.length === 9) {
    digits = defaultCountry + digits;
  }
  return hashValue(digits);
}

/** Envia un evento a Meta Conversions API. event_id permite deduplicar contra el pixel del navegador. */
async function sendCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  actionSource = 'system_generated',
  userData = {},
  customData = {},
}) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    throw new Error('Faltan META_PIXEL_ID o META_ACCESS_TOKEN en las variables de entorno de Netlify.');
  }

// Limpia claves undefined para no mandar campos vacios a Meta.
const cleanUserData = Object.fromEntries(
  Object.entries(userData).filter(([, v]) => v !== undefined && v !== null)
  );

const body = {
  data: [
    {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: actionSource,
      event_source_url: eventSourceUrl,
      user_data: cleanUserData,
      custom_data: customData,
    },
    ],
};

const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Meta CAPI error (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

/** Devuelve el ID de cuenta publicitaria con el prefijo "act_" requerido por la Marketing API. */
function adAccountPath() {
  const raw = process.env.META_AD_ACCOUNT_ID || '';
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

/** Busca una audiencia personalizada por nombre exacto. Devuelve el ID o null si no existe. */
async function findAudienceByName(name) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const account = adAccountPath();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${account}/customaudiences?fields=id,name&limit=200&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Error buscando audiencias (${res.status}): ${JSON.stringify(json)}`);
  }
  const match = (json.data || []).find((a) => a.name === name);
  return match ? match.id : null;
}

/** Crea una audiencia personalizada tipo "Customer list" con el nombre indicado. */
async function createAudience(name) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const account = adAccountPath();
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${account}/customaudiences?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      subtype: 'CUSTOM',
      description: 'Creada automaticamente por netlify/functions/cal-webhook.js (reservas de Cal.com).',
      customer_file_source: 'USER_PROVIDED_ONLY',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Error creando audiencia (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.id;
}

/** find-or-create: busca la audiencia por nombre; si no existe, la crea. */
async function findOrCreateAudience(name) {
  const existing = await findAudienceByName(name);
  if (existing) return existing;
  return createAudience(name);
}

/** Agrega una persona (ya hasheada) a una audiencia personalizada existente. */
async function addUserToAudience(audienceId, { hashedEmail, hashedPhone }) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const schema = [];
  const row = [];
  if (hashedEmail) {
    schema.push('EMAIL');
    row.push(hashedEmail);
  }
  if (hashedPhone) {
    schema.push('PHONE');
    row.push(hashedPhone);
  }
  if (schema.length === 0) return null;

const url = `https://graph.facebook.com/${GRAPH_VERSION}/${audienceId}/users?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: { schema, data: [row] },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Error agregando usuario a audiencia (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

module.exports = {
  hashValue,
  normalizeEmail,
  normalizePhone,
  sendCapiEvent,
  findOrCreateAudience,
  addUserToAudience,
};
