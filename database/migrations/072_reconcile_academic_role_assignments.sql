/*
  Reconciles scoped academic assignments created by migrations 069/070.
  Profiles remain candidate metadata; workspace roles are derived only from
  active event/program assignments.
*/

/* Preserve the scoped reporting capability formerly granted to program_leader. */
INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM dbo.roles role
INNER JOIN dbo.permissions permission ON permission.name = 'reports.read'
WHERE role.name = 'review_team_leader'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions existing
    WHERE existing.role_id = role.id AND existing.permission_id = permission.id
  );

/* program_leader is superseded by the scoped review_team_leader role. */
DELETE user_role
FROM dbo.user_roles user_role
INNER JOIN dbo.roles role ON role.id = user_role.role_id
WHERE role.name = 'program_leader';

/* Keep only the most recently updated active supervisor for each exact scope. */
;WITH ranked_supervisors AS (
  SELECT assignment.id,
    ROW_NUMBER() OVER (
      PARTITION BY assignment.event_id, assignment.program_id
      ORDER BY assignment.updated_at DESC, assignment.created_at DESC, assignment.id DESC
    ) AS position
  FROM dbo.event_program_staff_assignments assignment
  WHERE assignment.staff_role = 'supervisor' AND assignment.is_active = 1
)
UPDATE assignment
SET is_active = 0, updated_at = SYSUTCDATETIME()
FROM dbo.event_program_staff_assignments assignment
INNER JOIN ranked_supervisors ranked ON ranked.id = assignment.id
WHERE ranked.position > 1;

/* Supervisors, leaders and reviewers must still belong to the event tenant. */
UPDATE assignment
SET is_active = 0, updated_at = SYSUTCDATETIME()
FROM dbo.event_program_staff_assignments assignment
INNER JOIN dbo.events event ON event.id = assignment.event_id
WHERE assignment.staff_role = 'supervisor' AND assignment.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.tenant_users membership
    WHERE membership.tenant_id = event.tenant_id AND membership.user_id = assignment.user_id
  );

UPDATE team
SET is_active = 0, updated_at = SYSUTCDATETIME()
FROM dbo.event_review_teams team
INNER JOIN dbo.events event ON event.id = team.event_id
WHERE team.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.tenant_users membership
    WHERE membership.tenant_id = event.tenant_id AND membership.user_id = team.leader_user_id
  );

UPDATE member
SET is_active = 0, updated_at = SYSUTCDATETIME()
FROM dbo.event_review_team_members member
INNER JOIN dbo.event_review_teams team ON team.id = member.team_id
INNER JOIN dbo.events event ON event.id = team.event_id
WHERE member.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.tenant_users membership
    WHERE membership.tenant_id = event.tenant_id AND membership.user_id = member.user_id
  );

/* Remove stale workspace gates. */
DELETE user_role
FROM dbo.user_roles user_role
INNER JOIN dbo.roles role ON role.id = user_role.role_id
WHERE role.name IN ('event_supervisor', 'review_team_leader', 'academic_reviewer', 'event_evaluator')
  AND NOT (
    (role.name = 'event_supervisor' AND EXISTS (
      SELECT 1 FROM dbo.event_program_staff_assignments assignment
      WHERE assignment.user_id = user_role.user_id AND assignment.staff_role = 'supervisor' AND assignment.is_active = 1
    ))
    OR (role.name = 'event_evaluator' AND EXISTS (
      SELECT 1 FROM dbo.event_program_staff_assignments assignment
      WHERE assignment.user_id = user_role.user_id AND assignment.staff_role = 'evaluator' AND assignment.is_active = 1
    ))
    OR (role.name = 'review_team_leader' AND EXISTS (
      SELECT 1 FROM dbo.event_review_teams team
      WHERE team.leader_user_id = user_role.user_id AND team.is_active = 1
    ))
    OR (role.name = 'academic_reviewer' AND EXISTS (
      SELECT 1 FROM dbo.event_review_team_members member
      INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
      WHERE member.user_id = user_role.user_id AND member.is_active = 1
    ))
  );

/* Restore every workspace gate backed by an active scoped assignment. */
INSERT INTO dbo.user_roles (user_id, role_id)
SELECT scoped.user_id, role.id
FROM (
  SELECT assignment.user_id, 'event_supervisor' AS role_name
  FROM dbo.event_program_staff_assignments assignment
  WHERE assignment.staff_role = 'supervisor' AND assignment.is_active = 1
  UNION
  SELECT assignment.user_id, 'event_evaluator'
  FROM dbo.event_program_staff_assignments assignment
  WHERE assignment.staff_role = 'evaluator' AND assignment.is_active = 1
  UNION
  SELECT team.leader_user_id, 'review_team_leader'
  FROM dbo.event_review_teams team
  WHERE team.is_active = 1
  UNION
  SELECT member.user_id, 'academic_reviewer'
  FROM dbo.event_review_team_members member
  INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
  WHERE member.is_active = 1
) scoped
INNER JOIN dbo.roles role ON role.name = scoped.role_name
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.user_roles existing
  WHERE existing.user_id = scoped.user_id AND existing.role_id = role.id
);
