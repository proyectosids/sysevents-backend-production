IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'academic_reviewer')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('academic_reviewer', 'Academic reviewer with access to assigned reviews', 1);
END;

DECLARE @reviewerRoleId UNIQUEIDENTIFIER = (
  SELECT TOP 1 id FROM dbo.roles WHERE name = 'academic_reviewer'
);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT @reviewerRoleId, p.id
FROM dbo.permissions p
WHERE p.name IN ('reviews.submit')
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = @reviewerRoleId
      AND rp.permission_id = p.id
  );
