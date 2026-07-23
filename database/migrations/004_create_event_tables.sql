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
