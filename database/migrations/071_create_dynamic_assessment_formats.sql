/* Dynamic, versioned formats shared by pre-acceptance reviews and event evaluations. */

IF OBJECT_ID('dbo.event_assessment_formats', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_assessment_formats (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(180) NOT NULL,
    purpose NVARCHAR(30) NOT NULL,
    instructions NVARCHAR(MAX) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_assessment_formats_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_event_assessment_formats_creator FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_assessment_formats_purpose CHECK (purpose IN ('review','evaluation')),
    CONSTRAINT ck_event_assessment_formats_status CHECK (status IN ('draft','published','archived'))
  );
  CREATE INDEX ix_event_assessment_formats_event ON dbo.event_assessment_formats(event_id, purpose, status);
END;

IF OBJECT_ID('dbo.event_assessment_format_scopes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_assessment_format_scopes (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    format_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NULL,
    submission_type_id UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_assessment_scope_format FOREIGN KEY (format_id) REFERENCES dbo.event_assessment_formats(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_assessment_scope_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_event_assessment_scope_submission_type FOREIGN KEY (submission_type_id) REFERENCES dbo.submission_types(id)
  );
  CREATE UNIQUE INDEX ux_event_assessment_format_scopes
    ON dbo.event_assessment_format_scopes(format_id, program_id, submission_type_id);
END;

IF OBJECT_ID('dbo.event_assessment_format_versions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_assessment_format_versions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    format_id UNIQUEIDENTIFIER NOT NULL,
    version_number INT NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'draft',
    definition_json NVARCHAR(MAX) NOT NULL DEFAULT '{"schemaVersion":1,"sections":[],"calculations":[],"outcomeRules":[]}',
    printable_template_file_id UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NOT NULL,
    published_by UNIQUEIDENTIFIER NULL,
    published_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_assessment_versions_format FOREIGN KEY (format_id) REFERENCES dbo.event_assessment_formats(id),
    CONSTRAINT fk_event_assessment_versions_file FOREIGN KEY (printable_template_file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_assessment_versions_creator FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_assessment_versions_publisher FOREIGN KEY (published_by) REFERENCES dbo.users(id),
    CONSTRAINT ux_event_assessment_versions_number UNIQUE (format_id, version_number),
    CONSTRAINT ck_event_assessment_versions_status CHECK (status IN ('draft','published','archived')),
    CONSTRAINT ck_event_assessment_versions_json CHECK (ISJSON(definition_json) = 1)
  );
  CREATE INDEX ix_event_assessment_versions_format ON dbo.event_assessment_format_versions(format_id, status, version_number DESC);
END;

IF COL_LENGTH('dbo.review_assignments', 'assessment_format_version_id') IS NULL
  ALTER TABLE dbo.review_assignments ADD assessment_format_version_id UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.event_evaluator_assignments', 'assessment_format_version_id') IS NULL
  ALTER TABLE dbo.event_evaluator_assignments ADD assessment_format_version_id UNIQUEIDENTIFIER NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_review_assignment_assessment_version')
  EXEC sys.sp_executesql N'ALTER TABLE dbo.review_assignments ADD CONSTRAINT fk_review_assignment_assessment_version FOREIGN KEY (assessment_format_version_id) REFERENCES dbo.event_assessment_format_versions(id);';
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_evaluator_assignment_assessment_version')
  EXEC sys.sp_executesql N'ALTER TABLE dbo.event_evaluator_assignments ADD CONSTRAINT fk_evaluator_assignment_assessment_version FOREIGN KEY (assessment_format_version_id) REFERENCES dbo.event_assessment_format_versions(id);';

IF OBJECT_ID('dbo.assessment_responses', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.assessment_responses (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    format_version_id UNIQUEIDENTIFIER NOT NULL,
    review_assignment_id UNIQUEIDENTIFIER NULL,
    evaluator_assignment_id UNIQUEIDENTIFIER NULL,
    respondent_user_id UNIQUEIDENTIFIER NOT NULL,
    answers_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    calculated_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    recommendation NVARCHAR(40) NULL,
    proposed_decision NVARCHAR(40) NULL,
    comments NVARCHAR(MAX) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'draft',
    submitted_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_assessment_response_version FOREIGN KEY (format_version_id) REFERENCES dbo.event_assessment_format_versions(id),
    CONSTRAINT fk_assessment_response_review FOREIGN KEY (review_assignment_id) REFERENCES dbo.review_assignments(id),
    CONSTRAINT fk_assessment_response_evaluation FOREIGN KEY (evaluator_assignment_id) REFERENCES dbo.event_evaluator_assignments(id),
    CONSTRAINT fk_assessment_response_user FOREIGN KEY (respondent_user_id) REFERENCES dbo.users(id),
    CONSTRAINT ck_assessment_response_assignment CHECK (
      (review_assignment_id IS NOT NULL AND evaluator_assignment_id IS NULL)
      OR (review_assignment_id IS NULL AND evaluator_assignment_id IS NOT NULL)
    ),
    CONSTRAINT ck_assessment_response_status CHECK (status IN ('draft','submitted')),
    CONSTRAINT ck_assessment_response_answers CHECK (ISJSON(answers_json) = 1),
    CONSTRAINT ck_assessment_response_calculated CHECK (ISJSON(calculated_json) = 1)
  );
  CREATE UNIQUE INDEX ux_assessment_response_review ON dbo.assessment_responses(review_assignment_id) WHERE review_assignment_id IS NOT NULL;
  CREATE UNIQUE INDEX ux_assessment_response_evaluation ON dbo.assessment_responses(evaluator_assignment_id) WHERE evaluator_assignment_id IS NOT NULL;
END;

IF OBJECT_ID('dbo.assessment_response_history', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.assessment_response_history (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    response_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(30) NOT NULL,
    snapshot_json NVARCHAR(MAX) NOT NULL,
    acted_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_assessment_history_response FOREIGN KEY (response_id) REFERENCES dbo.assessment_responses(id),
    CONSTRAINT fk_assessment_history_actor FOREIGN KEY (acted_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_assessment_history_action CHECK (action IN ('draft_saved','submitted','returned','corrected')),
    CONSTRAINT ck_assessment_history_json CHECK (ISJSON(snapshot_json) = 1)
  );
  CREATE INDEX ix_assessment_history_response ON dbo.assessment_response_history(response_id, created_at);
END;

/* Preserve any provisional evaluation formats created after migration 069. */
INSERT INTO dbo.event_assessment_formats (id, event_id, name, purpose, instructions, status, created_by, created_at, updated_at)
SELECT legacy.id, legacy.event_id, legacy.name, 'evaluation', NULL,
  CASE legacy.status WHEN 'active' THEN 'published' WHEN 'archived' THEN 'archived' ELSE 'draft' END,
  COALESCE(legacy.created_by, creator.user_id), legacy.created_at, legacy.updated_at
FROM dbo.event_evaluation_forms legacy
INNER JOIN dbo.events event ON event.id = legacy.event_id
OUTER APPLY (
  SELECT TOP 1 membership.user_id
  FROM dbo.tenant_users membership
  WHERE membership.tenant_id = event.tenant_id
  ORDER BY CASE WHEN membership.tenant_role = 'owner' THEN 0 WHEN membership.tenant_role = 'admin' THEN 1 ELSE 2 END, membership.created_at
) creator
WHERE NOT EXISTS (SELECT 1 FROM dbo.event_assessment_formats current_format WHERE current_format.id = legacy.id);

INSERT INTO dbo.event_assessment_format_scopes (format_id, program_id, submission_type_id)
SELECT legacy.id, legacy.program_id, NULL
FROM dbo.event_evaluation_forms legacy
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.event_assessment_format_scopes scope
  WHERE scope.format_id = legacy.id
    AND ((scope.program_id = legacy.program_id) OR (scope.program_id IS NULL AND legacy.program_id IS NULL))
    AND scope.submission_type_id IS NULL
);

INSERT INTO dbo.event_assessment_format_versions (
  format_id, version_number, status, definition_json, printable_template_file_id,
  created_by, published_by, published_at, created_at, updated_at
)
SELECT legacy.id, 1,
  CASE legacy.status WHEN 'active' THEN 'published' WHEN 'archived' THEN 'archived' ELSE 'draft' END,
  COALESCE(legacy.definition_json, '{"schemaVersion":1,"sections":[],"calculations":[],"outcomeRules":[]}'),
  legacy.printable_template_file_id, COALESCE(legacy.created_by, creator.user_id),
  CASE WHEN legacy.status = 'active' THEN COALESCE(legacy.created_by, creator.user_id) ELSE NULL END,
  CASE WHEN legacy.status = 'active' THEN legacy.updated_at ELSE NULL END,
  legacy.created_at, legacy.updated_at
FROM dbo.event_evaluation_forms legacy
INNER JOIN dbo.events event ON event.id = legacy.event_id
OUTER APPLY (
  SELECT TOP 1 membership.user_id
  FROM dbo.tenant_users membership
  WHERE membership.tenant_id = event.tenant_id
  ORDER BY CASE WHEN membership.tenant_role = 'owner' THEN 0 WHEN membership.tenant_role = 'admin' THEN 1 ELSE 2 END, membership.created_at
) creator
WHERE NOT EXISTS (SELECT 1 FROM dbo.event_assessment_format_versions version WHERE version.format_id = legacy.id);

EXEC sys.sp_executesql N'
  UPDATE assignment
  SET assessment_format_version_id = version.id
  FROM dbo.event_evaluator_assignments assignment
  INNER JOIN dbo.event_assessment_format_versions version
    ON version.format_id = assignment.evaluation_form_id AND version.version_number = 1
  WHERE assignment.assessment_format_version_id IS NULL;
';
