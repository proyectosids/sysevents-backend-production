"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function mapOrder(row) {
    return {
        id: row.id,
        provider: row.provider,
        eventId: row.event_id,
        registrationId: row.registration_id,
        userId: row.user_id,
        amountCents: row.amount_cents,
        currency: row.currency,
        status: row.status,
        providerOrderId: row.provider_order_id,
        checkoutUrl: row.checkout_url,
        eventName: row.event_name,
        createdAt: row.created_at,
    };
}
class PaymentsRepository {
    async getEventPaymentPolicy(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT TOP 1 payment_policy
        FROM dbo.event_settings
        WHERE event_id = @eventId
      `);
        return result.recordset[0]?.payment_policy ?? 'immediate';
    }
    async hasAcceptedSubmission(registrationId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.submissions
        WHERE registration_id = @registrationId
          AND status = 'accepted' AND deleted_at IS NULL
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async findLatestOrder(registrationId, provider, statuses) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
            .input('provider', mssql_1.default.NVarChar(60), provider)
            .input('statuses', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(statuses))
            .query(`
        SELECT TOP 1 po.id, pp.name AS provider, po.event_id, po.registration_id, po.user_id,
          po.amount_cents, po.currency, po.status, po.provider_order_id, po.checkout_url, po.created_at
        FROM dbo.payment_orders po
        INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
        INNER JOIN OPENJSON(@statuses) selected ON selected.value = po.status
        WHERE po.registration_id = @registrationId AND pp.name = @provider
        ORDER BY po.created_at DESC
      `);
        return result.recordset[0] ? mapOrder(result.recordset[0]) : null;
    }
    async cancelOrder(orderId) {
        const pool = await (0, database_1.getSqlPool)();
        await pool.request().input('orderId', mssql_1.default.UniqueIdentifier, orderId).query(`
      UPDATE dbo.payment_orders SET status = 'cancelled', updated_at = SYSUTCDATETIME()
      WHERE id = @orderId AND status IN ('created', 'pending')
    `);
    }
    async restoreRegistrationPaymentPending(registrationId, presenter) {
        const pool = await (0, database_1.getSqlPool)();
        await pool.request()
            .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
            .input('status', mssql_1.default.NVarChar(40), presenter ? 'accepted_pending_payment' : 'pending_payment')
            .query(`
        UPDATE dbo.event_registrations SET status = @status, updated_at = SYSUTCDATETIME()
        WHERE id = @registrationId AND status = 'confirmed'
          AND NOT EXISTS (SELECT 1 FROM dbo.payment_orders WHERE registration_id = @registrationId AND status = 'paid')
      `);
    }
    async createOrder(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('provider', mssql_1.default.NVarChar(60), input.provider)
            .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
            .input('registrationId', mssql_1.default.UniqueIdentifier, input.registrationId)
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
            .input('amountCents', mssql_1.default.Int, input.amountCents)
            .input('currency', mssql_1.default.Char(3), input.currency)
            .input('metadataJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.metadata ?? {}))
            .query(`
        INSERT INTO dbo.payment_orders (
          provider_id, event_id, registration_id, user_id, amount_cents, currency, status, metadata_json
        )
        OUTPUT INSERTED.id,
          @provider AS provider,
          INSERTED.event_id,
          INSERTED.registration_id,
          INSERTED.user_id,
          INSERTED.amount_cents,
          INSERTED.currency,
          INSERTED.status,
          INSERTED.provider_order_id,
          INSERTED.checkout_url
        SELECT id, @eventId, @registrationId, @userId, @amountCents, @currency, 'created', @metadataJson
        FROM dbo.payment_providers
        WHERE name = @provider AND is_active = 1
      `);
        return result.recordset[0] ? mapOrder(result.recordset[0]) : null;
    }
    async updateOrderProviderData(orderId, providerOrderId, checkoutUrl) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('orderId', mssql_1.default.UniqueIdentifier, orderId)
            .input('providerOrderId', mssql_1.default.NVarChar(255), providerOrderId)
            .input('checkoutUrl', mssql_1.default.NVarChar(1000), checkoutUrl)
            .query(`
        UPDATE po
        SET provider_order_id = @providerOrderId,
            checkout_url = @checkoutUrl,
            status = 'pending',
            updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id,
          pp.name AS provider,
          INSERTED.event_id,
          INSERTED.registration_id,
          INSERTED.user_id,
          INSERTED.amount_cents,
          INSERTED.currency,
          INSERTED.status,
          INSERTED.provider_order_id,
          INSERTED.checkout_url
        FROM dbo.payment_orders po
        INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
        WHERE po.id = @orderId
      `);
        return result.recordset[0] ? mapOrder(result.recordset[0]) : null;
    }
    async findOrderByProviderOrderId(providerOrderId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('providerOrderId', mssql_1.default.NVarChar(255), providerOrderId)
            .query(`
        SELECT TOP 1 po.id, pp.name AS provider, po.event_id, po.registration_id, po.user_id,
          po.amount_cents, po.currency, po.status, po.provider_order_id, po.checkout_url
        FROM dbo.payment_orders po
        INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
        WHERE po.provider_order_id = @providerOrderId
      `);
        return result.recordset[0] ? mapOrder(result.recordset[0]) : null;
    }
    async findOrderById(orderId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('orderId', mssql_1.default.UniqueIdentifier, orderId).query(`
      SELECT TOP 1 po.id, pp.name AS provider, po.event_id, po.registration_id, po.user_id,
        po.amount_cents, po.currency, po.status, po.provider_order_id, po.checkout_url
      FROM dbo.payment_orders po
      INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
      WHERE po.id = @orderId
    `);
        return result.recordset[0] ? mapOrder(result.recordset[0]) : null;
    }
    async markOrderPaid(orderId, providerTransactionId, payload) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const orderResult = await transaction
                .request()
                .input('orderId', mssql_1.default.UniqueIdentifier, orderId)
                .query(`
          UPDATE po
          SET status = 'paid', updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.id, pp.name AS provider, INSERTED.event_id, INSERTED.registration_id,
            INSERTED.user_id, INSERTED.amount_cents, INSERTED.currency, INSERTED.status,
            INSERTED.provider_order_id, INSERTED.checkout_url
          FROM dbo.payment_orders po
          INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
          WHERE po.id = @orderId AND po.status <> 'paid'
        `);
            const order = orderResult.recordset[0];
            if (!order) {
                const existingOrder = await transaction
                    .request()
                    .input('orderId', mssql_1.default.UniqueIdentifier, orderId)
                    .query(`
            SELECT TOP 1 po.id, pp.name AS provider, po.event_id, po.registration_id, po.user_id,
              po.amount_cents, po.currency, po.status, po.provider_order_id, po.checkout_url
            FROM dbo.payment_orders po
            INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
            WHERE po.id = @orderId
          `);
                if (!existingOrder.recordset[0]) {
                    await transaction.rollback();
                    throw new Error('Payment order not found');
                }
                await transaction.commit();
                return mapOrder(existingOrder.recordset[0]);
            }
            await transaction
                .request()
                .input('orderId', mssql_1.default.UniqueIdentifier, orderId)
                .input('providerTransactionId', mssql_1.default.NVarChar(255), providerTransactionId)
                .input('status', mssql_1.default.NVarChar(40), 'paid')
                .input('amountCents', mssql_1.default.Int, order.amount_cents)
                .input('currency', mssql_1.default.Char(3), order.currency)
                .input('payloadJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(payload))
                .query(`
          INSERT INTO dbo.payment_transactions (
            payment_order_id, provider_transaction_id, status, amount_cents, currency, raw_payload_json
          )
          VALUES (@orderId, @providerTransactionId, @status, @amountCents, @currency, @payloadJson)
        `);
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, order.registration_id)
                .query(`
          UPDATE dbo.event_registrations
          SET status = 'confirmed', updated_at = SYSUTCDATETIME()
          WHERE id = @registrationId AND status IN ('pending_payment', 'accepted_pending_payment')
        `);
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, order.registration_id)
                .query(`
          INSERT INTO dbo.event_registration_status_history (registration_id, from_status, to_status, reason)
          SELECT @registrationId, NULL, 'confirmed', 'payment_paid'
        `);
            await transaction.commit();
            return mapOrder(order);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async saveWebhookEvent(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('provider', mssql_1.default.NVarChar(60), input.provider)
            .input('providerEventId', mssql_1.default.NVarChar(255), input.providerEventId)
            .input('eventType', mssql_1.default.NVarChar(120), input.eventType)
            .input('payloadJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.payload))
            .query(`
        IF EXISTS (
          SELECT 1 FROM dbo.payment_webhook_events
          WHERE provider = @provider AND provider_event_id = @providerEventId
        )
        BEGIN
          SELECT 0 AS inserted;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.payment_webhook_events (provider, provider_event_id, event_type, payload_json)
          VALUES (@provider, @providerEventId, @eventType, @payloadJson);
          SELECT 1 AS inserted;
        END
      `);
        return result.recordset[0]?.inserted === 1;
    }
    async markWebhookProcessed(provider, providerEventId) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('provider', mssql_1.default.NVarChar(60), provider)
            .input('providerEventId', mssql_1.default.NVarChar(255), providerEventId)
            .query(`
        UPDATE dbo.payment_webhook_events
        SET processed_at = SYSUTCDATETIME()
        WHERE provider = @provider AND provider_event_id = @providerEventId
      `);
    }
    async listMyPayments(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT po.id, pp.name AS provider, po.event_id, po.registration_id, po.user_id,
          po.amount_cents, po.currency, po.status, po.provider_order_id, po.checkout_url,
          e.name AS event_name, po.created_at
        FROM dbo.payment_orders po
        INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
        INNER JOIN dbo.events e ON e.id = po.event_id
        WHERE po.user_id = @userId
        ORDER BY po.created_at DESC
      `);
        return result.recordset.map(mapOrder);
    }
    async listEventPayments(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT po.id, pp.name AS provider, po.event_id, po.registration_id, po.user_id,
          po.amount_cents, po.currency, po.status, po.provider_order_id, po.checkout_url
        FROM dbo.payment_orders po
        INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
        WHERE po.event_id = @eventId
        ORDER BY po.created_at DESC
      `);
        return result.recordset.map(mapOrder);
    }
}
exports.PaymentsRepository = PaymentsRepository;
//# sourceMappingURL=payments.repository.js.map