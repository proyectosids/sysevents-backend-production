IF COL_LENGTH('dbo.event_speakers', 'is_featured') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers
    ADD is_featured BIT NOT NULL
      CONSTRAINT df_event_speakers_is_featured DEFAULT 0;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ux_event_speakers_one_featured'
    AND object_id = OBJECT_ID('dbo.event_speakers')
)
BEGIN
  EXEC(N'
    CREATE UNIQUE INDEX ux_event_speakers_one_featured
      ON dbo.event_speakers(event_id)
      WHERE is_featured = 1 AND deleted_at IS NULL;
  ');
END;
