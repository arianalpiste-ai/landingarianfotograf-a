# Deploy: GitHub + Netlify

## Repositorio

- GitHub: `https://github.com/arianalpiste-ai/landingarianfotograf-a`
  (rama `main`). Es público.
- El repo local en esta máquina (`Sitio_Web/.git`) fue inicializado acá
  pero **no tiene el remoto `origin` configurado** — el push a GitHub se
  hizo desde otra herramienta (GitHub Desktop u otra sesión). Si necesitás
  pushear desde acá:

  ```bash
  git remote add origin https://github.com/arianalpiste-ai/landingarianfotograf-a.git
  git branch -M main
  git push -u origin main
  ```

## ⚠️ Trampa ya resuelta: estructura del repo en GitHub

Cuando se subió el repo la primera vez, todo el sitio quedó adentro de una
subcarpeta `Sitio_Web/` en vez de en la raíz del repo (o sea, en GitHub se
ve `Sitio_Web/index.html`, no `index.html` en la raíz). Esto le daba 404 a
Netlify porque busca el `index.html` en la raíz por defecto.

**La solución que se aplicó (en la configuración de Netlify, sin tocar el
repo):**

En el sitio de Netlify → **Site configuration → Build & deploy → Build
settings → Edit settings**:

- **Base directory:** `Sitio_Web`
- **Publish directory:** `Sitio_Web`
- **Build command:** (vacío — es un sitio estático, no hay build)

Si en algún momento se reorganiza el repo para que los archivos queden
directo en la raíz, hay que volver a vaciar esos dos campos en Netlify.

## Redesplegar después de un cambio

1. Commitear y pushear los cambios a `main`.
2. Netlify tiene auto-deploy conectado al repo — cada push a `main` dispara
   un deploy nuevo solo. Si por algo no se refleja, en Netlify: **Deploys →
   Trigger deploy → Clear cache and deploy site**.

## Formulario de contacto

El form de "Hablemos de tu evento" en `index.html` usa **Netlify Forms**
(atributo `netlify` en el `<form>`, con `name="contacto"` y un
`<input type="hidden" name="form-name" value="contacto">`). Funciona solo
una vez deployado en Netlify — en local (`python3 -m http.server`) el envío
no hace nada real, es esperado.
