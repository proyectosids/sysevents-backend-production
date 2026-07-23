IF OBJECT_ID('dbo.event_program_review_team_members', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_program_review_team_members (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    program_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    team_role NVARCHAR(30) NOT NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_program_review_team_members PRIMARY KEY (id),
    CONSTRAINT fk_program_review_team_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_program_review_team_program FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id),
    CONSTRAINT fk_program_review_team_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT fk_program_review_team_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT ck_program_review_team_role CHECK (team_role IN ('leader', 'reviewer')),
    CONSTRAINT uq_program_review_team_user UNIQUE (program_id, user_id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'program_leader')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('program_leader', 'Academic program leader who manages review assignments and final decisions', 1);
END;

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM dbo.roles role
INNER JOIN dbo.permissions permission ON permission.name IN (
  'events.read', 'submissions.read', 'reviews.assign', 'reviews.submit', 'reviews.decide'
)
WHERE role.name = 'program_leader'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
  );

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'uq_program_review_team_leader'
    AND object_id = OBJECT_ID('dbo.event_program_review_team_members')
)
BEGIN
  CREATE UNIQUE INDEX uq_program_review_team_leader
    ON dbo.event_program_review_team_members(program_id)
    WHERE team_role = 'leader';
END;
