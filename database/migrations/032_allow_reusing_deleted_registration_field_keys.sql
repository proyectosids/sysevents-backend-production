IF EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE name = 'uq_event_registration_form_fields_key'
    AND parent_object_id = OBJECT_ID('dbo.event_registration_form_fields')
)
BEGIN
  ALTER TABLE dbo.event_registration_form_fields
    DROP CONSTRAINT uq_event_registration_form_fields_key;
END;

IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'uq_event_registration_form_fields_key'
    AND object_id = OBJECT_ID('dbo.event_registration_form_fields')
)
BEGIN
  DROP INDEX uq_event_registration_form_fields_key
    ON dbo.event_registration_form_fields;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'uq_event_registration_form_fields_active_key'
    AND object_id = OBJECT_ID('dbo.event_registration_form_fields')
)
BEGIN
  CREATE UNIQUE INDEX uq_event_registration_form_fields_active_key
    ON dbo.event_registration_form_fields(form_id, field_key)
    WHERE deleted_at IS NULL;
END;
