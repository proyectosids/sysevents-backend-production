DECLARE @constraintName SYSNAME;

SELECT TOP 1 @constraintName = key_constraints.name
FROM sys.key_constraints
INNER JOIN sys.index_columns
  ON index_columns.object_id = key_constraints.parent_object_id
  AND index_columns.index_id = key_constraints.unique_index_id
INNER JOIN sys.columns
  ON columns.object_id = index_columns.object_id
  AND columns.column_id = index_columns.column_id
WHERE key_constraints.parent_object_id = OBJECT_ID('dbo.payment_orders')
  AND key_constraints.[type] = 'UQ'
  AND columns.name = 'provider_order_id';

IF @constraintName IS NOT NULL
BEGIN
  DECLARE @dropConstraintSql NVARCHAR(MAX);
  SET @dropConstraintSql = N'ALTER TABLE dbo.payment_orders DROP CONSTRAINT ' + QUOTENAME(@constraintName);
  EXEC sp_executesql @dropConstraintSql;
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.payment_orders')
    AND name = 'ux_payment_orders_provider_order_id_not_null'
)
BEGIN
  CREATE UNIQUE INDEX ux_payment_orders_provider_order_id_not_null
    ON dbo.payment_orders(provider_order_id)
    WHERE provider_order_id IS NOT NULL;
END;
