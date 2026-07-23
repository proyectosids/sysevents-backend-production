IF COL_LENGTH('dbo.event_registrations', 'knowledge_area_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registrations ADD knowledge_area_id UNIQUEIDENTIFIER NULL;
  ALTER TABLE dbo.event_registrations ADD CONSTRAINT fk_event_registrations_knowledge_area
    FOREIGN KEY (knowledge_area_id) REFERENCES dbo.event_knowledge_areas(id);
END;

IF COL_LENGTH('dbo.event_registrations', 'knowledge_line_id') IS NULL
BEGIN
  ALTER TABLE dbo.event_registrations ADD knowledge_line_id UNIQUEIDENTIFIER NULL;
  ALTER TABLE dbo.event_registrations ADD CONSTRAINT fk_event_registrations_knowledge_line
    FOREIGN KEY (knowledge_line_id) REFERENCES dbo.event_knowledge_lines(id);
END;
