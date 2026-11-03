/* Complete the evaluator -> supervisor -> participant release workflow. */

IF COL_LENGTH('dbo.event_evaluator_assignments', 'reviewed_by') IS NULL
  ALTER TABLE dbo.event_evaluator_assignments ADD reviewed_by UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.event_evaluator_assignments', 'reviewed_at') IS NULL
  ALTER TABLE dbo.event_evaluator_assignments ADD reviewed_at DATETIME2 NULL;
IF COL_LENGTH('dbo.event_evaluator_assignments', 'supervisor_notes') IS NULL
  ALTER TABLE dbo.event_evaluator_assignments ADD supervisor_notes NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.event_evaluator_assignments', 'released_at') IS NULL
  ALTER TABLE dbo.event_evaluator_assignments ADD released_at DATETIME2 NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_evaluator_assignment_reviewer')
  EXEC sys.sp_executesql N'ALTER TABLE dbo.event_evaluator_assignments ADD CONSTRAINT fk_evaluator_assignment_reviewer FOREIGN KEY (reviewed_by) REFERENCES dbo.users(id);';

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_event_evaluator_assignment_status')
  ALTER TABLE dbo.event_evaluator_assignments DROP CONSTRAINT ck_event_evaluator_assignment_status;

ALTER TABLE dbo.event_evaluator_assignments ADD CONSTRAINT ck_event_evaluator_assignment_status
  CHECK (status IN ('pending','in_progress','submitted','returned_to_evaluator','released','cancelled'));

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'evaluation_returned')
  INSERT INTO dbo.email_templates (template_key, subject, body, is_active)
  VALUES ('evaluation_returned', 'Evaluación devuelta para corrección', 'La evaluación de {{submissionTitle}} fue devuelta. Motivo: {{reason}}', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'evaluation_released')
  INSERT INTO dbo.email_templates (template_key, subject, body, is_active)
  VALUES ('evaluation_released', 'Retroalimentación de evaluación disponible', 'La evaluación de {{submissionTitle}} fue revisada y ya está disponible en tu zona de descargas.', 1);
