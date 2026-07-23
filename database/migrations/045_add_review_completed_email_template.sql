IF NOT EXISTS (SELECT 1 FROM dbo.email_templates WHERE template_key = 'review_completed')
BEGIN
  INSERT INTO dbo.email_templates (template_key, subject, body)
  VALUES (
    'review_completed',
    'Review completed: {{submissionTitle}}',
    'The assigned reviewer completed the recommendation for {{submissionTitle}}. You can now review it and issue the final decision.'
  );
END;
