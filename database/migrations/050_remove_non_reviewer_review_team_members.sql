IF OBJECT_ID('dbo.event_program_review_team_members', 'U') IS NOT NULL
BEGIN
  DELETE member
  FROM dbo.event_program_review_team_members member
  INNER JOIN dbo.events event ON event.id = member.event_id
  LEFT JOIN dbo.tenant_users tenant_user
    ON tenant_user.tenant_id = event.tenant_id
   AND tenant_user.user_id = member.user_id
  WHERE COALESCE(tenant_user.tenant_role, '') <> 'reviewer';
END;
