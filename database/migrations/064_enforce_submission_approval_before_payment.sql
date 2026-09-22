SET NOCOUNT ON;

-- Repair presenter registrations that were incorrectly advanced to payment
-- before an accepted submission existed. Payment services also enforce this
-- rule, so the repair only aligns existing records with the corrected flow.
UPDATE registration
SET status = 'pending_review',
    updated_at = SYSUTCDATETIME()
FROM dbo.event_registrations registration
WHERE registration.participation_mode <> 'attendee'
  AND registration.status IN ('pending_payment', 'accepted_pending_payment')
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.submissions submission
    WHERE submission.registration_id = registration.id
      AND submission.status = 'accepted'
      AND submission.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.payment_orders payment
    WHERE payment.registration_id = registration.id
      AND payment.status = 'paid'
  );
