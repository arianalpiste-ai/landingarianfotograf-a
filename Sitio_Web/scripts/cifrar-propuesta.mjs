// Cifra el contenido de una propuesta privada dentro de su página (el repo es público: aquí solo queda el cifrado).
// Uso: PROPUESTA_CLAVE=... node scripts/cifrar-propuesta.mjs <contenido.html fuera del repo> <propuestas/pagina.html>
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
const [src, page] = process.argv.slice(2), pass = process.env.PROPUESTA_CLAVE;
if (!src || !page || !pass) throw new Error('Faltan archivos o PROPUESTA_CLAVE');
const iter = 600000, salt = randomBytes(16), iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', pbkdf2Sync(pass.trim(), salt, iter, 32, 'sha256'), iv);
const data = Buffer.concat([c.update(readFileSync(src)), c.final(), c.getAuthTag()]);
const json = JSON.stringify({ iter, salt: salt.toString('base64'), iv: iv.toString('base64'), data: data.toString('base64') });
const html = readFileSync(page, 'utf8').replace(/\/\*DATOS\*\/[\s\S]*?\/\*FIN\*\//, () => `/*DATOS*/${json}/*FIN*/`);
writeFileSync(page, html);
