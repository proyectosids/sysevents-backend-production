IF EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'tenant_owner')
AND EXISTS (SELECT 1 FROM dbo.permissions WHERE name = 'cms.manage')
BEGIN
  INSERT INTO dbo.role_permissions (role_id, permission_id)
  SELECT r.id, p.id
  FROM dbo.roles r
  CROSS JOIN dbo.permissions p
  WHERE r.name = 'tenant_owner'
    AND p.name = 'cms.manage'
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.role_permissions rp
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
    );
END;
