IF OBJECT_ID('dbo.event_registration_forms', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_forms (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    registration_type_id UNIQUEIDENTIFIER NULL,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(500) NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'draft',
    submit_button_label NVARCHAR(80) NOT NULL DEFAULT 'Enviar registro',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_registration_forms PRIMARY KEY (id),
    CONSTRAINT fk_event_registration_forms_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_registration_forms_type FOREIGN KEY (registration_type_id) REFERENCES dbo.event_registration_types(id),
    CONSTRAINT fk_event_registration_forms_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_registration_forms_status CHECK (status IN ('draft', 'published'))
  );
END;

IF OBJECT_ID('dbo.event_registration_form_fields', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_form_fields (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    form_id UNIQUEIDENTIFIER NOT NULL,
    field_key NVARCHAR(120) NOT NULL,
    label NVARCHAR(180) NOT NULL,
    field_type NVARCHAR(40) NOT NULL,
    is_required BIT NOT NULL DEFAULT 0,
    placeholder NVARCHAR(180) NULL,
    help_text NVARCHAR(300) NULL,
    options_json NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    validation_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_registration_form_fields PRIMARY KEY (id),
    CONSTRAINT fk_event_registration_form_fields_form FOREIGN KEY (form_id) REFERENCES dbo.event_registration_forms(id) ON DELETE CASCADE,
    CONSTRAINT uq_event_registration_form_fields_key UNIQUE (form_id, field_key),
    CONSTRAINT ck_event_registration_form_fields_type CHECK (field_type IN ('text','textarea','email','phone','number','select','checkbox','radio','date','file','consent'))
  );
END;

IF OBJECT_ID('dbo.event_registration_form_responses', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_form_responses (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    form_id UNIQUEIDENTIFIER NOT NULL,
    registration_id UNIQUEIDENTIFIER NOT NULL,
    answers_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    submitted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_registration_form_responses PRIMARY KEY (id),
    CONSTRAINT fk_event_registration_form_responses_form FOREIGN KEY (form_id) REFERENCES dbo.event_registration_forms(id),
    CONSTRAINT fk_event_registration_form_responses_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id) ON DELETE CASCADE,
    CONSTRAINT uq_event_registration_form_responses_registration UNIQUE (registration_id)
  );
END;

IF OBJECT_ID('dbo.event_materials', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_materials (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    file_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(180) NOT NULL,
    description NVARCHAR(500) NULL,
    visibility NVARCHAR(40) NOT NULL DEFAULT 'public',
    registration_type_id UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_materials PRIMARY KEY (id),
    CONSTRAINT fk_event_materials_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_materials_file FOREIGN KEY (file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_materials_type FOREIGN KEY (registration_type_id) REFERENCES dbo.event_registration_types(id),
    CONSTRAINT fk_event_materials_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_materials_visibility CHECK (visibility IN ('public','registered','registration_type'))
  );
END;

IF OBJECT_ID('dbo.event_certificate_templates', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_certificate_templates (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    registration_type_id UNIQUEIDENTIFIER NULL,
    name NVARCHAR(160) NOT NULL,
    certificate_type NVARCHAR(60) NOT NULL DEFAULT 'participant',
    content_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    is_active BIT NOT NULL DEFAULT 1,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_certificate_templates PRIMARY KEY (id),
    CONSTRAINT fk_event_certificate_templates_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_certificate_templates_type FOREIGN KEY (registration_type_id) REFERENCES dbo.event_registration_types(id),
    CONSTRAINT fk_event_certificate_templates_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.event_certificates', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_certificates (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    registration_id UNIQUEIDENTIFIER NOT NULL,
    template_id UNIQUEIDENTIFIER NOT NULL,
    certificate_code NVARCHAR(80) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'issued',
    issued_by UNIQUEIDENTIFIER NULL,
    issued_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_certificates PRIMARY KEY (id),
    CONSTRAINT uq_event_certificates_code UNIQUE (certificate_code),
    CONSTRAINT uq_event_certificates_registration_template UNIQUE (registration_id, template_id),
    CONSTRAINT fk_event_certificates_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_certificates_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id),
    CONSTRAINT fk_event_certificates_template FOREIGN KEY (template_id) REFERENCES dbo.event_certificate_templates(id),
    CONSTRAINT fk_event_certificates_issued_by FOREIGN KEY (issued_by) REFERENCES dbo.users(id)
  );
END;

INSERT INTO dbo.permissions (name, description)
SELECT v.name, v.description
FROM (VALUES
  ('registration_forms.read', 'Read registration forms'),
  ('registration_forms.manage', 'Manage registration forms'),
  ('event_materials.read', 'Read event materials'),
  ('event_materials.manage', 'Manage event materials'),
  ('certificates.read', 'Read certificates'),
  ('certificates.manage', 'Manage certificate templates and issue certificates')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions p WHERE p.name = v.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name IN ('platform_admin', 'tenant_owner')
  AND p.name IN (
    'registration_forms.read',
    'registration_forms.manage',
    'event_materials.read',
    'event_materials.manage',
    'certificates.read',
    'certificates.manage'
  )
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
