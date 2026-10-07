# Diseño: colores, tipografías y patrones

## Rediseño 2026 (home, sesiones familiares, reservar, privacidad, gracias y 404)

Desde octubre de 2026 estas seis páginas usan una identidad propia, colorida y pensada para familias:

- **Paletas:** «Cielo aire» (azul `#1D4C8A`, celeste `#E6F1FC`, amarillo `#FFF1C9`) en la home y páginas generales;
  «Bosque aire» (verde `#3D5A2A`, crema `#F7F6EC`, salvia `#E8EFDC`) en sesiones familiares. Se elige con
  `data-theme` en `<html>`. Las secciones alternan blanco y color; la franja del portafolio no se toca.
- **Tipografías:** Bricolage Grotesque (títulos) y DM Sans (texto).
- **Logo:** iniciales «aa» (blanca y coral `#FF9A7E`) sobre un cuadrado redondeado del color de la paleta.
- **Confeti:** decorativo; en celular aparece solo en los bordes para no tapar texto.
- **Celular:** título antes que la foto; las filas de tarjetas (servicios, pasos, portafolio, paquetes) son carruseles con puntitos.
- **Espacio entre secciones:** una sola variable, `--section-space`.
- El CSS va dentro de cada página. La fuente editable está fuera del repo (carpeta del rediseño) y se integra con `integrar.py`.

Blog, recursos y portafolio conservan por ahora el diseño anterior, descrito abajo.

## Diseño anterior (blog, recursos, portafolio)

Se conserva la identidad navy/dorado y la tipografía editorial del portafolio.

- Fondo blanco y alterno `#f4f5f9`.
- Texto principal navy `#1b2a4e`, secundario `#4a5578`.
- Texto terciario `#596681`.
- Superficies amarillas `#f2c94c`, con texto navy.
- Los textos destacados usan el amarillo luminoso `#f2c94c` para conservar una identidad visual clara y cálida.
- Cormorant Garamond: títulos de galería y visor.
- Poppins: títulos de servicios y marca.
- Jost: texto, controles y navegación.

## Reglas conservadas

Las fotografías de galería se muestran completas. No usar `object-fit: cover` ni zoom que recorte la imagen en las filas. Mantener sesiones y personas en grupos separados. La portada fotográfica conserva su composición y títulos originales; su imagen de fondo sí usa cobertura completa como antes.

## Patrones vigentes desde septiembre de 2026

- `.photo-row`: fila flexible de hasta tres fotos. Cada `.photo-item` es un botón con ancho proporcional a `--ratio`; así las imágenes comparten altura sin recortarse. En móvil se apilan.
- `.show-more-btn`: total y sesión explícitos, con `aria-expanded` y opción de contraer.
- `.category-nav`: navegación de categorías fija al alcanzar el encabezado; categoría activa visible.
- `#lightbox`: modal común para ambas páginas. Título de sesión, contador local, descripción, navegación por teclado y gesto táctil. El resto del documento queda inerte mientras está abierto y el foco regresa a la fotografía al cerrar.
- `#heroPause`: pausa de la presentación; con movimiento reducido empieza detenida.
- `.form-field`: etiqueta visible asociada a cada campo del formulario.
- `?seleccion=1`: referencias de archivo para la revisión del fotógrafo, ocultas en la vista habitual.

Los ajustes vigentes están al final de `css/style.css`, después de los estilos originales. Las decisiones históricas anteriores al cambio se conservan en `05-HISTORIAL.md`.
