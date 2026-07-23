IF COL_LENGTH('dbo.participant_profiles', 'professional_experience_json') IS NULL
  ALTER TABLE dbo.participant_profiles ADD professional_experience_json NVARCHAR(MAX) NOT NULL CONSTRAINT df_participant_profiles_professional_experience DEFAULT '[]';

IF COL_LENGTH('dbo.event_speakers', 'professional_experience_json') IS NULL
  ALTER TABLE dbo.event_speakers ADD professional_experience_json NVARCHAR(MAX) NOT NULL CONSTRAINT df_event_speakers_professional_experience DEFAULT '[]';
