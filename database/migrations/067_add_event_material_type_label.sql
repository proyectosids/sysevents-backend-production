IF COL_LENGTH('dbo.event_materials', 'material_type_label') IS NULL
BEGIN
  ALTER TABLE dbo.event_materials ADD material_type_label NVARCHAR(120) NULL;
END;
