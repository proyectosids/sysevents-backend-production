IF COL_LENGTH('dbo.event_settings', 'max_advisors_per_team') IS NULL
  ALTER TABLE dbo.event_settings ADD max_advisors_per_team INT NOT NULL CONSTRAINT df_event_settings_max_advisors DEFAULT 2;

IF COL_LENGTH('dbo.event_settings', 'max_team_members_per_team') IS NULL
  ALTER TABLE dbo.event_settings ADD max_team_members_per_team INT NOT NULL CONSTRAINT df_event_settings_max_team_members DEFAULT 2;

IF COL_LENGTH('dbo.event_settings', 'certificate_delay_minutes') IS NULL
  ALTER TABLE dbo.event_settings ADD certificate_delay_minutes INT NOT NULL CONSTRAINT df_event_settings_certificate_delay DEFAULT 60;

IF OBJECT_ID('dbo.event_registration_team_members', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_registration_team_members (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    registration_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(30) NOT NULL,
    full_name NVARCHAR(240) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_event_registration_team_members PRIMARY KEY (id),
    CONSTRAINT fk_event_registration_team_members_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id) ON DELETE CASCADE,
    CONSTRAINT ck_event_registration_team_members_role CHECK (role IN ('advisor','team_member')),
    CONSTRAINT uq_event_registration_team_member_email UNIQUE (registration_id, role, email)
  );
END;

IF COL_LENGTH('dbo.event_certificate_templates', 'agenda_item_id') IS NULL
  ALTER TABLE dbo.event_certificate_templates ADD agenda_item_id UNIQUEIDENTIFIER NULL;

IF COL_LENGTH('dbo.event_certificate_templates', 'auto_issue') IS NULL
  ALTER TABLE dbo.event_certificate_templates ADD auto_issue BIT NOT NULL CONSTRAINT df_event_certificate_templates_auto_issue DEFAULT 1;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_event_certificate_templates_agenda_item')
  ALTER TABLE dbo.event_certificate_templates ADD CONSTRAINT fk_event_certificate_templates_agenda_item FOREIGN KEY (agenda_item_id) REFERENCES dbo.event_agenda_items(id);

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_event_certificate_templates_target_role')
  ALTER TABLE dbo.event_certificate_templates DROP CONSTRAINT ck_event_certificate_templates_target_role;

ALTER TABLE dbo.event_certificate_templates ADD CONSTRAINT ck_event_certificate_templates_target_role
  CHECK (target_role IN ('participant','speaker','keynote_speaker','advisor','team_member'));

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_event_certificate_templates_recipient_source')
  ALTER TABLE dbo.event_certificate_templates DROP CONSTRAINT ck_event_certificate_templates_recipient_source;

UPDATE dbo.event_certificate_templates SET recipient_source = 'team_advisor' WHERE recipient_source = 'advisor_manual';

ALTER TABLE dbo.event_certificate_templates ADD CONSTRAINT ck_event_certificate_templates_recipient_source
  CHECK (recipient_source IN ('registration','speaker','team_advisor','team_member'));

IF COL_LENGTH('dbo.event_certificates', 'recipient_name') IS NULL
  ALTER TABLE dbo.event_certificates ADD recipient_name NVARCHAR(240) NULL;

IF COL_LENGTH('dbo.event_certificates', 'recipient_email') IS NULL
  ALTER TABLE dbo.event_certificates ADD recipient_email NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.event_certificates', 'recipient_role') IS NULL
  ALTER TABLE dbo.event_certificates ADD recipient_role NVARCHAR(40) NULL;

IF COL_LENGTH('dbo.event_certificates', 'available_at') IS NULL
  ALTER TABLE dbo.event_certificates ADD available_at DATETIME2 NULL;

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'uq_event_certificates_registration_template')
  ALTER TABLE dbo.event_certificates DROP CONSTRAINT uq_event_certificates_registration_template;

UPDATE certificate
SET recipient_name = COALESCE(certificate.recipient_name, CONCAT(profile.first_name, ' ', profile.last_name)),
    recipient_email = COALESCE(certificate.recipient_email, profile.email),
    recipient_role = COALESCE(certificate.recipient_role, template.target_role, 'participant'),
    available_at = COALESCE(certificate.available_at, certificate.issued_at)
FROM dbo.event_certificates certificate
INNER JOIN dbo.event_registrations registration ON registration.id = certificate.registration_id
INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
INNER JOIN dbo.event_certificate_templates template ON template.id = certificate.template_id;

ALTER TABLE dbo.event_certificates ALTER COLUMN recipient_email NVARCHAR(255) NOT NULL;
ALTER TABLE dbo.event_certificates ALTER COLUMN recipient_role NVARCHAR(40) NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_event_certificates_recipient' AND object_id = OBJECT_ID('dbo.event_certificates'))
  CREATE UNIQUE INDEX uq_event_certificates_recipient
    ON dbo.event_certificates(registration_id, template_id, recipient_role, recipient_email);
