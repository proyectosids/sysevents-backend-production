IF NOT EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'plans.manage')
BEGIN
  INSERT INTO dbo.permissions (name, description)
  VALUES ('plans.manage', 'Create and update SaaS plans');
END;

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
INNER JOIN dbo.permissions p ON p.name IN (
  'plans.read',
  'plans.manage',
  'subscriptions.read',
  'subscriptions.manage'
)
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
