DECLARE @updated_sections INT = 0;
DECLARE @updated_themes INT = 0;

UPDATE dbo.event_page_sections
SET
  content_json = REPLACE(
    REPLACE(
      REPLACE(
        content_json,
        N'Julio 12 al 18, 2026',
        N'Marzo 02 al 06, 2027'
      ),
      N'Pueblo Nuevo, Chiapas',
      N'Chiapas, Mexico'
    ),
    N'Pueblo Nuevo, Chiapa',
    N'Chiapas, Mexico'
  ),
  updated_at = SYSUTCDATETIME()
WHERE deleted_at IS NULL
  AND (
    content_json LIKE N'%Julio 12 al 18, 2026%'
    OR content_json LIKE N'%Pueblo Nuevo, Chiapas%'
    OR content_json LIKE N'%Pueblo Nuevo, Chiapa%'
  );

SET @updated_sections = @@ROWCOUNT;

UPDATE dbo.site_themes
SET
  template_json = REPLACE(
    REPLACE(
      REPLACE(
        template_json,
        N'Julio 12 al 18, 2026',
        N'Marzo 02 al 06, 2027'
      ),
      N'Pueblo Nuevo, Chiapas',
      N'Chiapas, Mexico'
    ),
    N'Pueblo Nuevo, Chiapa',
    N'Chiapas, Mexico'
  ),
  updated_at = SYSUTCDATETIME()
WHERE
  template_json LIKE N'%Julio 12 al 18, 2026%'
  OR template_json LIKE N'%Pueblo Nuevo, Chiapas%'
  OR template_json LIKE N'%Pueblo Nuevo, Chiapa%';

SET @updated_themes = @@ROWCOUNT;

SELECT
  @updated_sections AS updated_sections,
  @updated_themes AS updated_themes;
