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
