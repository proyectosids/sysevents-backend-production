IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(120) NOT NULL,
    last_name NVARCHAR(120) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.roles (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    is_system BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.permissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.permissions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(150) NOT NULL UNIQUE,
    description NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.role_permissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.role_permissions (
    role_id UNIQUEIDENTIFIER NOT NULL,
    permission_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES dbo.permissions(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.user_roles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.user_roles (
    user_id UNIQUEIDENTIFIER NOT NULL,
    role_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.refresh_tokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.refresh_tokens (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    revoked_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'platform_admin')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('platform_admin', 'Full platform administrator', 1);
END;

DECLARE @permissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @permissions (name, description)
VALUES
  ('users.read', 'Read users'),
  ('users.update', 'Update users'),
  ('roles.read', 'Read roles'),
  ('roles.create', 'Create roles'),
  ('roles.update', 'Update roles'),
  ('roles.assign_permissions', 'Assign permissions to roles'),
  ('permissions.read', 'Read permissions'),
  ('permissions.create', 'Create permissions'),
  ('tenants.read', 'Read tenants'),
  ('tenants.create', 'Create tenants'),
  ('tenants.update', 'Update tenants'),
  ('tenants.manage_users', 'Manage tenant users');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @permissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
