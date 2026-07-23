DECLARE @sql NVARCHAR(MAX);

SELECT @sql = N'ALTER TABLE dbo.event_settings DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_settings')
  AND c.name = 'default_currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_settings ADD CONSTRAINT df_event_settings_default_currency DEFAULT 'MXN' FOR default_currency;

SET @sql = NULL;
SELECT @sql = N'ALTER TABLE dbo.event_registration_types DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_registration_types')
  AND c.name = 'currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_registration_types ADD CONSTRAINT df_event_registration_types_currency DEFAULT 'MXN' FOR currency;

SET @sql = NULL;
SELECT @sql = N'ALTER TABLE dbo.event_registration_addons DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_registration_addons')
  AND c.name = 'currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_registration_addons ADD CONSTRAINT df_event_registration_addons_currency DEFAULT 'MXN' FOR currency;

SET @sql = NULL;
SELECT @sql = N'ALTER TABLE dbo.event_registrations DROP CONSTRAINT ' + QUOTENAME(dc.name)
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.event_registrations')
  AND c.name = 'currency';
IF @sql IS NOT NULL EXEC sp_executesql @sql;
ALTER TABLE dbo.event_registrations ADD CONSTRAINT df_event_registrations_currency DEFAULT 'MXN' FOR currency;

UPDATE dbo.event_settings
SET default_currency = 'MXN'
WHERE default_currency = 'USD';

UPDATE dbo.event_registration_types
SET currency = 'MXN'
WHERE currency = 'USD';

UPDATE dbo.event_registration_addons
SET currency = 'MXN'
WHERE currency = 'USD';

UPDATE registration
SET currency = 'MXN'
FROM dbo.event_registrations registration
WHERE registration.currency = 'USD'
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.payment_orders payment_order
    WHERE payment_order.registration_id = registration.id
      AND payment_order.status = 'paid'
  );
