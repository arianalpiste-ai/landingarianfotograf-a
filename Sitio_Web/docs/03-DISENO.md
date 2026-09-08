# Diseño: colores, tipografías y patrones

Se conserva la identidad navy/dorado y la tipografía editorial del portafolio.

- Fondo blanco y alterno `#f4f5f9`.
- Texto principal navy `#1b2a4e`, secundario `#4a5578`.
- Texto terciario `#596681`.
- Superficies doradas `#d9a441`, con texto navy.
- Dorado para textos sobre blanco `#85601b`, más oscuro para mejorar la lectura.
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
