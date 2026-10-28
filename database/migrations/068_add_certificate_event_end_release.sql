IF COL_LENGTH('dbo.event_certificate_templates', 'release_trigger') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates
    ADD release_trigger NVARCHAR(30) NOT NULL
      CONSTRAINT df_event_certificate_templates_release_trigger DEFAULT 'agenda_item';
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'event_end_at') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD event_end_at DATETIME2 NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'ck_event_certificate_templates_release_trigger'
)
BEGIN
  ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT ck_event_certificate_templates_release_trigger
      CHECK (release_trigger IN ('agenda_item', 'event_end'));
END;
