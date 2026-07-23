IF COL_LENGTH('dbo.review_file_comments', 'updated_at') IS NULL
  ALTER TABLE dbo.review_file_comments ADD updated_at DATETIME2 NULL;
