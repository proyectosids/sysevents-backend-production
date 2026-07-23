IF COL_LENGTH('dbo.event_registration_addons', 'registration_type_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registration_addons
    ADD registration_type_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'fk_event_registration_addons_type'
)
BEGIN
  ALTER TABLE dbo.event_registration_addons
    ADD CONSTRAINT fk_event_registration_addons_type
    FOREIGN KEY (registration_type_id) REFERENCES dbo.event_registration_types(id);
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ix_event_registration_addons_type'
    AND object_id = OBJECT_ID('dbo.event_registration_addons')
)
BEGIN
  CREATE INDEX ix_event_registration_addons_type
    ON dbo.event_registration_addons(event_id, registration_type_id, is_active, sort_order);
END;
