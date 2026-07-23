IF OBJECT_ID('dbo.email_templates', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.email_templates (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    template_key NVARCHAR(100) NOT NULL UNIQUE,
    subject NVARCHAR(255) NOT NULL,
    body NVARCHAR(MAX) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.email_logs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.email_logs (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    template_key NVARCHAR(100) NOT NULL,
    recipient_email NVARCHAR(255) NOT NULL,
    subject NVARCHAR(255) NOT NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'pending',
    error_message NVARCHAR(MAX) NULL,
    sent_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.notifications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.notifications (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NULL,
    recipient_email NVARCHAR(255) NULL,
    type NVARCHAR(100) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    read_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END;

DECLARE @templates TABLE (template_key NVARCHAR(100), subject NVARCHAR(255), body NVARCHAR(MAX));
INSERT INTO @templates (template_key, subject, body)
VALUES
  ('user_registered', 'Welcome to SysEvents', 'Hello {{name}}, your account has been created.'),
  ('registration_confirmed', 'Registration confirmed for {{eventName}}', 'Hello {{participantName}}, your registration is confirmed.'),
  ('payment_confirmed', 'Payment confirmed for {{eventName}}', 'Hello {{participantName}}, your payment has been confirmed.'),
  ('submission_received', 'Submission received: {{submissionTitle}}', 'We received your submission for {{eventName}}.'),
  ('review_assigned', 'Review assigned: {{submissionTitle}}', 'You have been assigned a submission to review.'),
  ('changes_requested', 'Changes requested: {{submissionTitle}}', 'Please review requested changes.'),
  ('submission_accepted', 'Submission accepted: {{submissionTitle}}', 'Congratulations, your submission was accepted.'),
  ('submission_rejected', 'Submission decision: {{submissionTitle}}', 'Your submission was not accepted.');

INSERT INTO dbo.email_templates (template_key, subject, body)
SELECT t.template_key, t.subject, t.body
FROM @templates t
WHERE NOT EXISTS (SELECT 1 FROM dbo.email_templates e WHERE e.template_key = t.template_key);
