/*
  SysEvents complete database installer.
  Generated automatically from database/migrations.
  The SaaS administrator password is stored only as a bcrypt hash.
*/

USE [master];
GO

IF DB_ID(N'sysevents_db') IS NULL
BEGIN
  CREATE DATABASE [sysevents_db];
END;
GO

USE [sysevents_db];
GO

IF OBJECT_ID('dbo.schema_migrations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.schema_migrations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL UNIQUE,
    executed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

PRINT N'Applying 001_create_schema_migrations.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'001_create_schema_migrations.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.schema_migrations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.schema_migrations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL UNIQUE,
    executed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'001_create_schema_migrations.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 001_create_schema_migrations.sql; already applied';
END;
GO

PRINT N'Applying 002_create_iam_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'002_create_iam_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(120) NOT NULL,
    last_name NVARCHAR(120) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.roles (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    is_system BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.permissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.permissions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(150) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.role_permissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.role_permissions (
    role_id UNIQUEIDENTIFIER NOT NULL,
    permission_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES dbo.permissions(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.user_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.user_roles (
    user_id UNIQUEIDENTIFIER NOT NULL,
    role_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.refresh_tokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.refresh_tokens (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    revoked_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'platform_admin')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('platform_admin', 'Full platform administrator', 1);
END;

DECLARE @permissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @permissions (name, description)
VALUES
  ('users.read', 'Read users'),
  ('users.update', 'Update users'),
  ('roles.read', 'Read roles'),
  ('roles.create', 'Create roles'),
  ('roles.update', 'Update roles'),
  ('roles.assign_permissions', 'Assign permissions to roles'),
  ('permissions.read', 'Read permissions'),
  ('permissions.create', 'Create permissions'),
  ('tenants.read', 'Read tenants'),
  ('tenants.create', 'Create tenants'),
  ('tenants.update', 'Update tenants'),
  ('tenants.manage_users', 'Manage tenant users');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @permissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'002_create_iam_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 002_create_iam_tables.sql; already applied';
END;
GO

PRINT N'Applying 003_create_tenant_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'003_create_tenant_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.tenants', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenants (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(180) NOT NULL,
    slug NVARCHAR(120) NOT NULL UNIQUE,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.tenant_users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_users (
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    tenant_role NVARCHAR(80) NOT NULL DEFAULT 'member',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_tenant_users PRIMARY KEY (tenant_id, user_id),
    CONSTRAINT fk_tenant_users_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_users_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.tenant_settings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_settings (
    tenant_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    settings_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_tenant_settings_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id) ON DELETE CASCADE
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'003_create_tenant_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 003_create_tenant_tables.sql; already applied';
END;
GO

PRINT N'Applying 004_create_event_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'004_create_event_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.events', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.events (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(200) NOT NULL,
    slug NVARCHAR(140) NOT NULL,
    description NVARCHAR(MAX) NULL,
    starts_at DATETIME2 NULL,
    ends_at DATETIME2 NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_events_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_events_tenant_slug UNIQUE (tenant_id, slug)
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'004_create_event_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 004_create_event_tables.sql; already applied';
END;
GO

PRINT N'Applying 005_expand_events_module.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'005_expand_events_module.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

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

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'005_expand_events_module.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 005_expand_events_module.sql; already applied';
END;
GO

PRINT N'Applying 006_create_event_cms_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'006_create_event_cms_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_pages', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_pages (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(180) NOT NULL,
    slug NVARCHAR(120) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'draft',
    seo_title NVARCHAR(180) NULL,
    seo_description NVARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    published_at DATETIME2 NULL,
    deleted_at DATETIME2 NULL,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_pages_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT uq_event_pages_slug UNIQUE (event_id, slug)
  );
END;

IF OBJECT_ID('dbo.event_page_sections', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_page_sections (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    page_id UNIQUEIDENTIFIER NULL,
    section_type NVARCHAR(80) NOT NULL,
    title NVARCHAR(180) NULL,
    content_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    status NVARCHAR(30) NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    deleted_at DATETIME2 NULL,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_page_sections_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_page_sections_page FOREIGN KEY (page_id) REFERENCES dbo.event_pages(id)
  );
END;

IF OBJECT_ID('dbo.event_menu_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_menu_items (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    label NVARCHAR(100) NOT NULL,
    url NVARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_menu_items_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.speakers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.speakers (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    full_name NVARCHAR(180) NOT NULL,
    bio NVARCHAR(MAX) NULL,
    affiliation NVARCHAR(180) NULL,
    photo_url NVARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_speakers_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.sponsors', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.sponsors (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(180) NOT NULL,
    website_url NVARCHAR(500) NULL,
    logo_url NVARCHAR(500) NULL,
    tier NVARCHAR(80) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_sponsors_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.faqs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.faqs (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    question NVARCHAR(255) NOT NULL,
    answer NVARCHAR(MAX) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_faqs_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'006_create_event_cms_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 006_create_event_cms_tables.sql; already applied';
END;
GO

PRINT N'Applying 007_create_registration_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'007_create_registration_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.participant_profiles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.participant_profiles (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NULL,
    email NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(120) NOT NULL,
    last_name NVARCHAR(120) NOT NULL,
    phone NVARCHAR(40) NULL,
    institution NVARCHAR(180) NULL,
    country NVARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_participant_profiles_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.event_registration_types', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_types (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(120) NOT NULL,
    description NVARCHAR(255) NULL,
    price_cents INT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    capacity INT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_registration_types_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.event_registrations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registrations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    registration_type_id UNIQUEIDENTIFIER NOT NULL,
    participant_profile_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'draft',
    amount_cents INT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    checked_in_at DATETIME2 NULL,
    cancelled_at DATETIME2 NULL,
    metadata_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_registrations_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_registrations_type FOREIGN KEY (registration_type_id) REFERENCES dbo.event_registration_types(id),
    CONSTRAINT fk_event_registrations_profile FOREIGN KEY (participant_profile_id) REFERENCES dbo.participant_profiles(id),
    CONSTRAINT fk_event_registrations_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.event_registration_status_history', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_status_history (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    registration_id UNIQUEIDENTIFIER NOT NULL,
    from_status NVARCHAR(40) NULL,
    to_status NVARCHAR(40) NOT NULL,
    reason NVARCHAR(255) NULL,
    changed_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_registration_status_history_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id) ON DELETE CASCADE,
    CONSTRAINT fk_registration_status_history_user FOREIGN KEY (changed_by) REFERENCES dbo.users(id)
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'007_create_registration_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 007_create_registration_tables.sql; already applied';
END;
GO

PRINT N'Applying 008_create_payment_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'008_create_payment_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.payment_providers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_providers (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(60) NOT NULL UNIQUE,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.payment_providers WHERE name = 'stripe')
BEGIN
  INSERT INTO dbo.payment_providers (name, is_active) VALUES ('stripe', 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.payment_providers WHERE name = 'mercadopago')
BEGIN
  INSERT INTO dbo.payment_providers (name, is_active) VALUES ('mercadopago', 0);
END;

IF OBJECT_ID('dbo.payment_orders', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_orders (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    provider_id UNIQUEIDENTIFIER NOT NULL,
    event_id UNIQUEIDENTIFIER NOT NULL,
    registration_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NULL,
    amount_cents INT NOT NULL,
    currency CHAR(3) NOT NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'created',
    provider_order_id NVARCHAR(255) NULL UNIQUE,
    checkout_url NVARCHAR(1000) NULL,
    metadata_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_payment_orders_provider FOREIGN KEY (provider_id) REFERENCES dbo.payment_providers(id),
    CONSTRAINT fk_payment_orders_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_payment_orders_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id),
    CONSTRAINT fk_payment_orders_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.payment_transactions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_transactions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    payment_order_id UNIQUEIDENTIFIER NOT NULL,
    provider_transaction_id NVARCHAR(255) NULL,
    status NVARCHAR(40) NOT NULL,
    amount_cents INT NOT NULL,
    currency CHAR(3) NOT NULL,
    raw_payload_json NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_payment_transactions_order FOREIGN KEY (payment_order_id) REFERENCES dbo.payment_orders(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.payment_webhook_events', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_webhook_events (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    provider NVARCHAR(60) NOT NULL,
    provider_event_id NVARCHAR(255) NOT NULL,
    event_type NVARCHAR(120) NOT NULL,
    processed_at DATETIME2 NULL,
    payload_json NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_payment_webhook_events UNIQUE (provider, provider_event_id)
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'008_create_payment_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 008_create_payment_tables.sql; already applied';
END;
GO

PRINT N'Applying 009_create_files_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'009_create_files_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.file_categories', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.file_categories (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    allowed_mime_types NVARCHAR(MAX) NULL,
    max_size_mb INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.files', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.files (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    category_id UNIQUEIDENTIFIER NULL,
    tenant_id UNIQUEIDENTIFIER NULL,
    event_id UNIQUEIDENTIFIER NULL,
    owner_user_id UNIQUEIDENTIFIER NULL,
    original_name NVARCHAR(255) NOT NULL,
    stored_name NVARCHAR(255) NOT NULL,
    storage_path NVARCHAR(1000) NOT NULL,
    mime_type NVARCHAR(150) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 NVARCHAR(64) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    deleted_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_files_category FOREIGN KEY (category_id) REFERENCES dbo.file_categories(id),
    CONSTRAINT fk_files_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id),
    CONSTRAINT fk_files_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_files_owner FOREIGN KEY (owner_user_id) REFERENCES dbo.users(id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'submission_document')
  INSERT INTO dbo.file_categories (name, description) VALUES ('submission_document', 'Academic submission document');
IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'event_image')
  INSERT INTO dbo.file_categories (name, description) VALUES ('event_image', 'Event public image');
IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'payment_receipt')
  INSERT INTO dbo.file_categories (name, description) VALUES ('payment_receipt', 'Payment receipt');

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'009_create_files_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 009_create_files_tables.sql; already applied';
END;
GO

PRINT N'Applying 010_create_submissions_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'010_create_submissions_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.submission_types', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_types (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(120) NOT NULL,
    description NVARCHAR(255) NULL,
    requires_file BIT NOT NULL DEFAULT 1,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_types_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.submissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submissions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    submission_type_id UNIQUEIDENTIFIER NOT NULL,
    owner_user_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(250) NOT NULL,
    abstract NVARCHAR(MAX) NULL,
    keywords NVARCHAR(500) NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'draft',
    submitted_at DATETIME2 NULL,
    deleted_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submissions_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_type FOREIGN KEY (submission_type_id) REFERENCES dbo.submission_types(id),
    CONSTRAINT fk_submissions_owner FOREIGN KEY (owner_user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.submission_authors', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_authors (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    full_name NVARCHAR(180) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    affiliation NVARCHAR(180) NULL,
    is_corresponding BIT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_authors_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.submission_files', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_files (
    submission_id UNIQUEIDENTIFIER NOT NULL,
    file_id UNIQUEIDENTIFIER NOT NULL,
    file_role NVARCHAR(60) NOT NULL DEFAULT 'manuscript',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_submission_files PRIMARY KEY (submission_id, file_id),
    CONSTRAINT fk_submission_files_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_files_file FOREIGN KEY (file_id) REFERENCES dbo.files(id)
  );
END;

IF OBJECT_ID('dbo.submission_status_history', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_status_history (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    from_status NVARCHAR(40) NULL,
    to_status NVARCHAR(40) NOT NULL,
    reason NVARCHAR(255) NULL,
    changed_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_status_history_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_status_history_user FOREIGN KEY (changed_by) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.submission_comments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_comments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    author_user_id UNIQUEIDENTIFIER NOT NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    visibility NVARCHAR(40) NOT NULL DEFAULT 'internal',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_comments_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_comments_user FOREIGN KEY (author_user_id) REFERENCES dbo.users(id)
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'010_create_submissions_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 010_create_submissions_tables.sql; already applied';
END;
GO

PRINT N'Applying 011_create_reviews_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'011_create_reviews_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.review_rubrics', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_rubrics (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(255) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_rubrics_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.review_criteria', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_criteria (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    rubric_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(255) NULL,
    max_score INT NOT NULL DEFAULT 5,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_review_criteria_rubric FOREIGN KEY (rubric_id) REFERENCES dbo.review_rubrics(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.review_assignments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_assignments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    reviewer_user_id UNIQUEIDENTIFIER NOT NULL,
    rubric_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'assigned',
    due_at DATETIME2 NULL,
    assigned_by UNIQUEIDENTIFIER NOT NULL,
    submitted_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_assignments_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_assignments_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_review_assignments_rubric FOREIGN KEY (rubric_id) REFERENCES dbo.review_rubrics(id),
    CONSTRAINT fk_review_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.review_results', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_results (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    criterion_id UNIQUEIDENTIFIER NULL,
    score DECIMAL(8,2) NULL,
    recommendation NVARCHAR(40) NULL,
    comments NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_results_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.review_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_results_criterion FOREIGN KEY (criterion_id) REFERENCES dbo.review_criteria(id)
  );
END;

IF OBJECT_ID('dbo.review_comments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_comments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    author_user_id UNIQUEIDENTIFIER NOT NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    visibility NVARCHAR(40) NOT NULL DEFAULT 'committee',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_comments_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.review_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_comments_user FOREIGN KEY (author_user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.review_decisions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_decisions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    decision NVARCHAR(40) NOT NULL,
    decision_notes NVARCHAR(MAX) NULL,
    decided_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_decisions_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_decisions_user FOREIGN KEY (decided_by) REFERENCES dbo.users(id)
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'011_create_reviews_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 011_create_reviews_tables.sql; already applied';
END;
GO

PRINT N'Applying 012_create_communications_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'012_create_communications_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.email_templates', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.email_templates (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    template_key NVARCHAR(100) NOT NULL UNIQUE,
    subject NVARCHAR(255) NOT NULL,
    body NVARCHAR(MAX) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.email_logs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.email_logs (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    template_key NVARCHAR(100) NOT NULL,
    recipient_email NVARCHAR(255) NOT NULL,
    subject NVARCHAR(255) NOT NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'pending',
    error_message NVARCHAR(MAX) NULL,
    sent_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.notifications (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NULL,
    recipient_email NVARCHAR(255) NULL,
    type NVARCHAR(100) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    read_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END;

DECLARE @templates TABLE (template_key NVARCHAR(100), subject NVARCHAR(255), body NVARCHAR(MAX));
INSERT INTO @templates (template_key, subject, body)
VALUES
  ('user_registered', 'Welcome to SysEvents', 'Hello {{name}}, your account has been created.'),
  ('registration_confirmed', 'Registration confirmed for {{eventName}}', 'Hello {{participantName}}, your registration is confirmed.'),
  ('payment_confirmed', 'Payment confirmed for {{eventName}}', 'Hello {{participantName}}, your payment has been confirmed.'),
  ('submission_received', 'Submission received: {{submissionTitle}}', 'We received your submission for {{eventName}}.'),
  ('review_assigned', 'Review assigned: {{submissionTitle}}', 'You have been assigned a submission to review.'),
  ('changes_requested', 'Changes requested: {{submissionTitle}}', 'Please review requested changes.'),
  ('submission_accepted', 'Submission accepted: {{submissionTitle}}', 'Congratulations, your submission was accepted.'),
  ('submission_rejected', 'Submission decision: {{submissionTitle}}', 'Your submission was not accepted.');

INSERT INTO dbo.email_templates (template_key, subject, body)
SELECT t.template_key, t.subject, t.body
FROM @templates t
WHERE NOT EXISTS (SELECT 1 FROM dbo.email_templates e WHERE e.template_key = t.template_key);

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'012_create_communications_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 012_create_communications_tables.sql; already applied';
END;
GO

PRINT N'Applying 013_add_security_testing_docs_permissions.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'013_add_security_testing_docs_permissions.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

DECLARE @permissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @permissions (name, description)
VALUES
  ('files.read', 'Read files'),
  ('files.upload', 'Upload files'),
  ('files.delete', 'Delete files'),
  ('submissions.read', 'Read submissions'),
  ('submissions.create', 'Create submissions'),
  ('submissions.update', 'Update submissions'),
  ('submissions.submit', 'Submit submissions'),
  ('submissions.manage', 'Manage submissions'),
  ('reviews.read', 'Read reviews'),
  ('reviews.assign', 'Assign reviewers'),
  ('reviews.submit', 'Submit reviews'),
  ('reviews.decide', 'Issue final review decisions'),
  ('email_templates.read', 'Read email templates'),
  ('email_templates.update', 'Update email templates'),
  ('email_logs.read', 'Read email logs'),
  ('reports.read', 'Read reports');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @permissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name = 'platform_admin'
  AND p.name IN (SELECT name FROM @permissions)
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'013_add_security_testing_docs_permissions.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 013_add_security_testing_docs_permissions.sql; already applied';
END;
GO

PRINT N'Applying 014_create_saas_plans_and_subscriptions.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'014_create_saas_plans_and_subscriptions.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.saas_plans', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.saas_plans (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    code NVARCHAR(80) NOT NULL UNIQUE,
    name NVARCHAR(140) NOT NULL,
    description NVARCHAR(500) NULL,
    price_cents INT NOT NULL DEFAULT 0,
    currency NVARCHAR(3) NOT NULL DEFAULT 'MXN',
    billing_interval NVARCHAR(30) NOT NULL DEFAULT 'one_time',
    max_events INT NOT NULL DEFAULT 1,
    max_users INT NOT NULL DEFAULT 3,
    max_storage_mb INT NOT NULL DEFAULT 500,
    features_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.tenant_subscriptions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_subscriptions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    plan_id UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    starts_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ends_at DATETIME2 NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_tenant_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES dbo.saas_plans(id),
    CONSTRAINT fk_tenant_subscriptions_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.saas_plans WHERE code = 'basic-free')
BEGIN
  INSERT INTO dbo.saas_plans (
    code, name, description, price_cents, currency, billing_interval,
    max_events, max_users, max_storage_mb, features_json, sort_order
  )
  VALUES (
    'basic-free',
    'Básico',
    'Plan inicial para administrar un evento académico completo.',
    0,
    'MXN',
    'one_time',
    1,
    5,
    500,
    '{"events":1,"users":5,"cms":true,"registrations":true,"submissions":true,"reviews":true,"payments":true}',
    1
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'tenant_owner')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('tenant_owner', 'Organization owner with tenant administration capabilities', 1);
END;

DECLARE @saasPermissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @saasPermissions (name, description)
VALUES
  ('plans.read', 'Read available SaaS plans'),
  ('subscriptions.read', 'Read tenant subscriptions'),
  ('subscriptions.manage', 'Manage tenant subscriptions');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @saasPermissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
INNER JOIN dbo.permissions p ON p.name IN (
  'tenants.read',
  'tenants.update',
  'tenants.manage_users',
  'events.read',
  'events.create',
  'events.update',
  'events.delete',
  'events.publish',
  'cms.read',
  'cms.create',
  'cms.update',
  'cms.delete',
  'registrations.read',
  'registrations.manage',
  'payments.read',
  'submissions.read',
  'submissions.create',
  'submissions.update',
  'submissions.submit',
  'submissions.manage',
  'reviews.read',
  'reviews.assign',
  'reviews.submit',
  'reviews.decide',
  'files.read',
  'files.upload',
  'files.delete',
  'email_templates.read',
  'email_templates.update',
  'email_logs.read',
  'reports.read',
  'plans.read',
  'subscriptions.read'
)
WHERE r.name = 'tenant_owner'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'014_create_saas_plans_and_subscriptions.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 014_create_saas_plans_and_subscriptions.sql; already applied';
END;
GO

PRINT N'Applying 015_create_site_studio_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'015_create_site_studio_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

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

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'015_create_site_studio_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 015_create_site_studio_tables.sql; already applied';
END;
GO

PRINT N'Applying 016_create_registration_addons.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'016_create_registration_addons.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_registration_addons', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_addons (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(140) NOT NULL,
    description NVARCHAR(500) NULL,
    category NVARCHAR(80) NOT NULL DEFAULT 'general',
    price_cents INT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    capacity INT NULL,
    is_required BIT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    metadata_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_registration_addons_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.event_registration_addon_selections', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_addon_selections (
    registration_id UNIQUEIDENTIFIER NOT NULL,
    addon_id UNIQUEIDENTIFIER NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_cents INT NOT NULL DEFAULT 0,
    total_price_cents INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_registration_addon_selections PRIMARY KEY (registration_id, addon_id),
    CONSTRAINT fk_event_registration_addon_selections_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_registration_addon_selections_addon FOREIGN KEY (addon_id) REFERENCES dbo.event_registration_addons(id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'registration_addons.read')
BEGIN
  INSERT INTO dbo.permissions (name, description) VALUES
    ('registration_addons.read', 'Read event registration add-ons'),
    ('registration_addons.manage', 'Manage event registration add-ons');
END;

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name IN ('platform_admin', 'tenant_owner')
  AND p.name IN ('registration_addons.read', 'registration_addons.manage')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'016_create_registration_addons.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 016_create_registration_addons.sql; already applied';
END;
GO

PRINT N'Applying 017_create_registration_forms_materials_certificates.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'017_create_registration_forms_materials_certificates.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

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

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'017_create_registration_forms_materials_certificates.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 017_create_registration_forms_materials_certificates.sql; already applied';
END;
GO

PRINT N'Applying 018_create_academic_reviewer_role.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'018_create_academic_reviewer_role.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'academic_reviewer')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('academic_reviewer', 'Academic reviewer with access to assigned reviews', 1);
END;

DECLARE @reviewerRoleId UNIQUEIDENTIFIER = (
  SELECT TOP 1 id FROM dbo.roles WHERE name = 'academic_reviewer'
);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT @reviewerRoleId, p.id
FROM dbo.permissions p
WHERE p.name IN ('reviews.submit')
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = @reviewerRoleId
      AND rp.permission_id = p.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'018_create_academic_reviewer_role.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 018_create_academic_reviewer_role.sql; already applied';
END;
GO

PRINT N'Applying 019_add_platform_backoffice_permissions.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'019_add_platform_backoffice_permissions.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'plans.manage')
BEGIN
  INSERT INTO dbo.permissions (name, description)
  VALUES ('plans.manage', 'Create and update SaaS plans');
END;

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
INNER JOIN dbo.permissions p ON p.name IN (
  'plans.read',
  'plans.manage',
  'subscriptions.read',
  'subscriptions.manage'
)
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'019_add_platform_backoffice_permissions.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 019_add_platform_backoffice_permissions.sql; already applied';
END;
GO

PRINT N'Applying 020_scope_platform_admin_permissions.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'020_scope_platform_admin_permissions.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

DECLARE @platformAdminRoleId UNIQUEIDENTIFIER = (
  SELECT TOP 1 id FROM dbo.roles WHERE name = 'platform_admin'
);

IF @platformAdminRoleId IS NOT NULL
BEGIN
  DELETE rp
  FROM dbo.role_permissions rp
  INNER JOIN dbo.permissions p ON p.id = rp.permission_id
  WHERE rp.role_id = @platformAdminRoleId
    AND p.name NOT IN (
      'plans.read',
      'plans.manage',
      'subscriptions.read',
      'subscriptions.manage',
      'tenants.read',
      'users.read'
    );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'020_scope_platform_admin_permissions.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 020_scope_platform_admin_permissions.sql; already applied';
END;
GO

PRINT N'Applying 021_add_site_template_permissions.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'021_add_site_template_permissions.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

DECLARE @templatePermissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @templatePermissions (name, description)
VALUES
  ('site_templates.read', 'Read imported site templates'),
  ('site_templates.manage', 'Import and manage site templates');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @templatePermissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
INNER JOIN dbo.permissions p ON p.name IN ('site_templates.read', 'site_templates.manage')
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'021_add_site_template_permissions.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 021_add_site_template_permissions.sql; already applied';
END;
GO

PRINT N'Applying 022_grant_cms_manage_to_tenant_owner.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'022_grant_cms_manage_to_tenant_owner.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'tenant_owner')
AND EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'cms.manage')
BEGIN
  INSERT INTO dbo.role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM dbo.roles r
  CROSS JOIN dbo.permissions p
  WHERE r.name = 'tenant_owner'
    AND p.name = 'cms.manage'
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.role_permissions rp
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
    );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'022_grant_cms_manage_to_tenant_owner.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 022_grant_cms_manage_to_tenant_owner.sql; already applied';
END;
GO

PRINT N'Applying 023_create_site_data_tables.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'023_create_site_data_tables.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_agenda_days', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_agenda_days (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    label NVARCHAR(120) NOT NULL,
    date_label NVARCHAR(120) NULL,
    starts_at DATETIME2 NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'published',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_agenda_days PRIMARY KEY (id),
    CONSTRAINT fk_event_agenda_days_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_agenda_days_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_agenda_days_status CHECK (status IN ('draft','published'))
  );
END;

IF OBJECT_ID('dbo.event_agenda_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_agenda_items (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    day_id UNIQUEIDENTIFIER NULL,
    title NVARCHAR(220) NOT NULL,
    description NVARCHAR(MAX) NULL,
    starts_at DATETIME2 NULL,
    ends_at DATETIME2 NULL,
    time_label NVARCHAR(120) NULL,
    speaker NVARCHAR(180) NULL,
    location NVARCHAR(180) NULL,
    image_file_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'published',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_agenda_items PRIMARY KEY (id),
    CONSTRAINT fk_event_agenda_items_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_agenda_items_day FOREIGN KEY (day_id) REFERENCES dbo.event_agenda_days(id),
    CONSTRAINT fk_event_agenda_items_image FOREIGN KEY (image_file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_agenda_items_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_agenda_items_status CHECK (status IN ('draft','published'))
  );
END;

IF OBJECT_ID('dbo.event_testimonials', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_testimonials (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    author_name NVARCHAR(180) NOT NULL,
    author_role NVARCHAR(180) NULL,
    quote NVARCHAR(MAX) NOT NULL,
    image_file_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'published',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_testimonials PRIMARY KEY (id),
    CONSTRAINT fk_event_testimonials_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_testimonials_image FOREIGN KEY (image_file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_testimonials_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_testimonials_status CHECK (status IN ('draft','published'))
  );
END;

IF OBJECT_ID('dbo.event_speakers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_speakers (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(180) NOT NULL,
    role NVARCHAR(180) NULL,
    bio NVARCHAR(MAX) NULL,
    image_file_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'published',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_speakers PRIMARY KEY (id),
    CONSTRAINT fk_event_speakers_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_speakers_image FOREIGN KEY (image_file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_speakers_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_speakers_status CHECK (status IN ('draft','published'))
  );
END;

IF OBJECT_ID('dbo.event_faq_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_faq_items (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    question NVARCHAR(260) NOT NULL,
    answer NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'published',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_faq_items PRIMARY KEY (id),
    CONSTRAINT fk_event_faq_items_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_faq_items_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_faq_items_status CHECK (status IN ('draft','published'))
  );
END;

IF OBJECT_ID('dbo.event_sponsors', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_sponsors (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(180) NOT NULL,
    tier NVARCHAR(120) NULL,
    url NVARCHAR(500) NULL,
    logo_file_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'published',
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_sponsors PRIMARY KEY (id),
    CONSTRAINT fk_event_sponsors_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_sponsors_logo FOREIGN KEY (logo_file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_sponsors_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_sponsors_status CHECK (status IN ('draft','published'))
  );
END;

IF OBJECT_ID('dbo.event_payment_provider_settings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_payment_provider_settings (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    provider NVARCHAR(60) NOT NULL,
    mode NVARCHAR(20) NOT NULL DEFAULT 'test',
    is_active BIT NOT NULL DEFAULT 0,
    public_key NVARCHAR(500) NULL,
    secret_key_encrypted NVARCHAR(MAX) NULL,
    webhook_secret_encrypted NVARCHAR(MAX) NULL,
    metadata_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_payment_provider_settings PRIMARY KEY (id),
    CONSTRAINT uq_event_payment_provider_settings UNIQUE (event_id, provider),
    CONSTRAINT fk_event_payment_provider_settings_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_payment_provider_settings_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_payment_provider_settings_provider CHECK (provider IN ('stripe','mercadopago')),
    CONSTRAINT ck_event_payment_provider_settings_mode CHECK (mode IN ('test','live'))
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'023_create_site_data_tables.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 023_create_site_data_tables.sql; already applied';
END;
GO

PRINT N'Applying 024_add_registration_type_to_addons.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'024_add_registration_type_to_addons.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_registration_addons', 'registration_type_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registration_addons
    ADD registration_type_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_registration_addons_type'
)
BEGIN
  ALTER TABLE dbo.event_registration_addons
    ADD CONSTRAINT fk_event_registration_addons_type
    FOREIGN KEY (registration_type_id) REFERENCES dbo.event_registration_types(id);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ix_event_registration_addons_type'
    AND object_id = OBJECT_ID('dbo.event_registration_addons')
)
BEGIN
  CREATE INDEX ix_event_registration_addons_type
    ON dbo.event_registration_addons(event_id, registration_type_id, is_active, sort_order);
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'024_add_registration_type_to_addons.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 024_add_registration_type_to_addons.sql; already applied';
END;
GO

PRINT N'Applying 025_expand_agenda_items_for_visual_layouts.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'025_expand_agenda_items_for_visual_layouts.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_agenda_items', 'speaker_role') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_role NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'speaker_image_file_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_image_file_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'speaker_email') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_email NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'track') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD track NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'action_label') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD action_label NVARCHAR(120) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'action_url') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD action_url NVARCHAR(500) NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_agenda_items_speaker_image'
)
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD CONSTRAINT fk_event_agenda_items_speaker_image
    FOREIGN KEY (speaker_image_file_id) REFERENCES dbo.files(id);
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'025_expand_agenda_items_for_visual_layouts.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 025_expand_agenda_items_for_visual_layouts.sql; already applied';
END;
GO

PRINT N'Applying 026_create_tenant_invitations.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'026_create_tenant_invitations.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.tenant_invitations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_invitations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    accepted_at DATETIME2 NULL,
    revoked_at DATETIME2 NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    last_sent_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_tenant_invitations_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_invitations_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_invitations_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );

  CREATE INDEX ix_tenant_invitations_membership
    ON dbo.tenant_invitations (tenant_id, user_id, created_at DESC);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'tenant_invitation')
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body)
  VALUES (
    'tenant_invitation',
    'Invitacion para colaborar en {{organizationName}}',
    'Hola {{name}},

Has sido invitado a colaborar en {{organizationName}} dentro de SysEvents.

Usa el siguiente enlace para confirmar tu acceso y elegir tu propia contrasena:
{{invitationUrl}}

El enlace vence en {{expiresIn}}. Si no esperabas esta invitacion, puedes ignorar este mensaje.'
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'026_create_tenant_invitations.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 026_create_tenant_invitations.sql; already applied';
END;
GO

PRINT N'Applying 027_create_event_programs_and_academic_flow.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'027_create_event_programs_and_academic_flow.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

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

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'027_create_event_programs_and_academic_flow.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 027_create_event_programs_and_academic_flow.sql; already applied';
END;
GO

PRINT N'Applying 028_link_agenda_items_to_speakers.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'028_link_agenda_items_to_speakers.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_agenda_items', 'speaker_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_agenda_items_speaker'
    AND parent_object_id = OBJECT_ID('dbo.event_agenda_items')
)
BEGIN
  EXEC('ALTER TABLE dbo.event_agenda_items
    ADD CONSTRAINT fk_event_agenda_items_speaker
    FOREIGN KEY (speaker_id) REFERENCES dbo.event_speakers(id);');
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ix_event_agenda_items_speaker_id'
    AND object_id = OBJECT_ID('dbo.event_agenda_items')
)
BEGIN
  EXEC('CREATE INDEX ix_event_agenda_items_speaker_id
    ON dbo.event_agenda_items (speaker_id)
    WHERE speaker_id IS NOT NULL;');
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'028_link_agenda_items_to_speakers.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 028_link_agenda_items_to_speakers.sql; already applied';
END;
GO

PRINT N'Applying 029_expand_event_speakers_contact_profile.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'029_expand_event_speakers_contact_profile.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_speakers', 'email') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD email NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'phone') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD phone NVARCHAR(80) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'organization') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD organization NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'website_url') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD website_url NVARCHAR(500) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'social_url') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD social_url NVARCHAR(500) NULL;
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'029_expand_event_speakers_contact_profile.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 029_expand_event_speakers_contact_profile.sql; already applied';
END;
GO

PRINT N'Applying 030_seed_media_file_categories.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'030_seed_media_file_categories.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.file_categories', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'speaker_media')
    INSERT INTO dbo.file_categories (name, description) VALUES ('speaker_media', 'Archivos asociados a ponentes');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'sponsor_media')
    INSERT INTO dbo.file_categories (name, description) VALUES ('sponsor_media', 'Logos y archivos asociados a patrocinadores');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'agenda_media')
    INSERT INTO dbo.file_categories (name, description) VALUES ('agenda_media', 'Imagenes y archivos asociados a la agenda');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'event_material')
    INSERT INTO dbo.file_categories (name, description) VALUES ('event_material', 'Materiales publicos descargables del evento');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'site_asset')
    INSERT INTO dbo.file_categories (name, description) VALUES ('site_asset', 'Recursos generales del sitio publico');
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'030_seed_media_file_categories.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 030_seed_media_file_categories.sql; already applied';
END;
GO

PRINT N'Applying 031_promote_approved_registrations_to_speakers.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'031_promote_approved_registrations_to_speakers.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_speakers', 'source_registration_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers
    ADD source_registration_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_speakers_source_registration'
)
BEGIN
  EXEC('
    ALTER TABLE dbo.event_speakers
      ADD CONSTRAINT fk_event_speakers_source_registration
      FOREIGN KEY (source_registration_id) REFERENCES dbo.event_registrations(id);
  ');
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'uq_event_speakers_source_registration'
    AND object_id = OBJECT_ID('dbo.event_speakers')
)
BEGIN
  EXEC('
    CREATE UNIQUE INDEX uq_event_speakers_source_registration
      ON dbo.event_speakers(source_registration_id)
      WHERE source_registration_id IS NOT NULL;
  ');
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'031_promote_approved_registrations_to_speakers.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 031_promote_approved_registrations_to_speakers.sql; already applied';
END;
GO

PRINT N'Applying 032_allow_reusing_deleted_registration_field_keys.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'032_allow_reusing_deleted_registration_field_keys.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE name = 'uq_event_registration_form_fields_key'
    AND parent_object_id = OBJECT_ID('dbo.event_registration_form_fields')
)
BEGIN
  ALTER TABLE dbo.event_registration_form_fields
    DROP CONSTRAINT uq_event_registration_form_fields_key;
END;

IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'uq_event_registration_form_fields_key'
    AND object_id = OBJECT_ID('dbo.event_registration_form_fields')
)
BEGIN
  DROP INDEX uq_event_registration_form_fields_key
    ON dbo.event_registration_form_fields;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'uq_event_registration_form_fields_active_key'
    AND object_id = OBJECT_ID('dbo.event_registration_form_fields')
)
BEGIN
  CREATE UNIQUE INDEX uq_event_registration_form_fields_active_key
    ON dbo.event_registration_form_fields(form_id, field_key)
    WHERE deleted_at IS NULL;
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'032_allow_reusing_deleted_registration_field_keys.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 032_allow_reusing_deleted_registration_field_keys.sql; already applied';
END;
GO

PRINT N'Applying 033_enable_mercadopago_provider.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'033_enable_mercadopago_provider.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

UPDATE dbo.payment_providers
SET is_active = 1
WHERE name = 'mercadopago';

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'033_enable_mercadopago_provider.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 033_enable_mercadopago_provider.sql; already applied';
END;
GO

PRINT N'Applying 034_add_subscription_expiration.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'034_add_subscription_expiration.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

UPDATE subscriptions
SET ends_at = CASE
  WHEN plans.billing_interval = 'monthly' THEN DATEADD(MONTH, 1, subscriptions.starts_at)
  WHEN plans.billing_interval = 'yearly' THEN DATEADD(YEAR, 1, subscriptions.starts_at)
  ELSE DATEADD(DAY, COALESCE(TRY_CONVERT(INT, JSON_VALUE(plans.features_json, '$.validityDays')), 365), subscriptions.starts_at)
END,
updated_at = SYSUTCDATETIME()
FROM dbo.tenant_subscriptions subscriptions
INNER JOIN dbo.saas_plans plans ON plans.id = subscriptions.plan_id
WHERE subscriptions.ends_at IS NULL;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'034_add_subscription_expiration.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 034_add_subscription_expiration.sql; already applied';
END;
GO

PRINT N'Applying 035_normalize_speaker_approval_status.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'035_normalize_speaker_approval_status.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

UPDATE dbo.event_registrations
SET status = 'accepted_pending_payment',
    updated_at = SYSUTCDATETIME()
WHERE status = 'approved';

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'035_normalize_speaker_approval_status.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 035_normalize_speaker_approval_status.sql; already applied';
END;
GO

PRINT N'Applying 036_create_program_review_teams.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'036_create_program_review_teams.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_program_review_team_members', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_program_review_team_members (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    team_role NVARCHAR(30) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_program_review_team_members PRIMARY KEY (id),
    CONSTRAINT fk_program_review_team_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_program_review_team_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_program_review_team_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_program_review_team_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_program_review_team_role CHECK (team_role IN ('leader', 'reviewer')),
    CONSTRAINT uq_program_review_team_user UNIQUE (program_id, user_id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'program_leader')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('program_leader', 'Academic program leader who manages review assignments and final decisions', 1);
END;

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM dbo.roles role
INNER JOIN dbo.permissions permission ON permission.name IN (
  'events.read', 'submissions.read', 'reviews.assign', 'reviews.submit', 'reviews.decide'
)
WHERE role.name = 'program_leader'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
  );

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'uq_program_review_team_leader'
    AND object_id = OBJECT_ID('dbo.event_program_review_team_members')
)
BEGIN
  CREATE UNIQUE INDEX uq_program_review_team_leader
    ON dbo.event_program_review_team_members(program_id)
    WHERE team_role = 'leader';
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'036_create_program_review_teams.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 036_create_program_review_teams.sql; already applied';
END;
GO

PRINT N'Applying 037_create_event_knowledge_catalogs.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'037_create_event_knowledge_catalogs.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_knowledge_areas', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_knowledge_areas (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(180) NOT NULL,
    description NVARCHAR(MAX) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_knowledge_areas PRIMARY KEY (id),
    CONSTRAINT fk_event_knowledge_areas_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_knowledge_areas_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_knowledge_areas_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.event_knowledge_lines', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_knowledge_lines (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    area_id UNIQUEIDENTIFIER NULL,
    name NVARCHAR(220) NOT NULL,
    description NVARCHAR(MAX) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_knowledge_lines PRIMARY KEY (id),
    CONSTRAINT fk_event_knowledge_lines_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_knowledge_lines_area FOREIGN KEY (area_id) REFERENCES dbo.event_knowledge_areas(id),
    CONSTRAINT fk_event_knowledge_lines_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_knowledge_lines_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id)
  );
END;

IF COL_LENGTH('dbo.submissions', 'knowledge_area_id') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD knowledge_area_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.submissions', 'knowledge_line_id') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD knowledge_line_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_submissions_knowledge_area')
BEGIN
  ALTER TABLE dbo.submissions
    ADD CONSTRAINT fk_submissions_knowledge_area FOREIGN KEY (knowledge_area_id) REFERENCES dbo.event_knowledge_areas(id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_submissions_knowledge_line')
BEGIN
  ALTER TABLE dbo.submissions
    ADD CONSTRAINT fk_submissions_knowledge_line FOREIGN KEY (knowledge_line_id) REFERENCES dbo.event_knowledge_lines(id);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_event_knowledge_areas_event'
    AND object_id = OBJECT_ID('dbo.event_knowledge_areas')
)
BEGIN
  CREATE INDEX ix_event_knowledge_areas_event
    ON dbo.event_knowledge_areas(event_id, is_active, sort_order);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_event_knowledge_lines_event_area'
    AND object_id = OBJECT_ID('dbo.event_knowledge_lines')
)
BEGIN
  CREATE INDEX ix_event_knowledge_lines_event_area
    ON dbo.event_knowledge_lines(event_id, area_id, is_active, sort_order);
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'037_create_event_knowledge_catalogs.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 037_create_event_knowledge_catalogs.sql; already applied';
END;
GO

PRINT N'Applying 038_add_registration_knowledge_selection.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'038_add_registration_knowledge_selection.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_registrations', 'knowledge_area_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registrations ADD knowledge_area_id UNIQUEIDENTIFIER NULL;
  ALTER TABLE dbo.event_registrations ADD CONSTRAINT fk_event_registrations_knowledge_area
    FOREIGN KEY (knowledge_area_id) REFERENCES dbo.event_knowledge_areas(id);
END;

IF COL_LENGTH('dbo.event_registrations', 'knowledge_line_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registrations ADD knowledge_line_id UNIQUEIDENTIFIER NULL;
  ALTER TABLE dbo.event_registrations ADD CONSTRAINT fk_event_registrations_knowledge_line
    FOREIGN KEY (knowledge_line_id) REFERENCES dbo.event_knowledge_lines(id);
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'038_add_registration_knowledge_selection.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 038_add_registration_knowledge_selection.sql; already applied';
END;
GO

PRINT N'Applying 039_add_professional_experience.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'039_add_professional_experience.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.participant_profiles', 'professional_experience_json') IS NULL
  ALTER TABLE dbo.participant_profiles ADD professional_experience_json NVARCHAR(MAX) NOT NULL CONSTRAINT df_participant_profiles_professional_experience DEFAULT '[]';

IF COL_LENGTH('dbo.event_speakers', 'professional_experience_json') IS NULL
  ALTER TABLE dbo.event_speakers ADD professional_experience_json NVARCHAR(MAX) NOT NULL CONSTRAINT df_event_speakers_professional_experience DEFAULT '[]';

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'039_add_professional_experience.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 039_add_professional_experience.sql; already applied';
END;
GO

PRINT N'Applying 040_add_registration_participation_mode.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'040_add_registration_participation_mode.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_registrations', 'participation_mode') IS NULL
BEGIN
  ALTER TABLE dbo.event_registrations ADD participation_mode NVARCHAR(20) NOT NULL
    CONSTRAINT df_event_registrations_participation_mode DEFAULT 'presenter';
  EXEC(N'ALTER TABLE dbo.event_registrations ADD CONSTRAINT ck_event_registrations_participation_mode
    CHECK (participation_mode IN (''attendee'', ''presenter''));');
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'040_add_registration_participation_mode.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 040_add_registration_participation_mode.sql; already applied';
END;
GO

PRINT N'Applying 041_link_registration_types_to_programs.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'041_link_registration_types_to_programs.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_registration_types', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registration_types ADD program_id UNIQUEIDENTIFIER NULL;
  ALTER TABLE dbo.event_registration_types ADD CONSTRAINT fk_registration_types_program
    FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);
END;

EXEC(N'
  UPDATE registration_type
  SET program_id = matched.program_id
  FROM dbo.event_registration_types registration_type
  CROSS APPLY (
    SELECT TOP 1 program.id AS program_id
    FROM dbo.event_programs program
    WHERE program.event_id = registration_type.event_id
      AND LOWER(registration_type.name) LIKE ''%'' + LOWER(LEFT(program.name, CHARINDEX('' '', program.name + '' '') - 1)) + ''%''
      AND program.deleted_at IS NULL
    ORDER BY LEN(program.name) DESC
  ) matched
  WHERE registration_type.program_id IS NULL;

  UPDATE registration
  SET program_id = registration_type.program_id
  FROM dbo.event_registrations registration
  INNER JOIN dbo.event_registration_types registration_type ON registration_type.id = registration.registration_type_id
  WHERE registration.program_id IS NULL AND registration_type.program_id IS NOT NULL;
');

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'041_link_registration_types_to_programs.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 041_link_registration_types_to_programs.sql; already applied';
END;
GO

PRINT N'Applying 042_create_review_file_comments.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'042_create_review_file_comments.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.review_file_comments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_file_comments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    file_id UNIQUEIDENTIFIER NOT NULL,
    page_number INT NULL,
    section_label NVARCHAR(180) NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_file_comments_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.review_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_file_comments_file FOREIGN KEY (file_id) REFERENCES dbo.files(id)
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'042_create_review_file_comments.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 042_create_review_file_comments.sql; already applied';
END;
GO

PRINT N'Applying 043_add_review_comment_anchors.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'043_add_review_comment_anchors.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.review_file_comments', 'selected_text') IS NULL
  ALTER TABLE dbo.review_file_comments ADD selected_text NVARCHAR(2000) NULL;

IF COL_LENGTH('dbo.review_file_comments', 'anchor_json') IS NULL
  ALTER TABLE dbo.review_file_comments ADD anchor_json NVARCHAR(MAX) NULL;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'043_add_review_comment_anchors.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 043_add_review_comment_anchors.sql; already applied';
END;
GO

PRINT N'Applying 044_add_review_comment_updates.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'044_add_review_comment_updates.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.review_file_comments', 'updated_at') IS NULL
  ALTER TABLE dbo.review_file_comments ADD updated_at DATETIME2 NULL;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'044_add_review_comment_updates.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 044_add_review_comment_updates.sql; already applied';
END;
GO

PRINT N'Applying 045_add_review_completed_email_template.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'045_add_review_completed_email_template.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'review_completed')
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body)
  VALUES (
    'review_completed',
    'Review completed: {{submissionTitle}}',
    'The assigned reviewer completed the recommendation for {{submissionTitle}}. You can now review it and issue the final decision.'
  );
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'045_add_review_completed_email_template.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 045_add_review_completed_email_template.sql; already applied';
END;
GO

PRINT N'Applying 046_prevent_duplicate_review_assignments.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'046_prevent_duplicate_review_assignments.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

;WITH ranked_assignments AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY submission_id, reviewer_user_id
      ORDER BY CASE WHEN status = 'submitted' THEN 0 ELSE 1 END,
        CASE WHEN submitted_at IS NULL THEN 1 ELSE 0 END,
        submitted_at DESC,
        created_at ASC
    ) AS duplicate_rank
  FROM dbo.review_assignments
)
DELETE assignment
FROM dbo.review_assignments assignment
INNER JOIN ranked_assignments ranked ON ranked.id = assignment.id
WHERE ranked.duplicate_rank > 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.review_assignments')
    AND name = 'uq_review_assignments_submission_reviewer'
)
BEGIN
  CREATE UNIQUE INDEX uq_review_assignments_submission_reviewer
    ON dbo.review_assignments (submission_id, reviewer_user_id);
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'046_prevent_duplicate_review_assignments.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 046_prevent_duplicate_review_assignments.sql; already applied';
END;
GO

PRINT N'Applying 047_set_owner_admin_plan_limit.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'047_set_owner_admin_plan_limit.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.saas_plans', 'U') IS NOT NULL
BEGIN
  DECLARE @defaultName NVARCHAR(128);

  SELECT @defaultName = dc.name
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
  WHERE dc.parent_object_id = OBJECT_ID('dbo.saas_plans')
    AND c.name = 'max_users';

  IF @defaultName IS NOT NULL
  BEGIN
    DECLARE @dropSql NVARCHAR(MAX) = N'ALTER TABLE dbo.saas_plans DROP CONSTRAINT ' + QUOTENAME(@defaultName);
    EXEC sp_executesql @dropSql;
  END;

  ALTER TABLE dbo.saas_plans
    ADD CONSTRAINT df_saas_plans_max_users DEFAULT 5 FOR max_users;

  UPDATE dbo.saas_plans
  SET max_users = 5,
      features_json = JSON_MODIFY(features_json, '$.users', 5),
      updated_at = SYSUTCDATETIME()
  WHERE code = 'basic-free'
    AND max_users < 5;
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'047_set_owner_admin_plan_limit.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 047_set_owner_admin_plan_limit.sql; already applied';
END;
GO

PRINT N'Applying 048_include_event_in_tenant_invitation_email.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'048_include_event_in_tenant_invitation_email.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

UPDATE dbo.email_templates
SET subject = 'Invitacion para colaborar en {{organizationName}}/{{eventName}}',
    body = 'Hola {{name}},

Has sido invitado a colaborar en {{organizationName}} dentro de SysEvents. evento {{eventName}}.

Usa el siguiente enlace para confirmar tu acceso y elegir tu propia contrasena:
{{invitationUrl}}

El enlace vence en {{expiresIn}}. Si no esperabas esta invitacion, puedes ignorar este mensaje.',
    updated_at = SYSUTCDATETIME()
WHERE template_key = 'tenant_invitation';

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'048_include_event_in_tenant_invitation_email.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 048_include_event_in_tenant_invitation_email.sql; already applied';
END;
GO

PRINT N'Applying 049_enforce_single_review_team_per_event.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'049_enforce_single_review_team_per_event.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_program_review_team_members', 'U') IS NOT NULL
BEGIN
  DELETE reviewer
  FROM dbo.event_program_review_team_members reviewer
  WHERE reviewer.team_role = 'reviewer'
    AND EXISTS (
      SELECT 1
      FROM dbo.event_program_review_team_members leader
      WHERE leader.event_id = reviewer.event_id
        AND leader.user_id = reviewer.user_id
        AND leader.team_role = 'leader'
    );

  ;WITH duplicate_reviewers AS (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY event_id, user_id
        ORDER BY created_at ASC, id ASC
      ) AS row_number
    FROM dbo.event_program_review_team_members
    WHERE team_role = 'reviewer'
  )
  DELETE FROM duplicate_reviewers
  WHERE row_number > 1;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'uq_program_review_team_event_user'
      AND object_id = OBJECT_ID('dbo.event_program_review_team_members')
  )
  BEGIN
    CREATE UNIQUE INDEX uq_program_review_team_event_user
      ON dbo.event_program_review_team_members(event_id, user_id);
  END;
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'049_enforce_single_review_team_per_event.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 049_enforce_single_review_team_per_event.sql; already applied';
END;
GO

PRINT N'Applying 050_remove_non_reviewer_review_team_members.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'050_remove_non_reviewer_review_team_members.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_program_review_team_members', 'U') IS NOT NULL
BEGIN
  DELETE member
  FROM dbo.event_program_review_team_members member
  INNER JOIN dbo.events event ON event.id = member.event_id
  LEFT JOIN dbo.tenant_users tenant_user
    ON tenant_user.tenant_id = event.tenant_id
   AND tenant_user.user_id = member.user_id
  WHERE COALESCE(tenant_user.tenant_role, '') <> 'reviewer';
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'050_remove_non_reviewer_review_team_members.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 050_remove_non_reviewer_review_team_members.sql; already applied';
END;
GO

PRINT N'Applying 051_add_openpay_payment_provider.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'051_add_openpay_payment_provider.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'ck_event_payment_provider_settings_provider'
    AND parent_object_id = OBJECT_ID('dbo.event_payment_provider_settings')
)
BEGIN
  ALTER TABLE dbo.event_payment_provider_settings
  DROP CONSTRAINT ck_event_payment_provider_settings_provider;
END;

ALTER TABLE dbo.event_payment_provider_settings
ADD CONSTRAINT ck_event_payment_provider_settings_provider
CHECK (provider IN ('stripe','mercadopago','openpay'));

IF NOT EXISTS (SELECT 1 FROM dbo.payment_providers WHERE name = 'openpay')
BEGIN
  INSERT INTO dbo.payment_providers (name, is_active)
  VALUES ('openpay', 1);
END
ELSE
BEGIN
  UPDATE dbo.payment_providers
  SET is_active = 1
  WHERE name = 'openpay';
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'051_add_openpay_payment_provider.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 051_add_openpay_payment_provider.sql; already applied';
END;
GO

PRINT N'Applying 052_use_mxn_as_payment_currency.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'052_use_mxn_as_payment_currency.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

DECLARE @sql NVARCHAR(MAX);

SELECT @sql = N'ALTER TABLE dbo.event_settings DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_settings')
  AND c.name = 'default_currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_settings ADD CONSTRAINT df_event_settings_default_currency DEFAULT 'MXN' FOR default_currency;

SET @sql = NULL;
SELECT @sql = N'ALTER TABLE dbo.event_registration_types DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_registration_types')
  AND c.name = 'currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_registration_types ADD CONSTRAINT df_event_registration_types_currency DEFAULT 'MXN' FOR currency;

SET @sql = NULL;
SELECT @sql = N'ALTER TABLE dbo.event_registration_addons DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_registration_addons')
  AND c.name = 'currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_registration_addons ADD CONSTRAINT df_event_registration_addons_currency DEFAULT 'MXN' FOR currency;

SET @sql = NULL;
SELECT @sql = N'ALTER TABLE dbo.event_registrations DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_registrations')
  AND c.name = 'currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_registrations ADD CONSTRAINT df_event_registrations_currency DEFAULT 'MXN' FOR currency;

UPDATE dbo.event_settings
SET default_currency = 'MXN'
WHERE default_currency = 'USD';

UPDATE dbo.event_registration_types
SET currency = 'MXN'
WHERE currency = 'USD';

UPDATE dbo.event_registration_addons
SET currency = 'MXN'
WHERE currency = 'USD';

UPDATE registration
SET currency = 'MXN'
FROM dbo.event_registrations registration
WHERE registration.currency = 'USD'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.payment_orders payment_order
    WHERE payment_order.registration_id = registration.id
      AND payment_order.status = 'paid'
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'052_use_mxn_as_payment_currency.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 052_use_mxn_as_payment_currency.sql; already applied';
END;
GO

PRINT N'Applying 053_filter_payment_order_provider_order_unique.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'053_filter_payment_order_provider_order_unique.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

DECLARE @constraintName SYSNAME;

SELECT TOP 1 @constraintName = key_constraints.name
FROM sys.key_constraints
INNER JOIN sys.index_columns
  ON index_columns.object_id = key_constraints.parent_object_id
  AND index_columns.index_id = key_constraints.unique_index_id
INNER JOIN sys.columns
  ON columns.object_id = index_columns.object_id
  AND columns.column_id = index_columns.column_id
WHERE key_constraints.parent_object_id = OBJECT_ID('dbo.payment_orders')
  AND key_constraints.[type] = 'UQ'
  AND columns.name = 'provider_order_id';

IF @constraintName IS NOT NULL
BEGIN
  DECLARE @dropConstraintSql NVARCHAR(MAX);
  SET @dropConstraintSql = N'ALTER TABLE dbo.payment_orders DROP CONSTRAINT ' + QUOTENAME(@constraintName);
  EXEC sp_executesql @dropConstraintSql;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.payment_orders')
    AND name = 'ux_payment_orders_provider_order_id_not_null'
)
BEGIN
  CREATE UNIQUE INDEX ux_payment_orders_provider_order_id_not_null
    ON dbo.payment_orders(provider_order_id)
    WHERE provider_order_id IS NOT NULL;
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'053_filter_payment_order_provider_order_unique.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 053_filter_payment_order_provider_order_unique.sql; already applied';
END;
GO

PRINT N'Applying 054_add_default_payment_provider.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'054_add_default_payment_provider.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_payment_provider_settings', 'is_default') IS NULL
BEGIN
  ALTER TABLE dbo.event_payment_provider_settings
  ADD is_default BIT NOT NULL CONSTRAINT df_event_payment_provider_settings_is_default DEFAULT 0;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ux_event_payment_provider_settings_default'
    AND object_id = OBJECT_ID('dbo.event_payment_provider_settings')
)
BEGIN
  EXEC sp_executesql N'
    CREATE UNIQUE INDEX ux_event_payment_provider_settings_default
      ON dbo.event_payment_provider_settings(event_id)
      WHERE is_default = 1 AND deleted_at IS NULL;
  ';
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'054_add_default_payment_provider.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 054_add_default_payment_provider.sql; already applied';
END;
GO

PRINT N'Applying 055_add_submission_video_url.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'055_add_submission_video_url.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.submissions', 'video_url') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD video_url NVARCHAR(1000) NULL;
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'055_add_submission_video_url.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 055_add_submission_video_url.sql; already applied';
END;
GO

PRINT N'Applying 056_expand_certificate_templates_for_visual_editor.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'056_expand_certificate_templates_for_visual_editor.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.event_certificate_templates', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD program_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'background_file_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD background_file_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'target_role') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD target_role NVARCHAR(40) NOT NULL CONSTRAINT df_event_certificate_templates_target_role DEFAULT 'participant';
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'recipient_source') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD recipient_source NVARCHAR(40) NOT NULL CONSTRAINT df_event_certificate_templates_recipient_source DEFAULT 'registration';
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'sort_order') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD sort_order INT NOT NULL CONSTRAINT df_event_certificate_templates_sort_order DEFAULT 0;
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'deleted_at') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD deleted_at DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_event_certificate_templates_program')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT fk_event_certificate_templates_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_event_certificate_templates_background_file')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT fk_event_certificate_templates_background_file FOREIGN KEY (background_file_id) REFERENCES dbo.files(id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_event_certificate_templates_target_role')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT ck_event_certificate_templates_target_role CHECK (target_role IN (''participant'',''speaker'',''advisor''));');
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_event_certificate_templates_recipient_source')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT ck_event_certificate_templates_recipient_source CHECK (recipient_source IN (''registration'',''speaker'',''advisor_manual''));');
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'056_expand_certificate_templates_for_visual_editor.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 056_expand_certificate_templates_for_visual_editor.sql; already applied';
END;
GO

PRINT N'Applying 057_create_dynamic_program_reports.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'057_create_dynamic_program_reports.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID('dbo.event_report_definitions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_report_definitions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    owner_user_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    config_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_report_definitions PRIMARY KEY (id),
    CONSTRAINT fk_event_report_definitions_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_report_definitions_owner FOREIGN KEY (owner_user_id) REFERENCES dbo.users(id)
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_event_report_definitions_owner'
    AND object_id = OBJECT_ID('dbo.event_report_definitions')
)
BEGIN
  CREATE INDEX ix_event_report_definitions_owner
    ON dbo.event_report_definitions(event_id, owner_user_id, updated_at DESC);
END;

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM dbo.roles role
INNER JOIN dbo.permissions permission ON permission.name = 'reports.read'
WHERE role.name = 'program_leader'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
  );

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'057_create_dynamic_program_reports.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 057_create_dynamic_program_reports.sql; already applied';
END;
GO

PRINT N'Applying 058_add_event_backoffice_logo.sql';

IF NOT EXISTS (
  SELECT 1
  FROM dbo.schema_migrations
  WHERE filename = N'058_add_event_backoffice_logo.sql'
)
BEGIN
  BEGIN TRY
    BEGIN TRANSACTION;

IF COL_LENGTH('dbo.events', 'logo_file_id') IS NULL
BEGIN
  ALTER TABLE dbo.events ADD logo_file_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_events_logo_file')
BEGIN
  EXEC(N'ALTER TABLE dbo.events
    ADD CONSTRAINT fk_events_logo_file FOREIGN KEY (logo_file_id) REFERENCES dbo.files(id);');
END;

IF OBJECT_ID('dbo.file_categories', 'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'event_branding')
BEGIN
  INSERT INTO dbo.file_categories (name, description)
  VALUES ('event_branding', 'Logos e identidad visual del backoffice del evento');
END;

    INSERT INTO dbo.schema_migrations (filename)
    VALUES (N'058_add_event_backoffice_logo.sql');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;

    THROW;
  END CATCH;
END
ELSE
BEGIN
  PRINT N'Skipping 058_add_event_backoffice_logo.sql; already applied';
END;
GO

PRINT N'Creating SaaS platform administrator';

DECLARE @adminEmail NVARCHAR(255) = N'wozuna@hotmail.com';
DECLARE @adminPasswordHash NVARCHAR(255) = N'$2b$12$EtN5pyTeEwvB1g6TifRWJO8EGkIPQmKM1tD34xa8gt9QTUisrStNO';
DECLARE @adminFirstName NVARCHAR(120) = N'Administrador';
DECLARE @adminLastName NVARCHAR(120) = N'SaaS';
DECLARE @adminUserId UNIQUEIDENTIFIER;
DECLARE @platformAdminRoleId UNIQUEIDENTIFIER;

SELECT @adminUserId = id
FROM dbo.users
WHERE email = @adminEmail;

IF @adminUserId IS NULL
BEGIN
  SET @adminUserId = NEWID();

  INSERT INTO dbo.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    status
  )
  VALUES (
    @adminUserId,
    @adminEmail,
    @adminPasswordHash,
    @adminFirstName,
    @adminLastName,
    N'active'
  );
END
ELSE
BEGIN
  PRINT N'The SaaS administrator already exists; its password was preserved';
END;

SELECT @platformAdminRoleId = id
FROM dbo.roles
WHERE name = N'platform_admin';

IF @platformAdminRoleId IS NULL
  THROW 51000, 'The platform_admin role was not created', 1;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.user_roles
  WHERE user_id = @adminUserId
    AND role_id = @platformAdminRoleId
)
BEGIN
  INSERT INTO dbo.user_roles (user_id, role_id)
  VALUES (@adminUserId, @platformAdminRoleId);
END;
GO

PRINT N'SysEvents database installation completed successfully';
GO
