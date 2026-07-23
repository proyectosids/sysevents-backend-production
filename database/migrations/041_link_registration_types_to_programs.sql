IF COL_LENGTH('dbo.event_registration_types', 'program_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registration_types ADD program_id UNIQUEIDENTIFIER NULL;
  ALTER TABLE dbo.event_registration_types ADD CONSTRAINT fk_registration_types_program
    FOREIGN KEY (program_id) REFERENCES dbo.event_programs(id);
END;

EXEC(N'
  UPDATE registration_type
  SET program_id = matched.program_id
  FROM dbo.event_registration_types registration_type
  CROSS APPLY (
    SELECT TOP 1 program.id AS program_id
    FROM dbo.event_programs program
    WHERE program.event_id = registration_type.event_id
      AND LOWER(registration_type.name) LIKE ''%'' + LOWER(LEFT(program.name, CHARINDEX('' '', program.name + '' '') - 1)) + ''%''
      AND program.deleted_at IS NULL
    ORDER BY LEN(program.name) DESC
  ) matched
  WHERE registration_type.program_id IS NULL;

  UPDATE registration
  SET program_id = registration_type.program_id
  FROM dbo.event_registrations registration
  INNER JOIN dbo.event_registration_types registration_type ON registration_type.id = registration.registration_type_id
  WHERE registration.program_id IS NULL AND registration_type.program_id IS NOT NULL;
');
