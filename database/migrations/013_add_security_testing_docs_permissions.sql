DECLARE @permissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @permissions (name, description)
VALUES
  ('files.read', 'Read files'),
  ('files.upload', 'Upload files'),
  ('files.delete', 'Delete files'),
  ('submissions.read', 'Read submissions'),
  ('submissions.create', 'Create submissions'),
  ('submissions.update', 'Update submissions'),
  ('submissions.submit', 'Submit submissions'),
  ('submissions.manage', 'Manage submissions'),
  ('reviews.read', 'Read reviews'),
  ('reviews.assign', 'Assign reviewers'),
  ('reviews.submit', 'Submit reviews'),
  ('reviews.decide', 'Issue final review decisions'),
  ('email_templates.read', 'Read email templates'),
  ('email_templates.update', 'Update email templates'),
  ('email_logs.read', 'Read email logs'),
  ('reports.read', 'Read reports');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @permissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name = 'platform_admin'
  AND p.name IN (SELECT name FROM @permissions)
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
