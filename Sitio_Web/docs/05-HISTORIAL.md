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

## 12. Sesiones familiares como página propia — octubre de 2026

- La home (`index.html`) sigue siendo la landing de eventos (cumpleaños, bautizos).
  Se evaluó convertirla en landing de sesiones familiares y se descartó: ya está
  indexándose con enfoque de eventos y el blog apunta a ella.
- Nueva `sesiones-familiares.html` (URL pública `/sesiones-familiares`): menú reducido
  a anclas internas + «Eventos», y WhatsApp como única acción.
- Paquetes y precios (definidos por Arian el 2 oct 2026, exteriores / estudio con alquiler
  incluido): Esencial S/ 320 / S/ 470, Clásica S/ 450 / S/ 600, Recuerdo S/ 720 / S/ 950
  (único con photobook de tapa dura 15x20). Los precios aparecen en tres lugares que
  deben cambiarse juntos: las tarjetas (cada precio va dos veces, `data-place="exteriores"` y
  `data-place="estudio"`, más `data-value-*` en el botón), el
  JSON-LD `Service` del `<head>` y `llms.txt` (más «desde S/ 320» en la tarjeta de la home).
- Selector Exteriores / Estudio (`setupPlaceToggle` en `js/main.js`): muestra u oculta todo
  elemento con `data-place` y actualiza `data-package` / `data-value` de los botones «Reservar»
  para el Pixel. Los enlaces con `data-place-pick` (sección «¿Exteriores o estudio?») eligen
  el lugar y bajan a los paquetes.
- Sección «Sobre mí» casi al final, entre las preguntas frecuentes y el cierre: misma foto de la
  home (`about-photo.jpg`), texto adaptado a sesiones familiares y cifras «3+ años de
  experiencia» y «100+ sesiones y eventos fotografiados».
- Debajo de los paquetes hay un bloque con botón de WhatsApp («¿Quieres conocer más sobre cómo
  son estas sesiones?»). El detalle de cada sesión, los estilos y sets, y los adicionales
  estuvieron un momento en la página y Arian los retiró: los enviará en un PDF a quien le escriba.
- Personas por paquete, en las tarjetas: Esencial «Hasta 5 personas», Clásica «Hasta 6 personas»
  y Recuerdo «7 personas o más».
- Las preguntas frecuentes ya no mencionan adicionales (fotos extra, Set Tipi): van en el PDF.
- La foto de «¿Exteriores o estudio?» usa en escritorio un recorte vertical propio
  (`familia_17-v-*.webp`, hasta 2000 px) porque el marco es más alto que ancho y el archivo
  horizontal se veía ampliado y borroso.
- Se quitó «entrega en 5 días» de toda la página: el plazo de las fotos digitales no está definido.
- Fotos de la «Sesión Primavera» (carpetas `Finales` de cada familia). Como todas son
  de la misma locación, Arian pidió mostrar pocas: hero con 3 (principal `familia_22`,
  círculos `familia_20` y `familia_11`) y galería de solo 6, alternando fotos con papás
  (`01`, `04`, `07`) y bebés solos (`16`, `19`, `21`).
- La galería es un carrusel simple (`#familyCarousel`, `setupFamilyCarousel` en `js/main.js`,
  estilos `.fc-*`): 3 fotos a la vista (2 en tablet, 1 en celular),
  flechas a los lados y puntos. Usa el desplazamiento nativo con `scroll-snap`, sin librerías
  ni avance automático. Es un bucle continuo: el script copia las fotos una vez antes y una
  vez después, y cuando el desplazamiento se detiene sobre una copia salta sin animación a la
  original (por eso en el DOM hay 18 `<li>` aunque el HTML tenga 6). El clic en una foto
  abre el visor con las 6. Antes se probaron un coverflow 3D y un carrusel de foto central;
  Arian los descartó y pidió este formato, tomando como referencia un «loop carousel» de
  tres tarjetas. Para agregar o quitar fotos basta editar los `<li class="fc-slide">`.
- La franja bajo el hero dice solo «Sesiones en exteriores o estudio».
  No hay fotos de estudio todavía; «¿Exteriores o estudio?» usa `familia_17`.
- Photobook: incluido solo en Recuerdo; adicional de S/ 250 en Esencial y Clásica; llega a las 3 o 4 semanas.
- Las respuestas del FAQ se repiten en el JSON-LD `FAQPage`: si se edita una, editar la otra.
- Home: la tarjeta y la franja «Sesión de Fotos Familiares» enlazan a la página nueva,
  se agregó «Familias» al menú (index, portafolio, privacidad), «Sesiones familiares»
  al footer y «Sesión familiar» al formulario (`functions/api/contacto.js` → `EVENT_TYPES`).
- Menú: entre 1101 y 1320 px se compacta por CSS para que el enlace nuevo no parta líneas.
- WhatsApp: los botones de esta página abren `wa.me` con el número de Arian y un mensaje ya
  escrito según el botón (la home sigue con `wa.link`). Eventos por botón: ver `06-TRACKING.md`.
- Pendiente: testimonios específicos de sesiones y fotos de estudio.

## 13. Home más enfocada y portafolio sin retratos — octubre de 2026

- Home (`index.html`): el menú de arriba ya no tiene «Familias» ni el desplegable «Contenido»
  (Blog y Recursos gratuitos). Queda: Inicio, Servicios, Paquetes, Portafolio, FAQ, Contacto
  y «Agendar llamada».
- Home, footer: se quitaron «Sesiones familiares», «Portafolio», «Blog», «Recursos gratuitos»
  y «Paquetes». Queda: Servicios, FAQ, Contacto y Política de Privacidad.
- La home sigue enlazando a sesiones familiares desde la franja y la tarjeta de servicios.
  El blog y los recursos ya no tienen enlace desde la home.
- Portafolio, menú: solo Inicio, Portafolio, Contacto y «Agendar llamada», para que quien
  entra a ver fotos vuelva a la landing principal sin perderse. Su footer no cambió.
- Privacidad y las demás páginas conservan su menú.
- Portafolio (`portafolio.html`): se quitó la sección «Retratos» (Arian tiene una landing
  aparte para retratos), su enlace en el hero y la barra de categorías, que quedaba con un
  solo enlace. `main.js` ahora ignora una categoría si su contenedor no está en la página.
- `portafolios/retratos.html` sigue existiendo (y en `sitemap.xml` y `llms.txt`), pero ya no
  está enlazada desde `portafolio.html`.

## 14. Paquetes de eventos: Solo foto / Foto y video — octubre de 2026

- Home, sección Paquetes: selector «Solo foto» / «Foto y video» encima de las tarjetas. Usa el
  mismo componente que sesiones familiares (`.place-toggle`, elementos `data-place` con `hidden`,
  `setupPlaceToggle()` en `main.js`); aquí los valores son `foto` y `foto-video`.
- Precios (solo foto / foto y video): Básico S/ 450 / S/ 650, Estándar S/ 600 / S/ 850,
  Premium S/ 850 / S/ 1,400. Lo que incluye cada paquete no cambió.
- Foto y video suma: reel resumen (1 min en Básico, hasta 2 en Estándar, hasta 3 en Premium) y,
  solo en Premium, video extendido de 10 a 15 minutos. Debajo de las tarjetas aparece la nota
  de condiciones (video a los 10 días; el reel resume, no registra todo).
- Los videos para historias siguen en las dos modalidades. Nueva pregunta frecuente
  «¿Qué video incluye cada paquete?».
- Botones «Reservar»: ahora abren `wa.me` con mensaje según paquete y modalidad (antes
  `wa.link/78mbqb`, que no podía decir la modalidad). Siguen enviando `InitiateCheckout` +
  `HighIntentLead`; `package_name` pasa a ser, por ejemplo, «Estándar · Foto y video» y `value`
  el precio de la modalidad elegida.
- Para cambiar un precio: tarjeta (dos `.pkg-price`), `data-value-foto` / `data-value-foto-video`
  del botón, `<noscript>` bajo las tarjetas, `priceRange` del JSON-LD y `llms.txt`.
- El artículo del blog sobre precios sigue hablando de S/ 450 a S/ 850 (solo foto).
- Bloque bajo las tarjetas: «¿Quieres cambiar algo de un paquete?» con botón «Conversemos».
  Arian no quiere prometer una propuesta a medida, solo dejar claro que se puede conversar.
- La pregunta frecuente «¿Puedo armar un paquete personalizado?» pasó a «¿Puedo cambiar algo de
  un paquete?», con el mismo tono: se conversa, no se promete cotización a medida.
- Arian pidió no usar más las vistas previas de Cloudflare (ramas subidas a GitHub). Los cambios
  se le muestran en una página privada de Claude o con capturas, y solo se sube a `main` al aprobar.

## 15. Sesiones familiares: los paquetes suben — octubre de 2026

- En `sesiones-familiares.html` la sección Paquetes (con su selector y el bloque «¿Quieres conocer
  más…?») pasó de estar después de Testimonios a ir justo después de «Por qué ahora».
  Orden: hero, franja, Por qué ahora, Paquetes, Cómo funciona, Galería, ¿Exteriores o estudio?,
  Testimonios, Preguntas frecuentes, Sobre mí, cierre.
- Los enlaces «Ver paquetes en exteriores/estudio» ahora suben hasta los paquetes.
- `ViewContent` se envía al ver los paquetes: al estar más arriba, lo recibirán más visitas.
