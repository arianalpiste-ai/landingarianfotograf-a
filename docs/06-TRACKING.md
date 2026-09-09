# Tracking del embudo

El Pixel público se inicializa una vez por página desde `js/tracking.js`. Los
eventos server-side usan `functions/lib/meta-capi.js`; ningún token se entrega
al navegador.

| Acción | Evento | Canal | Parámetros principales | Deduplicación |
|---|---|---|---|---|
| Carga de página | `PageView` | Pixel | Ruta implícita | Una inicialización por documento |
| Clic hacia Cal.com | `MeetingIntent` | Pixel, personalizado | `button_location`, `destination`, `page_path` | Un ID por clic |
| Formulario aceptado | `Lead` | Pixel + CAPI | `content_name`; datos normalizados en servidor | Mismo `event_name` y `event_id` |
| Reserva creada en Cal.com | `Schedule` | CAPI | Nombre del tipo de cita | UID de Cal.com como ID determinista |
| Clic a WhatsApp | `Contact` | Pixel | Ubicación, destino y paquete si aplica | Un ID por clic |
| Clic en “Reservar” | `HighIntentLead` | Pixel, personalizado | Paquete, valor publicado, `PEN` | Un ID por clic |
| Apertura de portafolio | `ViewContent` | Pixel | Categoría `portfolio` | Una vez por documento |
| Apertura de artículo | `ViewContent` | Pixel | Título, slug, categoría `blog` | Una vez por documento |
| Apertura del índice del blog | `BlogView` | Pixel, personalizado | Categoría `blog` | Una vez por documento |
| Salida del blog hacia el embudo | `BlogToLanding` | Pixel, personalizado | Artículo, destino y ubicación | Un ID por clic |

## Pagos futuros

No hay proveedor de pago ni checkout. `InitiateCheckout` y `Purchase` no están
implementados. Una compra futura debe confirmarse mediante webhook del proveedor,
con `order_id`, `value`, `currency` y un `event_id` estable; visitar una página de
agradecimiento nunca será prueba suficiente.

## Pruebas recomendadas tras publicar

1. Meta Events Manager → Probar eventos.
2. Abrir cada tipo de página y confirmar un solo `PageView`.
3. Enviar el formulario y comprobar que `Lead` aparece deduplicado.
4. Crear una reserva de prueba en Cal.com y confirmar `Schedule` desde servidor.
5. Revisar en Cloudflare los logs de `/api/contacto` y `/api/cal-webhook` sin
   imprimir secretos ni datos personales completos.
