IF COL_LENGTH('dbo.event_speakers', 'email') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD email NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'phone') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD phone NVARCHAR(80) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'organization') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD organization NVARCHAR(180) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'website_url') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD website_url NVARCHAR(500) NULL;
END;

IF COL_LENGTH('dbo.event_speakers', 'social_url') IS NULL
BEGIN
  ALTER TABLE dbo.event_speakers ADD social_url NVARCHAR(500) NULL;
END;
