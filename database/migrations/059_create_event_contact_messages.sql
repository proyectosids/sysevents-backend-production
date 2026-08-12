IF OBJECT_ID('dbo.event_contact_messages', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_contact_messages (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    subject NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'new',
    ip_address NVARCHAR(64) NULL,
    user_agent NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    read_at DATETIME2 NULL,
    archived_at DATETIME2 NULL,
    CONSTRAINT pk_event_contact_messages PRIMARY KEY (id),
    CONSTRAINT fk_event_contact_messages_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT ck_event_contact_messages_status CHECK (status IN ('new', 'read', 'archived'))
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_event_contact_messages_event_status_created'
    AND object_id = OBJECT_ID('dbo.event_contact_messages')
)
BEGIN
  CREATE INDEX ix_event_contact_messages_event_status_created
    ON dbo.event_contact_messages(event_id, status, created_at DESC);
END;
