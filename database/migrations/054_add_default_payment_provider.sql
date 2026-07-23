IF COL_LENGTH('dbo.event_payment_provider_settings', 'is_default') IS NULL
BEGIN
  ALTER TABLE dbo.event_payment_provider_settings
  ADD is_default BIT NOT NULL CONSTRAINT df_event_payment_provider_settings_is_default DEFAULT 0;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'ux_event_payment_provider_settings_default'
    AND object_id = OBJECT_ID('dbo.event_payment_provider_settings')
)
BEGIN
  EXEC sp_executesql N'
    CREATE UNIQUE INDEX ux_event_payment_provider_settings_default
      ON dbo.event_payment_provider_settings(event_id)
      WHERE is_default = 1 AND deleted_at IS NULL;
  ';
END;
