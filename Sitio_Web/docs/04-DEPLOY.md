# Deploy: GitHub + Cloudflare Pages

## Repositorio y proyecto

- GitHub: `https://github.com/arianalpiste-ai/landingarianfotograf-a`, rama `main`.
- El sitio está dentro de la subcarpeta `Sitio_Web/` del repositorio remoto.
- En Cloudflare Pages, configura **Root directory** como `Sitio_Web`.
- Es un sitio estático sin compilación: deja **Build command** vacío y usa `.` como **Build output directory**.

Cada push a `main` inicia un nuevo despliegue de Cloudflare Pages.

## Formulario de contacto

El formulario envía JSON a `/api/contacto`. La Pages Function está en
`functions/api/contacto.js` y entrega cada consulta a `hola@arianalpiste.com`
mediante la API de Resend.

La Function valida todos los datos en el servidor, limita sus tamaños, escapa
el contenido del correo, comprueba el origen y aplica un campo trampa y un
tiempo mínimo de llenado como protección básica contra spam. La clave de Resend
nunca se incluye en HTML ni JavaScript del navegador.

### Configuración manual

1. En Resend, agrega y verifica el subdominio `formularios.arianalpiste.com`.
   Puedes usar la conexión automática con Cloudflare o copiar los registros DNS
   que Resend indique. Verificar este subdominio no cambia el servicio que recibe
   el correo de `arianalpiste.com`.
2. En Resend, crea una API key con permiso para enviar correo.
3. En Cloudflare: **Workers & Pages → proyecto → Settings → Variables and
   Secrets → Add**. Crea `RESEND_API_KEY`, pega la clave y marca **Encrypt**.
4. Opcionalmente crea `CONTACT_FROM` con el valor
   `Web Arian Alpiste <contacto@formularios.arianalpiste.com>` y
   `ALLOWED_ORIGIN` con la URL pública exacta, por ejemplo
   `https://arianalpiste.com`. Si se omiten, la Function usa el remitente anterior
   y acepta el mismo origen de la solicitud.
5. Vuelve a desplegar el commit después de guardar el secreto. Configura las
   variables tanto en **Production** como en **Preview** si quieres probar el
   formulario en despliegues de vista previa.

Para desarrollo local de la Function se puede usar Wrangler con un archivo
`.dev.vars`; ese archivo está ignorado por Git y nunca debe publicarse.

## Meta Pixel y Conversions API

`js/tracking.js` contiene únicamente el ID público del Pixel. Los secretos de
Conversions API permanecen en Cloudflare y son utilizados por
`functions/lib/meta-capi.js`.

Variables necesarias para medición server-side:

- `META_PIXEL_ID`: ID del dataset de Meta.
- `META_ACCESS_TOKEN`: token cifrado de Conversions API.
- `PHONE_DEFAULT_COUNTRY_CODE`: opcional; usa `51` si se omite.

El formulario genera `Lead` en CAPI y devuelve el mismo `eventId` al navegador
para que Meta deduplique ambos canales.

## Webhook de Cal.com

`functions/api/cal-webhook.js` acepta únicamente `BOOKING_CREATED`, valida la
firma HMAC y registra `Schedule`. No crea ni modifica audiencias publicitarias.

Variables necesarias:

- `CALCOM_WEBHOOK_SECRET`: secreto cifrado usado para validar la firma.
- `CAL_EVENT_SLUG`: opcional; usa `15min` si se omite.

El UID de Cal.com forma el `event_id`, por lo que los reintentos conservan la
misma identidad ante Meta. Una garantía persistente adicional requeriría KV o
D1; no se añadió esa dependencia al sitio estático.

## Pagos

No existe proveedor ni flujo de pago. `InitiateCheckout` y `Purchase` están
deliberadamente desactivados. Los clics en “Reservar” se miden como
`HighIntentLead`, con paquete, valor publicado y moneda PEN, además de `Contact`
por la salida a WhatsApp.
