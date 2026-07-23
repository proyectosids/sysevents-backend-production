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
