/*
  Academic responsibilities are deliberately scoped to an event/program.
  The global roles created below only grant access to the academic workspace;
  every data operation is still authorized against the scoped tables.
*/

IF NOT EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'academic_workspace.access')
BEGIN
  INSERT INTO dbo.permissions (name, description)
  VALUES ('academic_workspace.access', 'Acceso al espacio académico; los datos se autorizan por evento y programa');
END;

DECLARE @academic_permission_id UNIQUEIDENTIFIER = (
  SELECT TOP 1 id FROM dbo.permissions WHERE name = 'academic_workspace.access'
);

DECLARE @academic_roles TABLE (role_name NVARCHAR(80), role_description NVARCHAR(255));
INSERT INTO @academic_roles (role_name, role_description)
VALUES
  ('event_supervisor', 'Supervisor con responsabilidades asignadas por evento y programa'),
  ('review_team_leader', 'Líder con responsabilidades asignadas por equipo'),
  ('event_evaluator', 'Evaluador con trabajos asignados durante un evento');

INSERT INTO dbo.roles (name, description, is_system)
SELECT source.role_name, source.role_description, 1
FROM @academic_roles source
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles role WHERE role.name = source.role_name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT role.id, @academic_permission_id
FROM dbo.roles role
INNER JOIN @academic_roles source ON source.role_name = role.name
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.role_permissions existing
  WHERE existing.role_id = role.id AND existing.permission_id = @academic_permission_id
);

/* Reviewer access is only a workspace gate; assignments still scope every record. */
INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT role.id, @academic_permission_id
FROM dbo.roles role
WHERE role.name IN ('academic_reviewer', 'program_leader')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = @academic_permission_id
  );

/* The former program_leader role carried event-wide data permissions. Remove those
   inherited grants so a team assignment can no longer become global administration. */
DELETE role_permission
FROM dbo.role_permissions role_permission
INNER JOIN dbo.roles role ON role.id = role_permission.role_id AND role.name = 'program_leader'
INNER JOIN dbo.permissions permission ON permission.id = role_permission.permission_id
WHERE permission.name IN ('events.read', 'submissions.read', 'reviews.assign', 'reviews.submit', 'reviews.decide');

IF OBJECT_ID('dbo.event_program_staff_assignments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_program_staff_assignments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    staff_role NVARCHAR(30) NOT NULL,
    assigned_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_program_staff_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_event_program_staff_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_event_program_staff_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_program_staff_assigned_by FOREIGN KEY (assigned_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_program_staff_role CHECK (staff_role IN ('supervisor', 'evaluator'))
  );

  CREATE UNIQUE INDEX ux_event_program_staff_scope
    ON dbo.event_program_staff_assignments(event_id, program_id, user_id, staff_role)
    WHERE is_active = 1;
  CREATE INDEX ix_event_program_staff_user
    ON dbo.event_program_staff_assignments(user_id, event_id, program_id, staff_role, is_active);
END;

IF OBJECT_ID('dbo.event_review_teams', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_review_teams (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(180) NOT NULL,
    leader_user_id UNIQUEIDENTIFIER NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_review_teams_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_event_review_teams_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_event_review_teams_leader FOREIGN KEY (leader_user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_review_teams_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );

  CREATE UNIQUE INDEX ux_event_review_team_name
    ON dbo.event_review_teams(event_id, program_id, name)
    WHERE is_active = 1;
  CREATE INDEX ix_event_review_team_leader
    ON dbo.event_review_teams(leader_user_id, event_id, program_id, is_active);
END;

IF OBJECT_ID('dbo.event_review_team_members', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_review_team_members (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    team_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    member_role NVARCHAR(30) NOT NULL DEFAULT 'reviewer',
    assigned_by UNIQUEIDENTIFIER NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_review_team_members_team FOREIGN KEY (team_id) REFERENCES dbo.event_review_teams(id),
    CONSTRAINT fk_event_review_team_members_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_review_team_members_assigned_by FOREIGN KEY (assigned_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_review_team_member_role CHECK (member_role = 'reviewer')
  );

  CREATE UNIQUE INDEX ux_event_review_team_member
    ON dbo.event_review_team_members(team_id, user_id)
    WHERE is_active = 1;
  CREATE INDEX ix_event_review_team_member_user
    ON dbo.event_review_team_members(user_id, team_id, is_active);
END;

/* Preserve existing one-team-per-program configuration as a default team. */
IF OBJECT_ID('dbo.event_program_review_team_members', 'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.event_review_teams (event_id, program_id, name, leader_user_id, created_by)
  SELECT legacy.event_id, legacy.program_id, 'Equipo principal', legacy.user_id, legacy.created_by
  FROM dbo.event_program_review_team_members legacy
  WHERE legacy.team_role = 'leader'
    AND NOT EXISTS (
      SELECT 1 FROM dbo.event_review_teams team
      WHERE team.event_id = legacy.event_id AND team.program_id = legacy.program_id AND team.is_active = 1
    );

  INSERT INTO dbo.event_review_team_members (team_id, user_id, member_role, assigned_by)
  SELECT team.id, legacy.user_id, 'reviewer', legacy.created_by
  FROM dbo.event_program_review_team_members legacy
  INNER JOIN dbo.event_review_teams team
    ON team.event_id = legacy.event_id AND team.program_id = legacy.program_id AND team.is_active = 1
  WHERE legacy.team_role = 'reviewer'
    AND NOT EXISTS (
      SELECT 1 FROM dbo.event_review_team_members member
      WHERE member.team_id = team.id AND member.user_id = legacy.user_id AND member.is_active = 1
    );
END;

/* Give migrated users only the entry role needed by the UI. Data access remains scoped. */
INSERT INTO dbo.user_roles (user_id, role_id)
SELECT DISTINCT team.leader_user_id, role.id
FROM dbo.event_review_teams team
INNER JOIN dbo.roles role ON role.name = 'review_team_leader'
WHERE team.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.user_roles existing
    WHERE existing.user_id = team.leader_user_id AND existing.role_id = role.id
  );

INSERT INTO dbo.user_roles (user_id, role_id)
SELECT DISTINCT member.user_id, role.id
FROM dbo.event_review_team_members member
INNER JOIN dbo.roles role ON role.name = 'academic_reviewer'
WHERE member.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.user_roles existing
    WHERE existing.user_id = member.user_id AND existing.role_id = role.id
  );

IF COL_LENGTH('dbo.review_assignments', 'review_team_id') IS NULL
BEGIN
  ALTER TABLE dbo.review_assignments ADD review_team_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'fk_review_assignments_review_team'
    AND parent_object_id = OBJECT_ID('dbo.review_assignments')
)
BEGIN
  EXEC sys.sp_executesql N'
    ALTER TABLE dbo.review_assignments
      ADD CONSTRAINT fk_review_assignments_review_team
      FOREIGN KEY (review_team_id) REFERENCES dbo.event_review_teams(id);
  ';
END;

IF OBJECT_ID('dbo.review_workflow_history', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.review_workflow_history (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(50) NOT NULL,
    from_status NVARCHAR(40) NULL,
    to_status NVARCHAR(40) NOT NULL,
    reason NVARCHAR(MAX) NULL,
    acted_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_review_workflow_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.review_assignments(id),
    CONSTRAINT fk_review_workflow_actor FOREIGN KEY (acted_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_review_workflow_action CHECK (
      action IN ('assigned', 'submitted_to_leader', 'returned_to_reviewer', 'forwarded_to_supervisor', 'reassigned', 'removed', 'reminder_sent', 'final_decision')
    )
  );
  CREATE INDEX ix_review_workflow_assignment ON dbo.review_workflow_history(assignment_id, created_at);
END;

/* Link legacy assignments to their migrated default team without changing their state. */
EXEC sys.sp_executesql N'
  UPDATE assignment
  SET review_team_id = team.id
  FROM dbo.review_assignments assignment
  INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
  INNER JOIN dbo.event_review_teams team
    ON team.event_id = submission.event_id
   AND team.program_id = submission.program_id
   AND team.is_active = 1
  WHERE assignment.review_team_id IS NULL;
';

IF OBJECT_ID('dbo.event_evaluation_forms', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_evaluation_forms (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NULL,
    name NVARCHAR(180) NOT NULL,
    definition_json NVARCHAR(MAX) NULL,
    printable_template_file_id UNIQUEIDENTIFIER NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'pending_format',
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_evaluation_forms_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_event_evaluation_forms_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_event_evaluation_forms_file FOREIGN KEY (printable_template_file_id) REFERENCES dbo.files(id),
    CONSTRAINT fk_event_evaluation_forms_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_evaluation_forms_status CHECK (status IN ('pending_format', 'draft', 'active', 'archived')),
    CONSTRAINT ck_event_evaluation_forms_json CHECK (definition_json IS NULL OR ISJSON(definition_json) = 1)
  );
END;

IF OBJECT_ID('dbo.event_evaluator_invitations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_evaluator_invitations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NULL,
    email NVARCHAR(255) NOT NULL,
    user_id UNIQUEIDENTIFIER NULL,
    token_hash NVARCHAR(128) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    accepted_at DATETIME2 NULL,
    revoked_at DATETIME2 NULL,
    invited_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_evaluator_invitation_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_event_evaluator_invitation_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_event_evaluator_invitation_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_evaluator_invitation_inviter FOREIGN KEY (invited_by) REFERENCES dbo.users(id)
  );
  CREATE UNIQUE INDEX ux_event_evaluator_invitation_token ON dbo.event_evaluator_invitations(token_hash);
  CREATE INDEX ix_event_evaluator_invitation_email ON dbo.event_evaluator_invitations(event_id, email, revoked_at);
END;

IF OBJECT_ID('dbo.event_evaluator_assignments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_evaluator_assignments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    event_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NULL,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    evaluator_user_id UNIQUEIDENTIFIER NOT NULL,
    evaluation_form_id UNIQUEIDENTIFIER NULL,
    assigned_by UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'pending',
    due_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_evaluator_assignment_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_event_evaluator_assignment_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_event_evaluator_assignment_submission FOREIGN KEY (submission_id) REFERENCES dbo.submissions(id),
    CONSTRAINT fk_event_evaluator_assignment_user FOREIGN KEY (evaluator_user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_evaluator_assignment_form FOREIGN KEY (evaluation_form_id) REFERENCES dbo.event_evaluation_forms(id),
    CONSTRAINT fk_event_evaluator_assignment_assigner FOREIGN KEY (assigned_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_event_evaluator_assignment_status CHECK (status IN ('pending', 'in_progress', 'submitted', 'cancelled'))
  );
  CREATE UNIQUE INDEX ux_event_evaluator_assignment
    ON dbo.event_evaluator_assignments(submission_id, evaluator_user_id)
    WHERE status <> 'cancelled';
  CREATE INDEX ix_event_evaluator_assignment_user
    ON dbo.event_evaluator_assignments(evaluator_user_id, status, event_id);
END;

IF OBJECT_ID('dbo.event_evaluations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_evaluations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    assignment_id UNIQUEIDENTIFIER NOT NULL,
    answers_json NVARCHAR(MAX) NOT NULL,
    comments NVARCHAR(MAX) NULL,
    submitted_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_event_evaluations_assignment FOREIGN KEY (assignment_id) REFERENCES dbo.event_evaluator_assignments(id),
    CONSTRAINT ux_event_evaluations_assignment UNIQUE (assignment_id),
    CONSTRAINT ck_event_evaluations_answers_json CHECK (ISJSON(answers_json) = 1)
  );
END;

IF OBJECT_ID('dbo.event_material_role_targets', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_material_role_targets (
    material_id UNIQUEIDENTIFIER NOT NULL,
    role_key NVARCHAR(40) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_material_role_targets PRIMARY KEY (material_id, role_key),
    CONSTRAINT fk_event_material_role_target_material FOREIGN KEY (material_id) REFERENCES dbo.event_materials(id) ON DELETE CASCADE,
    CONSTRAINT ck_event_material_role_target_key CHECK (
      role_key IN ('supervisor', 'leader', 'reviewer', 'evaluator', 'participant', 'speaker', 'keynote_speaker', 'advisor', 'team_member')
    )
  );
  CREATE INDEX ix_event_material_role_targets_role ON dbo.event_material_role_targets(role_key, material_id);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'review_returned')
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body, is_active)
  VALUES ('review_returned', 'Revisión devuelta para correcciones', 'La revisión de {{submissionTitle}} fue devuelta. Motivo: {{reason}}', 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'review_reminder')
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body, is_active)
  VALUES ('review_reminder', 'Recordatorio de revisión pendiente', 'Tienes pendiente la revisión de {{submissionTitle}}.', 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'evaluator_invitation')
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body, is_active)
  VALUES ('evaluator_invitation', 'Invitación para evaluar trabajos', 'Has sido invitado a evaluar trabajos del evento {{eventName}}. Acepta la invitación en {{invitationUrl}}', 1);
END;
