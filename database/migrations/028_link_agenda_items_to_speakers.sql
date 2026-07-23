IF COL_LENGTH('dbo.event_agenda_items', 'speaker_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_agenda_items
    ADD speaker_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_agenda_items_speaker'
    AND parent_object_id = OBJECT_ID('dbo.event_agenda_items')
)
BEGIN
  EXEC('ALTER TABLE dbo.event_agenda_items
    ADD CONSTRAINT fk_event_agenda_items_speaker
    FOREIGN KEY (speaker_id) REFERENCES dbo.event_speakers(id);');
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ix_event_agenda_items_speaker_id'
    AND object_id = OBJECT_ID('dbo.event_agenda_items')
)
BEGIN
  EXEC('CREATE INDEX ix_event_agenda_items_speaker_id
    ON dbo.event_agenda_items (speaker_id)
    WHERE speaker_id IS NOT NULL;');
END;
