UPDATE sections
SET
  content_json = REPLACE(
    REPLACE(
      sections.content_json,
      N'Julio 12 al 18, 2026',
      N'Marzo 02 al 06, 2027'
    ),
    N'Pueblo Nuevo, Chiapas',
    N'Chiapas, Mexico'
  ),
  updated_at = SYSUTCDATETIME()
FROM dbo.event_page_sections AS sections
INNER JOIN dbo.events AS events
  ON events.id = sections.event_id
WHERE events.name = N'CIDIA 2026'
  AND sections.section_type = N'template_html_section'
  AND sections.deleted_at IS NULL
  AND (
    sections.content_json LIKE N'%Julio 12 al 18, 2026%'
    OR sections.content_json LIKE N'%Pueblo Nuevo, Chiapas%'
  );

UPDATE dbo.site_themes
SET
  template_json = REPLACE(
    REPLACE(
      template_json,
      N'Julio 12 al 18, 2026',
      N'Marzo 02 al 06, 2027'
    ),
    N'Pueblo Nuevo, Chiapas',
    N'Chiapas, Mexico'
  ),
  updated_at = SYSUTCDATETIME()
WHERE theme_key IN (
    N'imported-cidia-2026-e887522a',
    N'imported-cidia-5224b23e'
  )
  AND (
    template_json LIKE N'%Julio 12 al 18, 2026%'
    OR template_json LIKE N'%Pueblo Nuevo, Chiapas%'
  );
