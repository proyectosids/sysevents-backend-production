;WITH ranked_assignments AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY submission_id, reviewer_user_id
      ORDER BY CASE WHEN status = 'submitted' THEN 0 ELSE 1 END,
        CASE WHEN submitted_at IS NULL THEN 1 ELSE 0 END,
        submitted_at DESC,
        created_at ASC
    ) AS duplicate_rank
  FROM dbo.review_assignments
)
DELETE assignment
FROM dbo.review_assignments assignment
INNER JOIN ranked_assignments ranked ON ranked.id = assignment.id
WHERE ranked.duplicate_rank > 1;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.review_assignments')
    AND name = 'uq_review_assignments_submission_reviewer'
)
BEGIN
  CREATE UNIQUE INDEX uq_review_assignments_submission_reviewer
    ON dbo.review_assignments (submission_id, reviewer_user_id);
END;
