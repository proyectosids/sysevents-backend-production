IF OBJECT_ID('dbo.saas_plans', 'U') IS NOT NULL
BEGIN
  DECLARE @defaultName NVARCHAR(128);

  SELECT @defaultName = dc.name
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
  WHERE dc.parent_object_id = OBJECT_ID('dbo.saas_plans')
    AND c.name = 'max_users';

  IF @defaultName IS NOT NULL
  BEGIN
    DECLARE @dropSql NVARCHAR(MAX) = N'ALTER TABLE dbo.saas_plans DROP CONSTRAINT ' + QUOTENAME(@defaultName);
    EXEC sp_executesql @dropSql;
  END;

  ALTER TABLE dbo.saas_plans
    ADD CONSTRAINT df_saas_plans_max_users DEFAULT 5 FOR max_users;

  UPDATE dbo.saas_plans
  SET max_users = 5,
      features_json = JSON_MODIFY(features_json, '$.users', 5),
      updated_at = SYSUTCDATETIME()
  WHERE code = 'basic-free'
    AND max_users < 5;
END;
