IF OBJECT_ID('dbo.saas_plans', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.saas_plans (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    code NVARCHAR(80) NOT NULL UNIQUE,
    name NVARCHAR(140) NOT NULL,
    description NVARCHAR(500) NULL,
    price_cents INT NOT NULL DEFAULT 0,
    currency NVARCHAR(3) NOT NULL DEFAULT 'MXN',
    billing_interval NVARCHAR(30) NOT NULL DEFAULT 'one_time',
    max_events INT NOT NULL DEFAULT 1,
    max_users INT NOT NULL DEFAULT 3,
    max_storage_mb INT NOT NULL DEFAULT 500,
    features_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.tenant_subscriptions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_subscriptions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    plan_id UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'active',
    starts_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ends_at DATETIME2 NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_tenant_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES dbo.saas_plans(id),
    CONSTRAINT fk_tenant_subscriptions_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.saas_plans WHERE code = 'basic-free')
BEGIN
  INSERT INTO dbo.saas_plans (
    code, name, description, price_cents, currency, billing_interval,
    max_events, max_users, max_storage_mb, features_json, sort_order
  )
  VALUES (
    'basic-free',
    'Básico',
    'Plan inicial para administrar un evento académico completo.',
    0,
    'MXN',
    'one_time',
    1,
    5,
    500,
    '{"events":1,"users":5,"cms":true,"registrations":true,"submissions":true,"reviews":true,"payments":true}',
    1
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'tenant_owner')
BEGIN
  INSERT INTO dbo.roles (name, description, is_system)
  VALUES ('tenant_owner', 'Organization owner with tenant administration capabilities', 1);
END;

DECLARE @saasPermissions TABLE (name NVARCHAR(150), description NVARCHAR(255));

INSERT INTO @saasPermissions (name, description)
VALUES
  ('plans.read', 'Read available SaaS plans'),
  ('subscriptions.read', 'Read tenant subscriptions'),
  ('subscriptions.manage', 'Manage tenant subscriptions');

INSERT INTO dbo.permissions (name, description)
SELECT p.name, p.description
FROM @saasPermissions p
WHERE NOT EXISTS (SELECT 1 FROM dbo.permissions existing WHERE existing.name = p.name);

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.name = 'platform_admin'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
INNER JOIN dbo.permissions p ON p.name IN (
  'tenants.read',
  'tenants.update',
  'tenants.manage_users',
  'events.read',
  'events.create',
  'events.update',
  'events.delete',
  'events.publish',
  'cms.read',
  'cms.create',
  'cms.update',
  'cms.delete',
  'registrations.read',
  'registrations.manage',
  'payments.read',
  'submissions.read',
  'submissions.create',
  'submissions.update',
  'submissions.submit',
  'submissions.manage',
  'reviews.read',
  'reviews.assign',
  'reviews.submit',
  'reviews.decide',
  'files.read',
  'files.upload',
  'files.delete',
  'email_templates.read',
  'email_templates.update',
  'email_logs.read',
  'reports.read',
  'plans.read',
  'subscriptions.read'
)
WHERE r.name = 'tenant_owner'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
