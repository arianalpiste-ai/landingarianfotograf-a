# Deploy: GitHub + Cloudflare Pages

## Repositorio y proyecto

- GitHub: `https://github.com/arianalpiste-ai/landingarianfotograf-a`, rama `main`.
- El sitio está dentro de la subcarpeta `Sitio_Web/` del repositorio remoto.
- En Cloudflare Pages, configura **Root directory** como `Sitio_Web`.
- Es un sitio estático sin compilación: deja **Build command** vacío y usa `.` como **Build output directory**.

Cada push a `main` inicia un nuevo despliegue de Cloudflare Pages.

## Formulario de contacto

El formulario envía JSON a `/api/contacto`. La Pages Function está en
`functions/api/contacto.js` y entrega cada consulta a `hola@arianalpiste.com`
mediante la API de Resend.

La Function valida todos los datos en el servidor, limita sus tamaños, escapa
el contenido del correo, comprueba el origen y aplica un campo trampa y un
tiempo mínimo de llenado como protección básica contra spam. La clave de Resend
nunca se incluye en HTML ni JavaScript del navegador.

### Configuración manual

1. En Resend, agrega y verifica el subdominio `formularios.arianalpiste.com`.
   Puedes usar la conexión automática con Cloudflare o copiar los registros DNS
   que Resend indique. Verificar este subdominio no cambia el servicio que recibe
   el correo de `arianalpiste.com`.
2. En Resend, crea una API key con permiso para enviar correo.
3. En Cloudflare: **Workers & Pages → proyecto → Settings → Variables and
   Secrets → Add**. Crea `RESEND_API_KEY`, pega la clave y marca **Encrypt**.
4. Opcionalmente crea `CONTACT_FROM` con el valor
   `Web Arian Alpiste <contacto@formularios.arianalpiste.com>` y
   `ALLOWED_ORIGIN` con la URL pública exacta, por ejemplo
   `https://arianalpiste.com`. Si se omiten, la Function usa el remitente anterior
   y acepta el mismo origen de la solicitud.
5. Vuelve a desplegar el commit después de guardar el secreto. Configura las
   variables tanto en **Production** como en **Preview** si quieres probar el
   formulario en despliegues de vista previa.

Para desarrollo local de la Function se puede usar Wrangler con un archivo
`.dev.vars`; ese archivo está ignorado por Git y nunca debe publicarse.
