IF OBJECT_ID('dbo.review_file_comments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_file_comments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    file_id UNIQUEIDENTIFIER NOT NULL,
    page_number INT NULL,
    section_label NVARCHAR(180) NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_file_comments_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.review_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_file_comments_file FOREIGN KEY (file_id) REFERENCES dbo.files(id)
  );
END;
