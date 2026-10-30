/*
  Public website visibility and mandatory participant downloads are separate
  concerns. Existing program-specific materials preserve their former behavior;
  general public website materials stop blocking registration.
*/

IF COL_LENGTH('dbo.event_materials', 'is_required_for_registration') IS NULL
BEGIN
  ALTER TABLE dbo.event_materials
    ADD is_required_for_registration BIT NOT NULL
      CONSTRAINT df_event_materials_required_registration DEFAULT 0;
END;

/* Compile this statement only after SQL Server has created the new column. */
EXEC sys.sp_executesql N'
  UPDATE dbo.event_materials
  SET is_required_for_registration = 1
  WHERE program_id IS NOT NULL
    AND is_active = 1
    AND is_required_for_registration = 0;
';
