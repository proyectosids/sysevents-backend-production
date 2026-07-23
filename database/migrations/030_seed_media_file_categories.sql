IF OBJECT_ID('dbo.file_categories', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'speaker_media')
    INSERT INTO dbo.file_categories (name, description) VALUES ('speaker_media', 'Archivos asociados a ponentes');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'sponsor_media')
    INSERT INTO dbo.file_categories (name, description) VALUES ('sponsor_media', 'Logos y archivos asociados a patrocinadores');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'agenda_media')
    INSERT INTO dbo.file_categories (name, description) VALUES ('agenda_media', 'Imagenes y archivos asociados a la agenda');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'event_material')
    INSERT INTO dbo.file_categories (name, description) VALUES ('event_material', 'Materiales publicos descargables del evento');

  IF NOT EXISTS (SELECT 1 FROM dbo.file_categories WHERE name = 'site_asset')
    INSERT INTO dbo.file_categories (name, description) VALUES ('site_asset', 'Recursos generales del sitio publico');
END;
