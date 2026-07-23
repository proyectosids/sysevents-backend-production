IF EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'ck_event_payment_provider_settings_provider'
    AND parent_object_id = OBJECT_ID('dbo.event_payment_provider_settings')
)
BEGIN
  ALTER TABLE dbo.event_payment_provider_settings
  DROP CONSTRAINT ck_event_payment_provider_settings_provider;
END;

ALTER TABLE dbo.event_payment_provider_settings
ADD CONSTRAINT ck_event_payment_provider_settings_provider
CHECK (provider IN ('stripe','mercadopago','openpay'));

IF NOT EXISTS (SELECT 1 FROM dbo.payment_providers WHERE name = 'openpay')
BEGIN
  INSERT INTO dbo.payment_providers (name, is_active)
  VALUES ('openpay', 1);
END
ELSE
BEGIN
  UPDATE dbo.payment_providers
  SET is_active = 1
  WHERE name = 'openpay';
END;
