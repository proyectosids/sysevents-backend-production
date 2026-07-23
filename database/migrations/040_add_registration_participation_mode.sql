IF COL_LENGTH('dbo.event_registrations', 'participation_mode') IS NULL
BEGIN
  ALTER TABLE dbo.event_registrations ADD participation_mode NVARCHAR(20) NOT NULL
    CONSTRAINT df_event_registrations_participation_mode DEFAULT 'presenter';
  EXEC(N'ALTER TABLE dbo.event_registrations ADD CONSTRAINT ck_event_registrations_participation_mode
    CHECK (participation_mode IN (''attendee'', ''presenter''));');
END;
