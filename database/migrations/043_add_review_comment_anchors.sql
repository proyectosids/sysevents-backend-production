IF COL_LENGTH('dbo.review_file_comments', 'selected_text') IS NULL
  ALTER TABLE dbo.review_file_comments ADD selected_text NVARCHAR(2000) NULL;

IF COL_LENGTH('dbo.review_file_comments', 'anchor_json') IS NULL
  ALTER TABLE dbo.review_file_comments ADD anchor_json NVARCHAR(MAX) NULL;
