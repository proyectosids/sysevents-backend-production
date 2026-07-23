DECLARE @platformAdminRoleId UNIQUEIDENTIFIER = (
  SELECT TOP 1 id FROM dbo.roles WHERE name = 'platform_admin'
);

IF @platformAdminRoleId IS NOT NULL
BEGIN
  DELETE rp
  FROM dbo.role_permissions rp
  INNER JOIN dbo.permissions p ON p.id = rp.permission_id
  WHERE rp.role_id = @platformAdminRoleId
    AND p.name NOT IN (
      'plans.read',
      'plans.manage',
      'subscriptions.read',
      'subscriptions.manage',
      'tenants.read',
      'users.read'
    );
END;
