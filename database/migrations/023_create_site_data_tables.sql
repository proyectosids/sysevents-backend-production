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
