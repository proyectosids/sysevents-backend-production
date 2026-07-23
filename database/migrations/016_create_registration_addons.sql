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
