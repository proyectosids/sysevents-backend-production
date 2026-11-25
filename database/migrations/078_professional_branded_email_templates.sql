DECLARE @templates TABLE (
  template_key NVARCHAR(100) NOT NULL,
  subject NVARCHAR(255) NOT NULL,
  body NVARCHAR(MAX) NOT NULL
);

INSERT INTO @templates (template_key, subject, body)
VALUES
  ('user_registered', N'Bienvenido a SysEvents', N'Hola {{name}},

Tu cuenta fue creada correctamente. A partir de ahora podrás consultar y atender las actividades académicas que te sean asignadas dentro de SysEvents.

Te recomendamos mantener actualizados tus datos de perfil y proteger tus credenciales de acceso.'),
  ('registration_confirmed', N'Inscripción confirmada para {{eventName}}', N'Hola {{participantName}},

Tu inscripción al evento {{eventName}} quedó confirmada correctamente.

Conserva este mensaje como referencia y consulta periódicamente SysEvents para conocer avisos, materiales y actividades relacionados con tu participación.'),
  ('payment_confirmed', N'Pago confirmado para {{eventName}}', N'Hola {{participantName}},

Registramos y confirmamos correctamente tu pago correspondiente al evento {{eventName}}.

Puedes consultar el estado de tu participación y los comprobantes disponibles desde tu cuenta de SysEvents.'),
  ('submission_received', N'Trabajo recibido: {{submissionTitle}}', N'Hemos recibido correctamente el trabajo “{{submissionTitle}}” para el evento {{eventName}}.

El envío quedó registrado y continuará con el proceso académico correspondiente. Consulta SysEvents para dar seguimiento a su estado y atender oportunamente cualquier observación.'),
  ('review_assigned', N'Nueva revisión asignada: {{submissionTitle}}', N'Se te asignó el trabajo “{{submissionTitle}}” para revisión académica.

Ingresa a tu mesa de trabajo, consulta los archivos y criterios de evaluación, registra observaciones sustentadas y envía tu dictamen dentro del plazo establecido.

Tu participación oportuna es indispensable para mantener el avance del proceso académico.'),
  ('review_completed', N'Dictamen listo para verificar: {{submissionTitle}}', N'El revisor terminó y envió su recomendación para el trabajo “{{submissionTitle}}”.

La revisión ya está disponible para tu verificación. Comprueba que las observaciones y la recomendación sean consistentes y continúa el flujo hacia la resolución correspondiente.'),
  ('review_returned', N'Correcciones requeridas en la revisión: {{submissionTitle}}', N'La revisión del trabajo “{{submissionTitle}}” fue devuelta para correcciones.

Motivo indicado:
{{reason}}

Revisa cuidadosamente las observaciones, corrige el dictamen y vuelve a enviarlo para que el proceso pueda continuar.'),
  ('review_reminder', N'Acción pendiente: dictaminar {{submissionTitle}}', N'Tienes pendiente la revisión académica del trabajo “{{submissionTitle}}”.

Es necesario ingresar a SysEvents, revisar los materiales asignados y emitir tu dictamen. Atender esta actividad a la brevedad ayuda a evitar la acumulación de pendientes y retrasos para participantes y equipos académicos.'),
  ('changes_requested', N'Cambios solicitados: {{submissionTitle}}', N'El trabajo “{{submissionTitle}}” requiere cambios antes de continuar con el proceso académico.

Consulta la resolución y las observaciones disponibles en SysEvents, realiza los ajustes solicitados y presenta la nueva versión dentro del periodo indicado.'),
  ('submission_accepted', N'Trabajo aceptado: {{submissionTitle}}', N'Nos complace informarte que el trabajo “{{submissionTitle}}” fue aceptado.

Consulta la resolución y los siguientes pasos en SysEvents. Mantente atento a las indicaciones relacionadas con materiales, presentación o participación en el evento.'),
  ('submission_rejected', N'Resolución del trabajo: {{submissionTitle}}', N'El proceso de evaluación del trabajo “{{submissionTitle}}” concluyó y, de acuerdo con el dictamen académico, no fue aceptado.

Puedes consultar la resolución y las observaciones disponibles en SysEvents.'),
  ('tenant_invitation', N'Invitación para colaborar en {{organizationName}}', N'Hola {{name}},

Has sido invitado a colaborar en {{organizationName}} dentro de SysEvents para el evento {{eventName}}.

Confirma tu invitación con el correo al que recibiste este mensaje. Si ya tienes una cuenta, podrás iniciar sesión con ella; si es tu primera vez, podrás completar tu registro.

Por seguridad, este enlace vence en {{expiresIn}}.'),
  ('evaluator_invitation', N'Invitación para colaborar como evaluador en {{eventName}}', N'Has sido invitado a participar como evaluador académico en el evento {{eventName}}.

Confirma la invitación para vincular tu cuenta y acceder a las actividades que te sean asignadas. Si ya utilizas SysEvents, conserva tu misma cuenta y tus participaciones existentes.

Por seguridad, la invitación tiene una vigencia limitada.'),
  ('evaluation_returned', N'Ajustes requeridos en la evaluación: {{submissionTitle}}', N'La evaluación del trabajo “{{submissionTitle}}” fue devuelta para ajustes.

Observaciones del supervisor:
{{reason}}

Atiende los puntos señalados y vuelve a enviar la evaluación para que pueda verificarse y liberarse al participante.'),
  ('evaluation_released', N'Evaluación disponible: {{submissionTitle}}', N'La evaluación del trabajo “{{submissionTitle}}” fue revisada y liberada.

Ya puedes consultar la retroalimentación académica disponible desde tu cuenta de SysEvents.'),
  ('password_reset', N'Restablece tu contraseña de SysEvents', N'Hola {{name}},

Recibimos una solicitud para restablecer la contraseña de tu cuenta de SysEvents.

Utiliza el botón de este mensaje para crear una nueva contraseña. El enlace vence en 30 minutos y sólo puede utilizarse una vez.

Si no realizaste esta solicitud, ignora el mensaje; tu contraseña actual continuará funcionando.');

UPDATE destination
SET destination.subject = source.subject,
    destination.body = source.body,
    destination.updated_at = SYSUTCDATETIME()
FROM dbo.email_templates destination
INNER JOIN @templates source ON source.template_key = destination.template_key;

INSERT INTO dbo.email_templates (template_key, subject, body, is_active)
SELECT source.template_key, source.subject, source.body, 1
FROM @templates source
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.email_templates destination WHERE destination.template_key = source.template_key
);
