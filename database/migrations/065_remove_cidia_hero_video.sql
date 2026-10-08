SET NOCOUNT ON;

DECLARE @video_wrapper_start NVARCHAR(100) = N'<div class=\"video-wrap\">';
DECLARE @video_end NVARCHAR(20) = N'</video>';
DECLARE @wrapper_end NVARCHAR(20) = N'</div>';
DECLARE @updated_sections INT = 0;
DECLARE @updated_themes INT = 0;
DECLARE @batch_count INT = 1;

-- The imported Cidia hero still contains the template's muted autoplay video.
-- Remove the complete wrapper from already-created event pages.  Working on
-- the serialized JSON is intentional: these markers occur inside the encoded
-- HTML string, so removing the range keeps the surrounding JSON valid.
WHILE @batch_count > 0
BEGIN
  UPDATE sections
  SET
    content_json = STUFF(
      sections.content_json,
      positions.wrapper_start,
      positions.wrapper_end + LEN(@wrapper_end) - positions.wrapper_start,
      N''
    ),
    updated_at = SYSUTCDATETIME()
  FROM dbo.event_page_sections AS sections
  CROSS APPLY (
    SELECT CHARINDEX(@video_wrapper_start, sections.content_json) AS wrapper_start
  ) AS wrapper
  CROSS APPLY (
    SELECT CHARINDEX(@video_end, sections.content_json, wrapper.wrapper_start) AS video_end
  ) AS video
  CROSS APPLY (
    SELECT
      wrapper.wrapper_start,
      CHARINDEX(@wrapper_end, sections.content_json, video.video_end + LEN(@video_end)) AS wrapper_end
  ) AS positions
  WHERE sections.section_type = N'template_html_section'
    AND sections.deleted_at IS NULL
    AND sections.content_json LIKE N'%pexels-pavel-danilyuk-8716790.mp4%'
    AND positions.wrapper_start > 0
    AND video.video_end > positions.wrapper_start
    AND positions.wrapper_end > video.video_end;

  SET @batch_count = @@ROWCOUNT;
  SET @updated_sections += @batch_count;
END;

SET @batch_count = 1;

-- A theme stores the same imported hero in pages, structuralSections and the
-- section lookup.  Repeat until every serialized copy has been removed.
WHILE @batch_count > 0
BEGIN
  UPDATE themes
  SET
    template_json = STUFF(
      themes.template_json,
      positions.wrapper_start,
      positions.wrapper_end + LEN(@wrapper_end) - positions.wrapper_start,
      N''
    ),
    updated_at = SYSUTCDATETIME()
  FROM dbo.site_themes AS themes
  CROSS APPLY (
    SELECT CHARINDEX(@video_wrapper_start, themes.template_json) AS wrapper_start
  ) AS wrapper
  CROSS APPLY (
    SELECT CHARINDEX(@video_end, themes.template_json, wrapper.wrapper_start) AS video_end
  ) AS video
  CROSS APPLY (
    SELECT
      wrapper.wrapper_start,
      CHARINDEX(@wrapper_end, themes.template_json, video.video_end + LEN(@video_end)) AS wrapper_end
  ) AS positions
  WHERE themes.theme_key IN (
      N'imported-cidia-2026-e887522a',
      N'imported-cidia-5224b23e'
    )
    AND themes.template_json LIKE N'%pexels-pavel-danilyuk-8716790.mp4%'
    AND positions.wrapper_start > 0
    AND video.video_end > positions.wrapper_start
    AND positions.wrapper_end > video.video_end;

  SET @batch_count = @@ROWCOUNT;
  SET @updated_themes += @batch_count;
END;

SELECT
  @updated_sections AS updated_sections,
  @updated_themes AS updated_theme_copies;
