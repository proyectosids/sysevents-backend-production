IF COL_LENGTH('dbo.event_speakers', 'source_registration_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers
    ADD source_registration_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_speakers_source_registration'
)
BEGIN
  EXEC('
    ALTER TABLE dbo.event_speakers
      ADD CONSTRAINT fk_event_speakers_source_registration
      FOREIGN KEY (source_registration_id) REFERENCES dbo.event_registrations(id);
  ');
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'uq_event_speakers_source_registration'
    AND object_id = OBJECT_ID('dbo.event_speakers')
)
BEGIN
  EXEC('
    CREATE UNIQUE INDEX uq_event_speakers_source_registration
      ON dbo.event_speakers(source_registration_id)
      WHERE source_registration_id IS NOT NULL;
  ');
END;
