# Documentación del sitio — Arian Alpiste Fotografía

Esta carpeta reúne toda la información del proyecto para que puedas seguir
editando el sitio en otra conversación (u otra persona pueda retomarlo) sin
perder contexto.

**Empieza por acá, en este orden:**

1. [`01-ESTRUCTURA.md`](01-ESTRUCTURA.md) — qué es cada archivo/carpeta, cómo previsualizar el sitio localmente.
2. [`02-CONTENIDO-Y-FOTOS.md`](02-CONTENIDO-Y-FOTOS.md) — cómo agregar, quitar o reordenar fotos (lo que más se edita).
3. [`03-DISENO.md`](03-DISENO.md) — colores, tipografías y patrones visuales (para mantener consistencia).
4. [`04-DEPLOY.md`](04-DEPLOY.md) — GitHub + Cloudflare Pages, formulario y publicación.
5. [`05-HISTORIAL.md`](05-HISTORIAL.md) — resumen cronológico de todo lo que se hizo hasta ahora.
6. [`06-TRACKING.md`](06-TRACKING.md) — eventos del embudo, canales y deduplicación.

## Resumen de una línea

Sitio estático (HTML/CSS/JS puro, sin build ni frameworks) con landing,
portafolio, blog, recursos y páginas legales, compartiendo `css/style.css`.
La interfaz vive en `js/main.js` y el embudo de Meta en `js/tracking.js`.
Las fotos y su organización viven en `assets/manifest.json`.

## Dato clave para no perder tiempo

Cloudflare Pages sirve el sitio desde **dentro de la subcarpeta `Sitio_Web/`** del
repo (no desde la raíz). Si algo se ve raro después de un deploy, revisa
primero [`04-DEPLOY.md`](04-DEPLOY.md).

También: el navegador cachea agresivamente `js/main.js` y
`assets/manifest.json`. Si haces un cambio y no se ve, primero probá una
recarga forzada (Cmd+Shift+R / Ctrl+Shift+R) antes de asumir que algo falló.
