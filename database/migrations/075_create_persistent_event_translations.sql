IF OBJECT_ID('dbo.event_site_translations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_site_translations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    source_language NVARCHAR(10) NOT NULL DEFAULT 'es',
    target_language NVARCHAR(10) NOT NULL,
    source_hash CHAR(64) NOT NULL,
    source_text NVARCHAR(MAX) NOT NULL,
    translated_text NVARCHAR(MAX) NOT NULL,
    provider NVARCHAR(40) NOT NULL DEFAULT 'google-cloud',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_site_translations PRIMARY KEY (id),
    CONSTRAINT fk_event_site_translations_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT ck_event_site_translations_source_language CHECK (source_language = 'es'),
    CONSTRAINT ck_event_site_translations_target_language CHECK (target_language IN ('en', 'fr', 'pt', 'de', 'it')),
    CONSTRAINT uq_event_site_translations UNIQUE (event_id, target_language, source_hash)
  );

  CREATE INDEX ix_event_site_translations_event_language
    ON dbo.event_site_translations (event_id, target_language)
    INCLUDE (source_hash, updated_at);
END;
