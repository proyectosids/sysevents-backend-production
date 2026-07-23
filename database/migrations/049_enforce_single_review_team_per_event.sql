IF OBJECT_ID('dbo.event_program_review_team_members', 'U') IS NOT NULL
BEGIN
  DELETE reviewer
  FROM dbo.event_program_review_team_members reviewer
  WHERE reviewer.team_role = 'reviewer'
    AND EXISTS (
      SELECT 1
      FROM dbo.event_program_review_team_members leader
      WHERE leader.event_id = reviewer.event_id
        AND leader.user_id = reviewer.user_id
        AND leader.team_role = 'leader'
    );

  ;WITH duplicate_reviewers AS (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY event_id, user_id
        ORDER BY created_at ASC, id ASC
      ) AS row_number
    FROM dbo.event_program_review_team_members
    WHERE team_role = 'reviewer'
  )
  DELETE FROM duplicate_reviewers
  WHERE row_number > 1;

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'uq_program_review_team_event_user'
      AND object_id = OBJECT_ID('dbo.event_program_review_team_members')
  )
  BEGIN
    CREATE UNIQUE INDEX uq_program_review_team_event_user
      ON dbo.event_program_review_team_members(event_id, user_id);
  END;
END;
