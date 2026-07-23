IF OBJECT_ID('dbo.site_themes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.site_themes (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    theme_key NVARCHAR(100) NOT NULL UNIQUE,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(500) NULL,
    preview_image_url NVARCHAR(500) NULL,
    primary_color NVARCHAR(20) NOT NULL DEFAULT '#020617',
    global_styles_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    template_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.site_plugins', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.site_plugins (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    plugin_key NVARCHAR(100) NOT NULL UNIQUE,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(500) NULL,
    category NVARCHAR(80) NOT NULL DEFAULT 'content',
    section_type NVARCHAR(80) NOT NULL,
    icon_name NVARCHAR(80) NULL,
    default_title NVARCHAR(180) NULL,
    default_content_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    is_system BIT NOT NULL DEFAULT 1,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.event_site_settings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_site_settings (
    event_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    theme_id UNIQUEIDENTIFIER NULL,
    site_title NVARCHAR(180) NULL,
    logo_file_id UNIQUEIDENTIFIER NULL,
    favicon_file_id UNIQUEIDENTIFIER NULL,
    global_styles_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    custom_css NVARCHAR(MAX) NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'draft',
    published_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_site_settings_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_site_settings_theme FOREIGN KEY (theme_id) REFERENCES dbo.site_themes(id),
    CONSTRAINT fk_event_site_settings_logo FOREIGN KEY (logo_file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_site_settings_favicon FOREIGN KEY (favicon_file_id) REFERENCES dbo.files(id)
  );
END;

IF OBJECT_ID('dbo.event_site_plugin_installs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_site_plugin_installs (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    plugin_id UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    settings_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    installed_by UNIQUEIDENTIFIER NULL,
    installed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_site_plugin_installs_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_site_plugin_installs_plugin FOREIGN KEY (plugin_id) REFERENCES dbo.site_plugins(id),
    CONSTRAINT fk_event_site_plugin_installs_user FOREIGN KEY (installed_by) REFERENCES dbo.users(id),
    CONSTRAINT uq_event_site_plugin_installs UNIQUE (event_id, plugin_id)
  );
END;

IF OBJECT_ID('dbo.event_site_navigation_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_site_navigation_items (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    label NVARCHAR(120) NOT NULL,
    url NVARCHAR(255) NOT NULL,
    target NVARCHAR(30) NOT NULL DEFAULT '_self',
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_site_navigation_items_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.event_site_revisions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_site_revisions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    revision_type NVARCHAR(50) NOT NULL,
    snapshot_json NVARCHAR(MAX) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_site_revisions_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_site_revisions_user FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );
END;

DECLARE @themes TABLE (
  theme_key NVARCHAR(100),
  name NVARCHAR(160),
  description NVARCHAR(500),
  primary_color NVARCHAR(20),
  global_styles_json NVARCHAR(MAX),
  template_json NVARCHAR(MAX),
  sort_order INT
);

INSERT INTO @themes VALUES
('institutional', 'Institucional', 'Apariencia formal para universidades, facultades y congresos academicos.', '#020617',
'{"fontFamily":"Inter","radius":"8","background":"solid","layout":"institutional"}',
'{"sections":["hero","about","important_dates","pricing","speakers","submission_guidelines","faq","contact"]}', 1),
('summit', 'Summit moderno', 'Sitio comercial para congresos con portada fuerte, ponentes y llamados de accion.', '#1d4ed8',
'{"fontFamily":"Inter","radius":"8","background":"banded","layout":"summit"}',
'{"sections":["hero","about","important_dates","pricing","speakers","sponsors","submission_guidelines","faq","contact"]}', 2),
('editorial', 'Editorial academico', 'Diseno sobrio con lectura clara para coloquios, revistas y simposios.', '#166534',
'{"fontFamily":"Merriweather","radius":"4","background":"editorial","layout":"editorial"}',
'{"sections":["hero","about","important_dates","submission_guidelines","faq","contact"]}', 3);

INSERT INTO dbo.site_themes (theme_key, name, description, primary_color, global_styles_json, template_json, sort_order)
SELECT t.theme_key, t.name, t.description, t.primary_color, t.global_styles_json, t.template_json, t.sort_order
FROM @themes t
WHERE NOT EXISTS (SELECT 1 FROM dbo.site_themes existing WHERE existing.theme_key = t.theme_key);

DECLARE @plugins TABLE (
  plugin_key NVARCHAR(100),
  name NVARCHAR(160),
  description NVARCHAR(500),
  category NVARCHAR(80),
  section_type NVARCHAR(80),
  icon_name NVARCHAR(80),
  default_title NVARCHAR(180),
  default_content_json NVARCHAR(MAX),
  sort_order INT
);

INSERT INTO @plugins VALUES
('event_hero', 'Portada del evento', 'Titulo, subtitulo, marca y boton principal.', 'content', 'hero', 'megaphone', 'Portada', '{"brandName":"CIDIA 2026","eyebrow":"Congreso academico","title":"CIDIA 2026","subtitle":"Investigacion, desarrollo e innovacion para repensar la mision de la educacion.","ctaLabel":"Registrarme al evento","primaryColor":"#020617"}', 1),
('event_about', 'Acerca del evento', 'Texto institucional y puntos destacados.', 'content', 'about', 'file-text', 'Acerca del evento', '{"body":"Un espacio academico para compartir investigacion, experiencias docentes y proyectos de innovacion.","bullets":[{"text":"Conferencias magistrales."},{"text":"Presentacion de trabajos academicos."},{"text":"Networking institucional."}]}', 2),
('event_dates', 'Fechas importantes', 'Calendario publico de deadlines.', 'academic', 'important_dates', 'calendar-clock', 'Fechas importantes', '{"dates":[{"label":"Apertura de registros","date":"2026-06-01"},{"label":"Cierre de trabajos","date":"2026-09-15"},{"label":"Inicio del evento","date":"2026-10-20"}]}', 3),
('event_pricing', 'Precios / paquetes', 'Tarjetas de costos de inscripcion.', 'commerce', 'pricing', 'sparkles', 'Costos de inscripcion', '{"items":[{"name":"Participante general","price":"$0 MXN","description":"Acceso a actividades generales."},{"name":"Ponente","price":"$0 MXN","description":"Registro con presentacion de trabajo."}]}', 4),
('event_speakers', 'Ponentes', 'Listado de invitados y conferencistas.', 'content', 'speakers', 'users', 'Ponentes', '{"speakers":[{"name":"Ponente invitado","affiliation":"Institucion academica","bio":"Especialista en investigacion e innovacion educativa."}]}', 5),
('event_sponsors', 'Patrocinadores', 'Aliados, sponsors o instituciones.', 'commerce', 'sponsors', 'panels-top-left', 'Patrocinadores', '{"sponsors":[{"name":"Universidad aliada","tier":"Patrocinador academico"},{"name":"Centro de investigacion","tier":"Aliado estrategico"}]}', 6),
('event_submissions', 'Convocatoria', 'Reglas para envio de trabajos academicos.', 'academic', 'submission_guidelines', 'file-text', 'Convocatoria de trabajos', '{"body":"Los trabajos se recibiran desde la plataforma y seran evaluados por el comite academico.","bullets":[{"text":"Resumen maximo de 300 palabras."},{"text":"Archivo en PDF o DOCX."},{"text":"Autores completos y filiacion institucional."}]}', 7),
('event_faq', 'FAQ', 'Preguntas frecuentes del evento.', 'support', 'faq', 'help-circle', 'Preguntas frecuentes', '{"faqs":[{"question":"Puedo registrarme sin cuenta?","answer":"Si, el registro publico acepta participantes invitados."},{"question":"Donde envio mi trabajo?","answer":"Desde Mis trabajos dentro de la plataforma."}]}', 8),
('event_contact', 'Contacto', 'Correo, telefono y direccion.', 'support', 'contact', 'contact', 'Contacto', '{"email":"eventos@institucion.edu","phone":"+52 000 000 0000","address":"Campus universitario"}', 9),
('event_custom', 'Contenido libre', 'Bloque de texto personalizable.', 'content', 'custom_content', 'layout-dashboard', 'Contenido libre', '{"body":""}', 10);

INSERT INTO dbo.site_plugins (plugin_key, name, description, category, section_type, icon_name, default_title, default_content_json, sort_order)
SELECT p.plugin_key, p.name, p.description, p.category, p.section_type, p.icon_name, p.default_title, p.default_content_json, p.sort_order
FROM @plugins p
WHERE NOT EXISTS (SELECT 1 FROM dbo.site_plugins existing WHERE existing.plugin_key = p.plugin_key);

DECLARE @sitePermissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @sitePermissions VALUES
('site_studio.read', 'Read Site Studio configuration'),
('site_studio.manage', 'Manage Site Studio themes, plugins, blocks and publishing');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @sitePermissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name IN ('platform_admin', 'tenant_owner')
  AND p.name IN ('site_studio.read', 'site_studio.manage')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
