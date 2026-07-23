UPDATE subscriptions
SET ends_at = CASE
  WHEN plans.billing_interval = 'monthly' THEN DATEADD(MONTH, 1, subscriptions.starts_at)
  WHEN plans.billing_interval = 'yearly' THEN DATEADD(YEAR, 1, subscriptions.starts_at)
  ELSE DATEADD(DAY, COALESCE(TRY_CONVERT(INT, JSON_VALUE(plans.features_json, '$.validityDays')), 365), subscriptions.starts_at)
END,
updated_at = SYSUTCDATETIME()
FROM dbo.tenant_subscriptions subscriptions
INNER JOIN dbo.saas_plans plans ON plans.id = subscriptions.plan_id
WHERE subscriptions.ends_at IS NULL;
