IF OBJECT_ID('dbo.password_reset_tokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.password_reset_tokens (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    used_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_password_reset_tokens_user
      FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  );

  CREATE INDEX ix_password_reset_tokens_user_id
    ON dbo.password_reset_tokens (user_id, expires_at);
END;

IF NOT EXISTS (
  SELECT 1 FROM dbo.email_templates WHERE template_key = 'password_reset'
)
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body)
  VALUES (
    'password_reset',
    'Recupera tu contrasena de SysEvents',
    'Hola {{name}},' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
    'Recibimos una solicitud para cambiar la contrasena de tu cuenta.' + CHAR(13) + CHAR(10) +
    'Abre el siguiente enlace para crear una nueva contrasena:' + CHAR(13) + CHAR(10) +
    '{{resetUrl}}' + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
    'El enlace vence en 30 minutos y solo puede utilizarse una vez.' + CHAR(13) + CHAR(10) +
    'Si no solicitaste este cambio, puedes ignorar este correo.'
  );
END;
