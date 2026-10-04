# Tracking del embudo

El Pixel público se inicializa una vez por página desde `js/tracking.js`. Los
eventos server-side usan `functions/lib/meta-capi.js`; ningún token se entrega
al navegador.

| Acción | Evento | Canal | Parámetros principales | Deduplicación |
|---|---|---|---|---|
| Carga de página | `PageView` | Pixel | Ruta implícita | Una inicialización por documento |
| Clic hacia Cal.com | `MeetingIntent` | Pixel, personalizado | `button_location`, `destination`, `page_path` | Un ID por clic |
| Formulario aceptado | `Lead` | Pixel + CAPI | `content_name`; datos normalizados en servidor | Mismo `event_name` y `event_id` |
| Reserva creada en Cal.com | `Lead` | CAPI | Nombre del tipo de cita | UID de Cal.com como ID determinista |
| Clic a WhatsApp | `Contact` | Pixel | Ubicación, destino y paquete si aplica | Un ID por clic |
| Clic en “Reservar” | `Contact` + `InitiateCheckout` + `HighIntentLead` | Pixel, estándar + personalizado | Paquete, valor publicado, `PEN` | Un ID independiente por evento |
| Los paquetes de la home entran en pantalla | `ViewContent` | Pixel | `content_name: Cobertura de eventos`, categoría `service`, tipo `pricing` | Una vez por documento |
| Apertura de portafolio | `ViewContent` | Pixel | Categoría `portfolio` | Una vez por documento |
| Apertura de artículo | `ViewContent` | Pixel | Título, slug, categoría `blog` | Una vez por documento |
| Apertura del índice del blog | `BlogView` | Pixel, personalizado | Categoría `blog` | Una vez por documento |
| Salida del blog hacia el embudo | `BlogToLanding` | Pixel, personalizado | Artículo, destino y ubicación | Un ID por clic |

## Solo el dominio público envía a Meta (octubre de 2026)

`js/tracking.js` carga el Pixel únicamente en `arianalpiste.com` (y `www.`). En `localhost`,
`127.0.0.1` y las vistas previas (`*.pages.dev`, `arianalpiste.netlify.app`) no se carga nada de
Meta: cada evento se escribe en la consola del navegador como `[tracking] Contact (no enviado a
Meta desde localhost)`, con sus parámetros. Así se revisa qué dispara cada botón sin ensuciar los
datos ni los públicos. Antes de este cambio, las pruebas locales sumaron cientos de eventos al
Pixel en septiembre.

`functions/api/contacto.js` aplica la misma regla: fuera del dominio público envía el correo pero
no el `Lead` a Conversions API.

Para ver un evento en «Probar eventos» de Meta hay que abrir el sitio publicado.

## Eventos automáticos de Meta, desactivados

`js/tracking.js` llama a `fbq('set', 'autoConfig', false, PIXEL_ID)` antes de `init`. Sin esa línea
Meta agrega por su cuenta eventos como `SubscribedButtonClick` (uno por cada clic en un botón o
enlace) y `Microdata`. No están en el código del sitio y ensucian «Probar eventos». El interruptor
equivalente en Events Manager está en el dataset → Configuración → «Hacer un seguimiento de los
eventos automáticamente sin código».

## Landing de sesiones familiares (`sesiones-familiares.html`)

Embudo: landing → WhatsApp. El evento para optimizar campañas es `Contact`. Definido con Arian el 2 oct 2026.

| Acción | Evento | Parámetros |
|---|---|---|
| Carga de página | `PageView` | — |
| La primera tarjeta de paquete entra en pantalla (`data-track-offer`) | `ViewContent`, una vez por visita | `content_name: Sesiones familiares`, `content_category: service`, `content_type: pricing` |
| Clic en WhatsApp del menú, hero, «Escríbeme», cierre o botón flotante | `Contact` | `button_location` (`header`, `hero`, `package-more-info`, `final-cta`, `floating-button`) |
| Clic en «Reservar por WhatsApp» de un paquete | `Contact` (solo ese evento, por decisión de Arian) | `button_location: package-card`, `package_name` (incluye el lugar), `value`, `currency: PEN` |
| Selector Exteriores / Estudio, carrusel, visor, FAQ, anclas internas, footer | Ninguno | — |

- Todos los clics medidos en esta página llevan además `content_name: Sesiones familiares` y
  `content_category: service`, para separarlos de los de la home al crear conversiones
  personalizadas o públicos (también se puede filtrar por URL `/sesiones-familiares`).
- En la home, «Reservar» envía `Contact` + `InitiateCheckout` + `HighIntentLead` (ver más abajo).
- Los botones abren `wa.me` con un mensaje ya escrito según el botón. En los paquetes el mensaje
  y el `package_name` cambian con el selector (plantilla en `data-wa-text`, con `{lugar}`).

## Pagos futuros

Aunque todavía no existe un proveedor de pago, el clic en “Reservar” representa
el inicio del proceso comercial y dispara `InitiateCheckout` junto con
`HighIntentLead`, además de `Contact` porque abre WhatsApp. `Purchase` queda reservado para una confirmación futura mediante
webhook del proveedor, con `order_id`, `value`, `currency` y un `event_id` estable.

## Pruebas recomendadas tras publicar

1. Meta Events Manager → Probar eventos.
2. Abrir cada tipo de página y confirmar un solo `PageView`.
3. Enviar el formulario y comprobar que `Lead` aparece deduplicado.
4. Crear una reserva de prueba en Cal.com y confirmar `Lead` desde servidor.
5. Revisar en Cloudflare los logs de `/api/contacto` y `/api/cal-webhook` sin
   imprimir secretos ni datos personales completos.

## Home: paquetes con selector Solo foto / Foto y video

Los botones «Reservar» de la home envían `Contact` + `InitiateCheckout` + `HighIntentLead`. Desde
octubre de 2026 `package_name` incluye la modalidad («Básico · Solo foto», «Premium · Foto y video»)
y `value` es el precio de la modalidad elegida (`data-value-foto` / `data-value-foto-video`).
El selector en sí no envía ningún evento.

## Sesiones familiares: botón principal «Agendar llamada» (octubre de 2026)

El botón principal del menú, de la portada y del cierre abre Cal.com y envía `MeetingIntent`
(`button_location`: `header`, `hero` o `final-cta`; `content_name: Sesiones familiares`). La reserva
confirmada llega como `Lead` desde el servidor, igual que en la home: usa el mismo tipo de cita
(`15min`), así que ese `Lead` no distingue si vino de eventos o de sesiones familiares.
WhatsApp queda como opción secundaria («o escríbeme por WhatsApp») y sigue enviando `Contact`,
igual que los botones «Reservar por WhatsApp» de los paquetes, el bloque «Escríbeme» y el flotante.

## Home como landing de cobertura de eventos (octubre de 2026)

Embudo: landing → WhatsApp. El evento para optimizar campañas es `Contact`, igual que en sesiones
familiares. Definido con Arian el 4 oct 2026, antes de la primera campaña de Meta Ads.

- `<body>` de `index.html` lleva `data-content-type="service"` y `data-content-name="Cobertura de
  eventos"`. La primera tarjeta de paquete lleva `data-track-offer`: al entrar en pantalla se envía
  `ViewContent` una vez por visita.
- Todos los clics medidos en la home llevan `content_name: Cobertura de eventos` y
  `content_category: service`, para separarlos de los de sesiones familiares.
- «Reservar» abre WhatsApp, así que también cuenta como `Contact`. Conserva `InitiateCheckout` y
  `HighIntentLead` con paquete y valor, para armar públicos de mayor intención.
- El clic a Cal.com dejó de llamarse `Schedule`: era un clic, no una cita, y en septiembre hubo
  24 `Schedule` contra 7 reservas reales. Ahora es `MeetingIntent` (personalizado). La reserva
  confirmada sigue llegando como `Lead` desde el webhook. No optimizar campañas por `MeetingIntent`.
