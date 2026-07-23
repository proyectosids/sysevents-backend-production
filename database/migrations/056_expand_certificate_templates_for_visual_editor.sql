IF COL_LENGTH('dbo.event_certificate_templates', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD program_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'background_file_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD background_file_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'target_role') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD target_role NVARCHAR(40) NOT NULL CONSTRAINT df_event_certificate_templates_target_role DEFAULT 'participant';
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'recipient_source') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD recipient_source NVARCHAR(40) NOT NULL CONSTRAINT df_event_certificate_templates_recipient_source DEFAULT 'registration';
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'sort_order') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD sort_order INT NOT NULL CONSTRAINT df_event_certificate_templates_sort_order DEFAULT 0;
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'deleted_at') IS NULL
BEGIN
  ALTER TABLE dbo.event_certificate_templates ADD deleted_at DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_event_certificate_templates_program')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT fk_event_certificate_templates_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_event_certificate_templates_background_file')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT fk_event_certificate_templates_background_file FOREIGN KEY (background_file_id) REFERENCES dbo.files(id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_event_certificate_templates_target_role')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT ck_event_certificate_templates_target_role CHECK (target_role IN (''participant'',''speaker'',''advisor''));');
END;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_event_certificate_templates_recipient_source')
BEGIN
  EXEC(N'ALTER TABLE dbo.event_certificate_templates
    ADD CONSTRAINT ck_event_certificate_templates_recipient_source CHECK (recipient_source IN (''registration'',''speaker'',''advisor_manual''));');
END;
