UPDATE dbo.event_registrations
SET status = 'accepted_pending_payment',
    updated_at = SYSUTCDATETIME()
WHERE status = 'approved';
