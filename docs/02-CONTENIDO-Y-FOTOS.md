# Cómo agregar, quitar o reordenar fotos

## Fuente de verdad

`assets/manifest.json` contiene las imágenes y su organización. Eventos y Retratos conservan grupos independientes; Paisaje y Documental son listas. No se mezclan personas o eventos entre grupos.

Cada imagen conserva `src`, `w`, `h` e incorpora:
- `alt`: descripción visual de la fotografía.
- `srcset`: versiones WebP con su ancho, generadas a partir del original.

Los originales JPEG se mantienen para el visor ampliado.

## Elegir las tres primeras fotografías

Cada grupo de Eventos y Retratos tiene un array `featured` con hasta tres rutas completas, en el orden elegido. Paisaje y Documental usan `featured.paisaje` y `featured.documental` en la raíz del manifest.

Ejemplo dentro del grupo Bautizo de Zoe:

```json
"featured": [
  "assets/images/eventos/evento_16.jpg",
  "assets/images/eventos/evento_01.jpg",
  "assets/images/eventos/evento_15.jpg"
]
```

Estas fotos se muestran primero; las demás conservan su orden relativo en `items`. Ya no se ordena automáticamente por proporción. La selección de septiembre de 2026 es provisional y puede ajustarse según las preferencias del fotógrafo.

Para identificar fotos, abrir `portafolio.html?seleccion=1`. Esta vista muestra el nombre de archivo sobre cada fotografía y dentro del visor; la vista normal no muestra estas referencias. Usar nombres de archivo, no el contador del visor, para comunicar una selección.

## Presentación y visor

`buildGallery` crea filas de hasta tres fotografías. En escritorio comparten altura gracias a anchos proporcionales; en móvil se apilan. No se recortan ni se amplían con zoom al pasar el cursor. Los grupos de una o dos imágenes tienen un ancho máximo para evitar ampliaciones excesivas.

Solo se ven inicialmente las tres elegidas. El botón indica el total y la sesión; permite ampliar y volver a contraer. El visor recorre únicamente esa sesión, tiene contador local, descripciones, teclado, gestión del foco y gesto horizontal táctil.

## Agregar fotografías

1. Corregir orientación EXIF y exportar JPEG optimizado (lado largo aproximado de 1900 px).
2. Agregar la ruta, dimensiones reales y una descripción `alt` al grupo correspondiente.
3. Ejecutar `python3 scripts/optimize-images.py` desde el proyecto (requiere Pillow). Genera copias WebP de 480, 960 y 1600 px de ancho cuando el original lo permite, y actualiza `srcset`. Nunca modifica los JPEG originales ni reemplaza selecciones `featured` existentes.
4. Ajustar `featured` si la foto debe aparecer entre las tres primeras.
5. Comprobar la galería y el visor.

Al eliminar una imagen de `items`, quitarla también de `featured` si estaba seleccionada.

## Mini-galería del inicio

Las tarjetas `.pp-item` en `index.html` mantienen su atributo `data-gallery` (hasta cinco imágenes). Ahora usan el mismo visor accesible que el portafolio, con su propio título y contador. Sus imágenes permanecen independientes del manifest.

## Portadas

- Portafolio: imágenes de `hero` en el manifest; primera imagen prioritaria y siguientes cargadas al avanzar. Pausa manual y respeto de movimiento reducido.
- Inicio: conserva sus cuatro imágenes fijas y la composición original.
