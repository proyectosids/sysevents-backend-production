IF OBJECT_ID('dbo.tenant_invitations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenant_invitations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    accepted_at DATETIME2 NULL,
    revoked_at DATETIME2 NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    last_sent_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_tenant_invitations_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_invitations_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_invitations_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id)
  );

  CREATE INDEX ix_tenant_invitations_membership
    ON dbo.tenant_invitations (tenant_id, user_id, created_at DESC);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'tenant_invitation')
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body)
  VALUES (
    'tenant_invitation',
    'Invitacion para colaborar en {{organizationName}}',
    'Hola {{name}},

Has sido invitado a colaborar en {{organizationName}} dentro de SysEvents.

Usa el siguiente enlace para confirmar tu acceso y elegir tu propia contrasena:
{{invitationUrl}}

El enlace vence en {{expiresIn}}. Si no esperabas esta invitacion, puedes ignorar este mensaje.'
  );
END;
