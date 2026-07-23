DECLARE @templatePermissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @templatePermissions (name, description)
VALUES
  ('site_templates.read', 'Read imported site templates'),
  ('site_templates.manage', 'Import and manage site templates');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @templatePermissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
INNER JOIN dbo.permissions p ON p.name IN ('site_templates.read', 'site_templates.manage')
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
