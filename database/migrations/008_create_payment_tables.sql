IF OBJECT_ID('dbo.payment_providers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_providers (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(60) NOT NULL UNIQUE,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.payment_providers WHERE name = 'stripe')
BEGIN
  INSERT INTO dbo.payment_providers (name, is_active) VALUES ('stripe', 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.payment_providers WHERE name = 'mercadopago')
BEGIN
  INSERT INTO dbo.payment_providers (name, is_active) VALUES ('mercadopago', 0);
END;

IF OBJECT_ID('dbo.payment_orders', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_orders (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    provider_id UNIQUEIDENTIFIER NOT NULL,
    event_id UNIQUEIDENTIFIER NOT NULL,
    registration_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NULL,
    amount_cents INT NOT NULL,
    currency CHAR(3) NOT NULL,
    status NVARCHAR(40) NOT NULL DEFAULT 'created',
    provider_order_id NVARCHAR(255) NULL UNIQUE,
    checkout_url NVARCHAR(1000) NULL,
    metadata_json NVARCHAR(MAX) NOT NULL DEFAULT '{}',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_payment_orders_provider FOREIGN KEY (provider_id) REFERENCES dbo.payment_providers(id),
    CONSTRAINT fk_payment_orders_event FOREIGN KEY (event_id) REFERENCES dbo.events(id),
    CONSTRAINT fk_payment_orders_registration FOREIGN KEY (registration_id) REFERENCES dbo.event_registrations(id),
    CONSTRAINT fk_payment_orders_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
END;

IF OBJECT_ID('dbo.payment_transactions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_transactions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    payment_order_id UNIQUEIDENTIFIER NOT NULL,
    provider_transaction_id NVARCHAR(255) NULL,
    status NVARCHAR(40) NOT NULL,
    amount_cents INT NOT NULL,
    currency CHAR(3) NOT NULL,
    raw_payload_json NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_payment_transactions_order FOREIGN KEY (payment_order_id) REFERENCES dbo.payment_orders(id) ON DELETE CASCADE
  );
END;

IF OBJECT_ID('dbo.payment_webhook_events', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_webhook_events (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    provider NVARCHAR(60) NOT NULL,
    provider_event_id NVARCHAR(255) NOT NULL,
    event_type NVARCHAR(120) NOT NULL,
    processed_at DATETIME2 NULL,
    payload_json NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_payment_webhook_events UNIQUE (provider, provider_event_id)
  );
END;
