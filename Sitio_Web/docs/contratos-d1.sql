-- Base D1 «contratos» para /api/contrato y /api/contrato-revisar (binding DB en Cloudflare Pages).
-- Instalación nueva: pegar todo en Cloudflare → Storage & databases → D1 → contratos → Console.
CREATE TABLE IF NOT EXISTS contratos (
  id TEXT PRIMARY KEY,
  creado_en TEXT NOT NULL,            -- fecha y hora de la firma del cliente (ISO, UTC)
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  celular TEXT NOT NULL,
  evento TEXT NOT NULL,               -- como lo escribió el cliente (Bautizo, Cumpleaños o el nombre del «Otro»)
  evento_tipo TEXT,                   -- Bautizo, Cumpleaños u Otro
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
  firma_png TEXT NOT NULL,            -- firma del cliente (data URL, JPEG desde el 28 oct 2026)
  event_id TEXT NOT NULL,             -- el mismo ID del Purchase en Meta
  estado TEXT NOT NULL DEFAULT 'pendiente',  -- pendiente / confirmado / rechazado
  revisado_en TEXT,                   -- cuándo Arian confirmó o rechazó
  fbp TEXT,
  fbc TEXT
);
CREATE INDEX IF NOT EXISTS contratos_ip_fecha ON contratos (ip, creado_en);

-- Si la tabla ya existía (creada el 27 oct 2026), basta con agregar las columnas nuevas:
-- ALTER TABLE contratos ADD COLUMN evento_tipo TEXT;
-- ALTER TABLE contratos ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente';
-- ALTER TABLE contratos ADD COLUMN revisado_en TEXT;
-- ALTER TABLE contratos ADD COLUMN fbp TEXT;
-- ALTER TABLE contratos ADD COLUMN fbc TEXT;
