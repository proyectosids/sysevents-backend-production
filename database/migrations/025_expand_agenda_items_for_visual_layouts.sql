IF COL_LENGTH('dbo.event_agenda_items', 'speaker_role') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_role NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'speaker_image_file_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_image_file_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'speaker_email') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_email NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'track') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD track NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'action_label') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD action_label NVARCHAR(120) NULL;
END;

IF COL_LENGTH('dbo.event_agenda_items', 'action_url') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD action_url NVARCHAR(500) NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_agenda_items_speaker_image'
)
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD CONSTRAINT fk_event_agenda_items_speaker_image
    FOREIGN KEY (speaker_image_file_id) REFERENCES dbo.files(id);
END;
