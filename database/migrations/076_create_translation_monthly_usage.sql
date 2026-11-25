IF OBJECT_ID('dbo.translation_monthly_usage', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.translation_monthly_usage (
    usage_month CHAR(7) NOT NULL,
    characters_used INT NOT NULL DEFAULT 0,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_translation_monthly_usage PRIMARY KEY (usage_month),
    CONSTRAINT ck_translation_monthly_usage_month CHECK (usage_month LIKE '[1-2][0-9][0-9][0-9]-[0-1][0-9]'),
    CONSTRAINT ck_translation_monthly_usage_nonnegative CHECK (characters_used >= 0)
  );
END;
