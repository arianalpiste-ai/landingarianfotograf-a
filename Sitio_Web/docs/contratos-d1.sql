-- Base D1 «contratos» para /api/contrato (binding DB en Cloudflare Pages).
-- Se pega una sola vez en Cloudflare → Storage & Databases → D1 → contratos → Console.
CREATE TABLE IF NOT EXISTS contratos (
  id TEXT PRIMARY KEY,
  creado_en TEXT NOT NULL,            -- fecha y hora de la firma (ISO, UTC)
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  celular TEXT NOT NULL,
  evento TEXT NOT NULL,
  paquete TEXT NOT NULL,
  modo TEXT NOT NULL,                 -- solo foto / foto y video
  precio INTEGER NOT NULL,            -- soles, calculado en el servidor
  fecha_evento TEXT NOT NULL,
  hora TEXT NOT NULL,
  direccion TEXT NOT NULL,
  acuerdos TEXT,
  acepta_privacidad INTEGER NOT NULL,
  acepta_meta INTEGER NOT NULL,
  privacidad_version TEXT NOT NULL,
  contrato_version TEXT NOT NULL,
  contrato_hash TEXT NOT NULL,        -- huella del texto aceptado
  ip TEXT,
  user_agent TEXT,
  firma_png TEXT NOT NULL,            -- imagen de la firma (data URL)
  event_id TEXT NOT NULL              -- el mismo ID del Purchase en Meta
);
CREATE INDEX IF NOT EXISTS contratos_ip_fecha ON contratos (ip, creado_en);
