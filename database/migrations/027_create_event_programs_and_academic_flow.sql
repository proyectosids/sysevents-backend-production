IF OBJECT_ID('dbo.event_programs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_programs (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(MAX) NULL,
    slug NVARCHAR(180) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    settings_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_programs PRIMARY KEY (id),
    CONSTRAINT fk_event_programs_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_programs_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT uq_event_programs_slug UNIQUE (event_id, slug)
  );
END;

IF COL_LENGTH('dbo.event_materials', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_materials ADD program_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.event_materials', 'material_type') IS NULL
BEGIN
  ALTER TABLE dbo.event_materials ADD material_type NVARCHAR(80) NOT NULL CONSTRAINT df_event_materials_material_type DEFAULT 'other';
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_event_materials_program')
BEGIN
  ALTER TABLE dbo.event_materials
    ADD CONSTRAINT fk_event_materials_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);
END;

IF COL_LENGTH('dbo.submission_types', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.submission_types ADD program_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_submission_types_program')
BEGIN
  ALTER TABLE dbo.submission_types
    ADD CONSTRAINT fk_submission_types_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);
END;

IF COL_LENGTH('dbo.submissions', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD program_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.submissions', 'registration_id') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD registration_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_submissions_program')
BEGIN
  ALTER TABLE dbo.submissions
    ADD CONSTRAINT fk_submissions_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_submissions_registration')
BEGIN
  ALTER TABLE dbo.submissions
    ADD CONSTRAINT fk_submissions_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id);
END;

IF COL_LENGTH('dbo.event_registrations', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registrations ADD program_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_event_registrations_program')
BEGIN
  ALTER TABLE dbo.event_registrations
    ADD CONSTRAINT fk_event_registrations_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);
END;

IF COL_LENGTH('dbo.event_settings', 'payment_policy') IS NULL
BEGIN
  ALTER TABLE dbo.event_settings ADD payment_policy NVARCHAR(40) NOT NULL CONSTRAINT df_event_settings_payment_policy DEFAULT 'immediate';
END;

IF OBJECT_ID('dbo.submission_file_versions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_file_versions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    submission_id UNIQUEIDENTIFIER NOT NULL,
    file_id UNIQUEIDENTIFIER NOT NULL,
    file_role NVARCHAR(60) NOT NULL DEFAULT 'manuscript',
    version_number INT NOT NULL,
    uploaded_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_submission_file_versions PRIMARY KEY (id),
    CONSTRAINT fk_submission_file_versions_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_file_versions_file FOREIGN KEY (file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_submission_file_versions_user FOREIGN KEY (uploaded_by) REFERENCES dbo.users(id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'event_programs.read')
BEGIN
  INSERT INTO dbo.permissions (name, description) VALUES ('event_programs.read', 'Read event programs');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'event_programs.manage')
BEGIN
  INSERT INTO dbo.permissions (name, description) VALUES ('event_programs.manage', 'Manage event programs');
END;

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name IN ('platform_admin', 'tenant_owner')
  AND p.name IN ('event_programs.read', 'event_programs.manage')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
