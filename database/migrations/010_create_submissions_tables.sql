IF OBJECT_ID('dbo.submission_types', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_types (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(120) NOT NULL,
    description NVARCHAR(255) NULL,
    requires_file BIT NOT NULL DEFAULT 1,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_types_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.submissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submissions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    submission_type_id UNIQUEIDENTIFIER NOT NULL,
    owner_user_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(250) NOT NULL,
    abstract NVARCHAR(MAX) NULL,
    keywords NVARCHAR(500) NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'draft',
    submitted_at DATETIME2 NULL,
    deleted_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submissions_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_type FOREIGN KEY (submission_type_id) REFERENCES dbo.submission_types(id),
    CONSTRAINT fk_submissions_owner FOREIGN KEY (owner_user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.submission_authors', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_authors (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    full_name NVARCHAR(180) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    affiliation NVARCHAR(180) NULL,
    is_corresponding BIT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_authors_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.submission_files', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_files (
    submission_id UNIQUEIDENTIFIER NOT NULL,
    file_id UNIQUEIDENTIFIER NOT NULL,
    file_role NVARCHAR(60) NOT NULL DEFAULT 'manuscript',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_submission_files PRIMARY KEY (submission_id, file_id),
    CONSTRAINT fk_submission_files_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_files_file FOREIGN KEY (file_id) REFERENCES dbo.files(id)
  );
END;

IF OBJECT_ID('dbo.submission_status_history', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_status_history (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    from_status NVARCHAR(40) NULL,
    to_status NVARCHAR(40) NOT NULL,
    reason NVARCHAR(255) NULL,
    changed_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_status_history_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_status_history_user FOREIGN KEY (changed_by) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.submission_comments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.submission_comments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    author_user_id UNIQUEIDENTIFIER NOT NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    visibility NVARCHAR(40) NOT NULL DEFAULT 'internal',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_submission_comments_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_comments_user FOREIGN KEY (author_user_id) REFERENCES dbo.users(id)
  );
END;
