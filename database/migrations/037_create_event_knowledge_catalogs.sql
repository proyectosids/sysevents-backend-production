IF OBJECT_ID('dbo.event_knowledge_areas', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_knowledge_areas (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(180) NOT NULL,
    description NVARCHAR(MAX) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_knowledge_areas PRIMARY KEY (id),
    CONSTRAINT fk_event_knowledge_areas_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_knowledge_areas_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_knowledge_areas_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.event_knowledge_lines', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.event_knowledge_lines (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    event_id UNIQUEIDENTIFIER NOT NULL,
    area_id UNIQUEIDENTIFIER NULL,
    name NVARCHAR(220) NOT NULL,
    description NVARCHAR(MAX) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2 NULL,
    CONSTRAINT pk_event_knowledge_lines PRIMARY KEY (id),
    CONSTRAINT fk_event_knowledge_lines_event FOREIGN KEY (event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_knowledge_lines_area FOREIGN KEY (area_id) REFERENCES dbo.event_knowledge_areas(id),
    CONSTRAINT fk_event_knowledge_lines_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(id),
    CONSTRAINT fk_event_knowledge_lines_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.users(id)
  );
END;

IF COL_LENGTH('dbo.submissions', 'knowledge_area_id') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD knowledge_area_id UNIQUEIDENTIFIER NULL;
END;

IF COL_LENGTH('dbo.submissions', 'knowledge_line_id') IS NULL
BEGIN
  ALTER TABLE dbo.submissions ADD knowledge_line_id UNIQUEIDENTIFIER NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_submissions_knowledge_area')
BEGIN
  ALTER TABLE dbo.submissions
    ADD CONSTRAINT fk_submissions_knowledge_area FOREIGN KEY (knowledge_area_id) REFERENCES dbo.event_knowledge_areas(id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_submissions_knowledge_line')
BEGIN
  ALTER TABLE dbo.submissions
    ADD CONSTRAINT fk_submissions_knowledge_line FOREIGN KEY (knowledge_line_id) REFERENCES dbo.event_knowledge_lines(id);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_event_knowledge_areas_event'
    AND object_id = OBJECT_ID('dbo.event_knowledge_areas')
)
BEGIN
  CREATE INDEX ix_event_knowledge_areas_event
    ON dbo.event_knowledge_areas(event_id, is_active, sort_order);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'ix_event_knowledge_lines_event_area'
    AND object_id = OBJECT_ID('dbo.event_knowledge_lines')
)
BEGIN
  CREATE INDEX ix_event_knowledge_lines_event_area
    ON dbo.event_knowledge_lines(event_id, area_id, is_active, sort_order);
END;
