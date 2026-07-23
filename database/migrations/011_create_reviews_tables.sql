IF OBJECT_ID('dbo.review_rubrics', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_rubrics (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(255) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_rubrics_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.review_criteria', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_criteria (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    rubric_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(255) NULL,
    max_score INT NOT NULL DEFAULT 5,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_review_criteria_rubric FOREIGN KEY (rubric_id) REFERENCES dbo.review_rubrics(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.review_assignments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_assignments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    reviewer_user_id UNIQUEIDENTIFIER NOT NULL,
    rubric_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'assigned',
    due_at DATETIME2 NULL,
    assigned_by UNIQUEIDENTIFIER NOT NULL,
    submitted_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_assignments_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_assignments_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_review_assignments_rubric FOREIGN KEY (rubric_id) REFERENCES dbo.review_rubrics(id),
    CONSTRAINT fk_review_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.review_results', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_results (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    criterion_id UNIQUEIDENTIFIER NULL,
    score DECIMAL(8,2) NULL,
    recommendation NVARCHAR(40) NULL,
    comments NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_results_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.review_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_results_criterion FOREIGN KEY (criterion_id) REFERENCES dbo.review_criteria(id)
  );
END;

IF OBJECT_ID('dbo.review_comments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_comments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    author_user_id UNIQUEIDENTIFIER NOT NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    visibility NVARCHAR(40) NOT NULL DEFAULT 'committee',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_comments_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.review_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_comments_user FOREIGN KEY (author_user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.review_decisions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_decisions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    decision NVARCHAR(40) NOT NULL,
    decision_notes NVARCHAR(MAX) NULL,
    decided_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_decisions_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_decisions_user FOREIGN KEY (decided_by) REFERENCES dbo.users(id)
  );
END;
