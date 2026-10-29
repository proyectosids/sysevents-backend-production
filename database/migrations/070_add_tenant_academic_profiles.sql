/*
  Separates administrative tenant access from academic eligibility.
  Academic profiles are only defaults for candidate lists. Actual authority
  continues to come from event/program assignments created in migration 069.
*/

IF OBJECT_ID('dbo.tenant_user_academic_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_user_academic_roles (
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    academic_role NVARCHAR(30) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_tenant_user_academic_roles PRIMARY KEY (tenant_id, user_id, academic_role),
    CONSTRAINT fk_tenant_user_academic_roles_membership
      FOREIGN KEY (tenant_id, user_id) REFERENCES dbo.tenant_users(tenant_id, user_id) ON DELETE CASCADE,
    CONSTRAINT ck_tenant_user_academic_roles_role
      CHECK (academic_role IN ('supervisor', 'leader', 'reviewer', 'evaluator'))
  );

  CREATE INDEX ix_tenant_user_academic_roles_role
    ON dbo.tenant_user_academic_roles(tenant_id, academic_role, user_id);
END;

/* Preserve the former tenant-level Reviewer designation. */
INSERT INTO dbo.tenant_user_academic_roles (tenant_id, user_id, academic_role)
SELECT membership.tenant_id, membership.user_id, 'reviewer'
FROM dbo.tenant_users membership
WHERE membership.tenant_role = 'reviewer'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.tenant_user_academic_roles existing
    WHERE existing.tenant_id = membership.tenant_id
      AND existing.user_id = membership.user_id
      AND existing.academic_role = 'reviewer'
  );

/* Infer profiles from every active scoped assignment so existing teams remain selectable. */
INSERT INTO dbo.tenant_user_academic_roles (tenant_id, user_id, academic_role)
SELECT DISTINCT event.tenant_id, assignment.user_id, assignment.staff_role
FROM dbo.event_program_staff_assignments assignment
INNER JOIN dbo.events event ON event.id = assignment.event_id
INNER JOIN dbo.tenant_users membership
  ON membership.tenant_id = event.tenant_id AND membership.user_id = assignment.user_id
WHERE assignment.is_active = 1
  AND assignment.staff_role IN ('supervisor', 'evaluator')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.tenant_user_academic_roles existing
    WHERE existing.tenant_id = event.tenant_id
      AND existing.user_id = assignment.user_id
      AND existing.academic_role = assignment.staff_role
  );

INSERT INTO dbo.tenant_user_academic_roles (tenant_id, user_id, academic_role)
SELECT DISTINCT event.tenant_id, team.leader_user_id, 'leader'
FROM dbo.event_review_teams team
INNER JOIN dbo.events event ON event.id = team.event_id
INNER JOIN dbo.tenant_users membership
  ON membership.tenant_id = event.tenant_id AND membership.user_id = team.leader_user_id
WHERE team.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.tenant_user_academic_roles existing
    WHERE existing.tenant_id = event.tenant_id
      AND existing.user_id = team.leader_user_id
      AND existing.academic_role = 'leader'
  );

INSERT INTO dbo.tenant_user_academic_roles (tenant_id, user_id, academic_role)
SELECT DISTINCT event.tenant_id, member.user_id, 'reviewer'
FROM dbo.event_review_team_members member
INNER JOIN dbo.event_review_teams team ON team.id = member.team_id
INNER JOIN dbo.events event ON event.id = team.event_id
INNER JOIN dbo.tenant_users membership
  ON membership.tenant_id = event.tenant_id AND membership.user_id = member.user_id
WHERE member.is_active = 1 AND team.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.tenant_user_academic_roles existing
    WHERE existing.tenant_id = event.tenant_id
      AND existing.user_id = member.user_id
      AND existing.academic_role = 'reviewer'
  );
