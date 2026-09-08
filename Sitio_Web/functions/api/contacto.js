const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_TYPES = new Set([
  'Boda',
  'Quinceañero',
  'Bautizo',
  'Graduación',
  'Evento corporativo',
  'Cumpleaños',
  'Sesión de retratos',
  'Otro'
]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const clean = (value, maxLength) => typeof value === 'string'
  ? value.trim().slice(0, maxLength)
  : '';

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
})[character]);

export async function onRequestPost(context) {
  const { request, env } = context;
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowedOrigin = env.ALLOWED_ORIGIN || requestUrl.origin;
  const contentType = request.headers.get('Content-Type') || '';
  const wantsJson = contentType.includes('application/json') || request.headers.get('Accept')?.includes('application/json');
  const respond = (body, status = 200) => {
    if (wantsJson) return json(body, status);
    const result = body.ok ? 'exito' : 'error';
    return Response.redirect(new URL(`/?contacto=${result}#contacto`, request.url), 303);
  };

  if (origin && origin !== allowedOrigin) {
    return respond({ ok: false, error: 'Origen no permitido.' }, 403);
  }

  const isJson = contentType.includes('application/json');
  const isForm = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
  if (!isJson && !isForm) {
    return respond({ ok: false, error: 'Formato no permitido.' }, 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > 12000) {
    return respond({ ok: false, error: 'Solicitud demasiado grande.' }, 413);
  }

  let input;
  try {
    if (isJson) {
      const rawBody = await request.text();
      if (rawBody.length > 12000) {
        return respond({ ok: false, error: 'Solicitud demasiado grande.' }, 413);
      }
      input = JSON.parse(rawBody);
    } else {
      input = Object.fromEntries((await request.formData()).entries());
    }
  } catch {
    return respond({ ok: false, error: 'Solicitud inválida.' }, 400);
  }

  const startedAt = Number(input.iniciado);
  const elapsed = Date.now() - startedAt;
  if (clean(input.empresa, 200) || (Number.isFinite(startedAt) && elapsed < 2500)) {
    return respond({ ok: true });
  }

  const submission = {
    nombre: clean(input.nombre, 100),
    email: clean(input.email, 254).toLowerCase(),
    celular: clean(input.celular, 40),
    evento: clean(input.evento, 60),
    fecha: clean(input.fecha, 10),
    mensaje: clean(input.mensaje, 2000)
  };

  if (submission.nombre.length < 2 || !EMAIL_PATTERN.test(submission.email) ||
      !EVENT_TYPES.has(submission.evento) || (submission.fecha && !DATE_PATTERN.test(submission.fecha))) {
    return respond({ ok: false, error: 'Revisa los campos obligatorios.' }, 400);
  }

  if (!env.RESEND_API_KEY) {
    console.error('Falta el secreto RESEND_API_KEY');
    return respond({ ok: false, error: 'El servicio de correo no está configurado.' }, 503);
  }

  const safe = Object.fromEntries(Object.entries(submission).map(([key, value]) => [key, escapeHtml(value)]));
  let emailResponse;
  try {
    emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM || 'Web Arian Alpiste <contacto@formularios.arianalpiste.com>',
        to: ['hola@arianalpiste.com'],
        reply_to: submission.email,
        subject: `Nueva consulta: ${submission.evento} — ${submission.nombre}`,
        html: `<h1>Nueva consulta desde la web</h1>
          <p><strong>Nombre:</strong> ${safe.nombre}</p>
          <p><strong>Correo:</strong> ${safe.email}</p>
          <p><strong>Celular:</strong> ${safe.celular || 'No indicado'}</p>
          <p><strong>Evento:</strong> ${safe.evento}</p>
          <p><strong>Fecha tentativa:</strong> ${safe.fecha || 'No indicada'}</p>
          <p><strong>Mensaje:</strong><br>${safe.mensaje.replace(/\n/g, '<br>') || 'Sin mensaje adicional'}</p>`
      })
    });
  } catch (error) {
    console.error('No se pudo conectar con Resend', error);
    return respond({ ok: false, error: 'No se pudo conectar con el servicio de correo.' }, 502);
  }

  if (!emailResponse.ok) {
    console.error('Resend rechazó el envío', emailResponse.status, await emailResponse.text());
    return respond({ ok: false, error: 'No se pudo enviar el correo.' }, 502);
  }

  return respond({ ok: true });
}

export function onRequest() {
  return json({ ok: false, error: 'Método no permitido.' }, 405);
}
