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
