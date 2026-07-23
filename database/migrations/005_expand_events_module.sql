IF COL_LENGTH('dbo.events', 'main_modality') IS NULL
BEGIN
  ALTER TABLE dbo.events ADD main_modality NVARCHAR(80) NULL;
END;

IF COL_LENGTH('dbo.events', 'published_at') IS NULL
BEGIN
  ALTER TABLE dbo.events ADD published_at DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.events', 'deleted_at') IS NULL
BEGIN
  ALTER TABLE dbo.events ADD deleted_at DATETIME2 NULL;
END;

IF COL_LENGTH('dbo.events', 'created_by') IS NULL
BEGIN
  ALTER TABLE dbo.events ADD created_by UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.events', 'updated_by') IS NULL
BEGIN
  ALTER TABLE dbo.events ADD updated_by UNIQUEIDENTIFIER NULL;
END;

IF OBJECT_ID('dbo.event_editions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_editions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    year INT NOT NULL,
    starts_at DATETIME2 NULL,
    ends_at DATETIME2 NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_editions_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.event_settings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_settings (
    event_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    registration_enabled BIT NOT NULL DEFAULT 0,
    submissions_enabled BIT NOT NULL DEFAULT 0,
    default_currency CHAR(3) NOT NULL DEFAULT 'USD',
    contact_email NVARCHAR(255) NULL,
    settings_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_settings_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.event_tracks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_tracks (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(MAX) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_tracks_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.event_modalities', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_modalities (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_modalities_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.event_important_dates', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_important_dates (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(160) NOT NULL,
    description NVARCHAR(255) NULL,
    date_value DATETIME2 NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_important_dates_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

DECLARE @event_permissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @event_permissions (name, description)
VALUES
  ('events.read', 'Read events'),
  ('events.create', 'Create events'),
  ('events.update', 'Update events'),
  ('events.delete', 'Delete events'),
  ('events.publish', 'Publish and unpublish events'),
  ('cms.read', 'Read event CMS'),
  ('cms.manage', 'Manage event CMS'),
  ('registrations.read', 'Read event registrations'),
  ('registrations.manage', 'Manage registrations'),
  ('payments.read', 'Read payments'),
  ('payments.manage', 'Manage payments');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @event_permissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name = 'platform_admin'
  AND p.name IN (SELECT name FROM @event_permissions)
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
