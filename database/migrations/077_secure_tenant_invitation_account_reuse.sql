IF COL_LENGTH('dbo.tenant_invitations', 'event_id') IS NULL
BEGIN
  EXEC(N'ALTER TABLE dbo.tenant_invitations ADD event_id UNIQUEIDENTIFIER NULL;');
END;

IF COL_LENGTH('dbo.tenant_invitations', 'tenant_role') IS NULL
BEGIN
  EXEC(N'ALTER TABLE dbo.tenant_invitations ADD tenant_role NVARCHAR(30) NULL;');
END;

IF COL_LENGTH('dbo.tenant_invitations', 'academic_roles_json') IS NULL
BEGIN
  EXEC(N'ALTER TABLE dbo.tenant_invitations ADD academic_roles_json NVARCHAR(MAX) NULL;');
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_tenant_invitations_event'
    AND parent_object_id = OBJECT_ID('dbo.tenant_invitations')
)
BEGIN
  EXEC(N'ALTER TABLE dbo.tenant_invitations
    ADD CONSTRAINT fk_tenant_invitations_event
    FOREIGN KEY (event_id) REFERENCES dbo.events(id);');
END;

-- SQL Server compila todo el lote antes de ejecutar los ALTER TABLE. El DML se
-- compila de forma diferida para que las columnas recién creadas ya sean visibles.
EXEC sys.sp_executesql N'
  UPDATE invitation
  SET tenant_role = membership.tenant_role,
      academic_roles_json = COALESCE(roles.roles_json, ''[]''),
      event_id = current_event.id
  FROM dbo.tenant_invitations invitation
  INNER JOIN dbo.tenant_users membership
    ON membership.tenant_id = invitation.tenant_id
   AND membership.user_id = invitation.user_id
  OUTER APPLY (
    SELECT (
      SELECT profile.academic_role
      FROM dbo.tenant_user_academic_roles profile
      WHERE profile.tenant_id = invitation.tenant_id
        AND profile.user_id = invitation.user_id
      ORDER BY profile.academic_role
      FOR JSON PATH
    ) AS roles_json
  ) roles
  OUTER APPLY (
    SELECT TOP 1 event.id
    FROM dbo.events event
    WHERE event.tenant_id = invitation.tenant_id
      AND event.deleted_at IS NULL
      AND event.status IN (''published'', ''active'')
      AND (event.ends_at IS NULL OR event.ends_at >= SYSUTCDATETIME())
    ORDER BY
      CASE WHEN event.starts_at IS NULL THEN 1 ELSE 0 END,
      event.starts_at ASC,
      event.created_at DESC
  ) current_event
  WHERE invitation.tenant_role IS NULL
     OR invitation.academic_roles_json IS NULL
     OR invitation.event_id IS NULL;
';

UPDATE dbo.email_templates
SET subject = N'Invitación para colaborar en {{organizationName}}',
    body = N'Hola {{name}},

Has sido invitado a colaborar en {{organizationName}} dentro de SysEvents para {{eventName}}.

Usa el siguiente enlace para confirmar tu correo. Si ya tienes una cuenta, inicia sesión con ella. Si es tu primera vez en SysEvents, podrás completar tu registro:
{{invitationUrl}}

El enlace vence en {{expiresIn}}. Si no esperabas esta invitación, puedes ignorar este mensaje.'
WHERE template_key = 'tenant_invitation';
