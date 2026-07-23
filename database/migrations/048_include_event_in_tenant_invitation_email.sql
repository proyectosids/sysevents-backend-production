UPDATE dbo.email_templates
SET subject = 'Invitacion para colaborar en {{organizationName}}/{{eventName}}',
    body = 'Hola {{name}},

Has sido invitado a colaborar en {{organizationName}} dentro de SysEvents. evento {{eventName}}.

Usa el siguiente enlace para confirmar tu acceso y elegir tu propia contrasena:
{{invitationUrl}}

El enlace vence en {{expiresIn}}. Si no esperabas esta invitacion, puedes ignorar este mensaje.',
    updated_at = SYSUTCDATETIME()
WHERE template_key = 'tenant_invitation';
