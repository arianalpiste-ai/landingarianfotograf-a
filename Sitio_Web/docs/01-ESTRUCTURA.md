# Estructura del proyecto

```
Sitio_Web/
├── index.html            Página de servicios (home). Hero, "por qué importa",
│                          preview de portafolio, testimonio, paquetes, contacto,
│                          sobre mí, FAQ.
├── portafolio.html        Página de galería completa: hero-slideshow +
│                          secciones Eventos / Retratos / Paisaje & Viajes / Documental.
├── privacidad.html        Información sobre datos, proveedores y medición.
├── 404.html               Página de error personalizada, sin conversiones.
├── blog/                  Índice y artículos SEO/GEO.
├── recursos/              Guías gratuitas en HTML.
├── gracias/               Confirmaciones no indexables; no prueban compras.
├── css/style.css          Único stylesheet visual, compartido por todo el sitio.
├── js/main.js             Interfaz, galerías, navegación y formulario.
├── js/tracking.js         Meta Pixel y taxonomía central del embudo.
├── functions/             Cloudflare Pages Functions para contacto, Cal y CAPI.
├── assets/
│   ├── manifest.json       Fuente de verdad de TODAS las fotos y su orden/agrupación.
│   └── images/
│       ├── hero/            hero_01.jpg … hero_08.jpg (slideshow del hero de portafolio.html)
│       ├── eventos/          evento_NN.jpg (Bautizo, cumpleaños, etc.)
│       ├── retratos/         retrato_NN.jpg
│       ├── paisaje/          paisaje_NN.jpg
│       ├── documental/       documental_NN.jpg
│       └── servicios/        imágenes propias de index.html (hero-blob, "sobre mí",
│                              preview de portafolio, favicon) — no vienen del manifest.
├── sitemap.xml            URLs públicas que deben indexarse.
├── robots.txt             Reglas de rastreo y ubicación del sitemap.
├── llms.txt / ai.txt      Índice factual y declaración informativa para IAs.
└── docs/                  Esta documentación.
```

No hay build, ni npm, ni framework. Es HTML/CSS/JS plano — cualquier editor
sirve, y para verlo alcanza con un servidor estático simple.

## Previsualizar en local

Desde la carpeta `Sitio_Web/`:

```bash
python3 -m http.server 8751
```

y abrir `http://localhost:8751` en el navegador. **Importante:** el
navegador cachea `js/main.js` y `manifest.json` de forma agresiva — después
de cada cambio hacé una recarga forzada (Cmd+Shift+R en Mac, Ctrl+Shift+R en
Windows/Linux), no una recarga normal.

## Cómo se arma cada página (`js/main.js`)

El script detecta `#heroSlides` para cargar el manifest en el portafolio.

- `buildGallery`: prioriza `featured`, conserva el orden del resto, crea filas proporcionales y controles de ampliar/contraer.
- `setupViewer`: visor común para ambas páginas; recibe una sesión en cada apertura.
- `buildHero`: presentación con carga progresiva, pausa y movimiento reducido.
- `setupCategoryNav`: navegación persistente entre categorías.
- `setupHeader` y `setupNav`: encabezado y menú adaptable con estado accesible.

`scripts/optimize-images.py` genera las variantes WebP y actualiza el manifest. Las carpetas `responsive/` de cada categoría son archivos derivados; los JPEG originales se conservan.

Para revisión del fotógrafo: `http://localhost:8751/portafolio.html?seleccion=1`.
