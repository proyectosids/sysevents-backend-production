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
