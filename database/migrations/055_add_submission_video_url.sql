IF COL_LENGTH('dbo.submissions', 'video_url') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD video_url NVARCHAR(1000) NULL;
END;
