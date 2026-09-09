# Historial del proyecto (resumen)

Orden cronológico de las decisiones grandes. Sirve para entender *por qué*
el sitio quedó como quedó, no para repetir el proceso.

1. **Portafolio inicial** — se armó `portafolio.html` a partir de un
   template estilo Pixieset, con fotos categorizadas (hero = eventos
   familiares, luego Retratos, Paisaje, Documental; se excluyó a propósito
   la categoría "Detalles y Producto").

2. **Unificación con la página de servicios** — existía una página de
   servicios separada (reservas, paquetes, testimonios, formulario de
   contacto) en un solo archivo HTML viejo (con imágenes en base64
   embebidas). Se fusionó todo en este proyecto (`Sitio_Web/`, carpeta
   nueva, sin tocar los originales), con el estilo editorial del portafolio
   predominando y la página de servicios (`index.html`) como home.

3. **Re-skin navy + dorado** — se rediseñó la identidad visual completa
   (inspirada en un sitio de referencia): paleta navy/dorado, tipografía
   Poppins en negrita, botones tipo píldora, blob orgánico en el hero con
   fotos circulares flotantes. La tipografía serif y las galerías del
   portafolio original se dejaron intactas a propósito.

4. **Ronda de ajustes finos** — retoques puntuales por sección: hero,
   "Por qué importa", testimonio, precios, contacto, "Sobre mí", FAQ. Se
   sourcearon fotos nuevas desde Google Drive del cliente para reemplazar
   una foto de perfil poco apropiada y sumar variedad al preview del
   portafolio.

5. **Mini-galería "Trabajos recientes" con preview por evento** — en vez de
   mostrar muchas fotos sueltas, se armaron 3 tarjetas (una por evento) que
   al hacer clic abren un lightbox con hasta 5 fotos de ese evento
   (`data-gallery` + `setupPreviewLightbox`).

6. **Fotos de eventos ampliadas y reorganizadas** — se sumaron más fotos
   (Yannick, Zoe, "finales" curadas + candids de niños jugando) y se
   reordenó/organizó por evento con subtítulos (`buildEventGroups`).

7. **Reorganización de Retratos por persona** — se detectó que las fotos de
   retratos estaban mezcladas entre personas distintas en una misma fila;
   se reagruparon por persona (`buildPortraitGroups`) y se sumaron 11 fotos
   nuevas de 3 personas (Aixa, Paula, Mariafe).

8. **Sistema "Ver más" + fix de huecos sin recortar fotos** — para no
   sobrecargar cada sección con 10+ fotos de una, se limitó a mostrar la
   primera fila (3 fotos) con un botón sutil que revela el resto. En el
   camino se probó (y se descartó, por pedido explícito del cliente) forzar
   una proporción uniforme con recorte — la solución final agrupa las fotos
   por proporción similar y nunca las recorta (`buildPhotoRows`, ver
   `02-CONTENIDO-Y-FOTOS.md` y `03-DISENO.md`).

9. **Primer deploy y migración a Cloudflare Pages** — repo creado y publicación
   consolidada en Cloudflare Pages (ver `04-DEPLOY.md`).

## Aprendizajes / gotchas para la próxima sesión

- El navegador cachea `main.js` y `manifest.json` muy agresivamente — usar
  siempre recarga forzada al probar cambios.
- Cuando el cliente pide "que no queden huecos" en una grilla de fotos de
  distinto tamaño, la tentación es forzar `object-fit: cover` — **no
  hacerlo** sin confirmar antes, ya se probó y no gustó. La alternativa que
  funcionó es agrupar por proporción de aspecto similar.
- Antes de asumir que una foto "no se puede conseguir", preguntar si hay
  una carpeta de Google Drive o local con el material — en este proyecto
  casi siempre apareció una carpeta con justo lo que hacía falta (fotos
  "finales" curadas vs. sesión completa sin curar, por ejemplo).
- Si el cliente menciona un número de foto que no coincide con ningún
  archivo (ej. "la foto 46"), probablemente esté leyendo el contador del
  lightbox ("46 / 67"), que es un índice **global** sobre todas las
  secciones concatenadas — no un número de archivo.


## 10. Refinamiento del portafolio — septiembre de 2026

Por solicitud del cliente se evolucionó la presentación:
- Selección provisional explícita de hasta tres fotografías por sesión mediante `featured`.
- Filas de altura común y anchos proporcionales, sin recortes; sustituyen el orden automático por proporción descrito en el punto 8.
- Visor por sesión, contador local, teclado, retorno del foco, gesto horizontal y descripciones visuales.
- Barra de categorías persistente, controles de ampliar/contraer y consultas contextualizadas.
- Portada progresiva con pausa y movimiento reducido; variantes WebP para pantallas pequeñas.
- Formulario con etiquetas visibles y mejoras de legibilidad.
- Modo `?seleccion=1` con nombres de archivo para elegir fotografías. El contador ya no es global, por lo que el gotcha anterior sobre números globales es histórico.
- No se incorporaron ejemplos de graduaciones/corporativos: el material actual no identifica esas coberturas.
- Cambios preparados para revisión local; publicación en Cloudflare Pages pendiente.

## 11. Simplificación antes de publicar

- Los controles de cada galería se redujeron a «Ver fotos» y «Ocultar fotos».
- Se retiraron las llamadas de consulta ubicadas dentro de Eventos y Retratos.
- Se retiraron del portafolio los grupos «Retratos · Sesión 6» y «Retratos · Sesión 7».
