"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaasRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function parseFeatures(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return {};
    }
}
function mapPlan(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        priceCents: row.price_cents,
        currency: row.currency,
        billingInterval: row.billing_interval,
        maxEvents: row.max_events,
        maxUsers: row.max_users,
        maxStorageMb: row.max_storage_mb,
        features: parseFeatures(row.features_json),
        isActive: Boolean(row.is_active),
        sortOrder: row.sort_order,
    };
}
function mapSubscription(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        tenantSlug: row.tenant_slug,
        planId: row.plan_id,
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        planName: row.plan_name,
        planPriceCents: row.plan_price_cents,
        planCurrency: row.plan_currency,
        ownerEmail: row.owner_email,
        ownerName: row.owner_name,
        eventName: row.event_name ?? null,
        eventLogoFileId: row.event_logo_file_id ?? null,
        eventsCount: row.events_count ?? 0,
        usersCount: row.users_count ?? 0,
        limits: {
            maxEvents: row.max_events,
            maxUsers: row.max_users,
            maxStorageMb: row.max_storage_mb,
            maxOrganizations: row.max_organizations ?? 1,
        },
    };
}
class SaasRepository {
    async getPlatformDashboard() {
        const pool = await (0, database_1.getSqlPool)();
        const [summaryResult, distributionResult, recentResult] = await Promise.all([
            pool.request().query(`
        SELECT
          (SELECT COUNT(1) FROM dbo.tenants WHERE status = 'active') AS total_tenants,
          (SELECT COUNT(1) FROM dbo.tenant_subscriptions WHERE status = 'active' AND (ends_at IS NULL OR ends_at > SYSUTCDATETIME())) AS active_subscriptions,
          (SELECT COUNT(1) FROM dbo.saas_plans WHERE is_active = 1) AS active_plans,
          (
            SELECT COALESCE(SUM(CASE
              WHEN p.billing_interval = 'monthly' THEN p.price_cents
              WHEN p.billing_interval = 'yearly' THEN p.price_cents / 12
              ELSE 0
            END), 0)
            FROM dbo.tenant_subscriptions s
            INNER JOIN dbo.saas_plans p ON p.id = s.plan_id
            WHERE s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > SYSUTCDATETIME())
          ) AS estimated_monthly_revenue_cents,
          (
            SELECT COALESCE(SUM(CASE
              WHEN p.billing_interval = 'monthly' THEN p.price_cents * 12
              WHEN p.billing_interval = 'yearly' THEN p.price_cents
              WHEN p.billing_interval = 'one_time' THEN p.price_cents
              ELSE 0
            END), 0)
            FROM dbo.tenant_subscriptions s
            INNER JOIN dbo.saas_plans p ON p.id = s.plan_id
            WHERE s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > SYSUTCDATETIME())
          ) AS estimated_annual_revenue_cents,
          (SELECT COUNT(1) FROM dbo.events WHERE deleted_at IS NULL) AS total_events,
          (SELECT COUNT(1) FROM dbo.users WHERE status = 'active') AS total_users
      `),
            pool.request().query(`
        SELECT
          p.id AS plan_id,
          p.name AS plan_name,
          COUNT(s.id) AS subscriptions_count
        FROM dbo.saas_plans p
        LEFT JOIN dbo.tenant_subscriptions s
          ON s.plan_id = p.id
          AND s.status = 'active'
          AND (s.ends_at IS NULL OR s.ends_at > SYSUTCDATETIME())
        GROUP BY p.id, p.name, p.sort_order
        ORDER BY p.sort_order ASC, p.name ASC
      `),
            this.listSubscriptions(5, { activeOnly: true }),
        ]);
        const summary = summaryResult.recordset[0];
        return {
            totalTenants: summary?.total_tenants ?? 0,
            activeSubscriptions: summary?.active_subscriptions ?? 0,
            activePlans: summary?.active_plans ?? 0,
            estimatedMonthlyRevenueCents: summary?.estimated_monthly_revenue_cents ?? 0,
            estimatedAnnualRevenueCents: summary?.estimated_annual_revenue_cents ?? 0,
            totalEvents: summary?.total_events ?? 0,
            totalUsers: summary?.total_users ?? 0,
            planDistribution: distributionResult.recordset.map((row) => ({
                planId: row.plan_id,
                planName: row.plan_name,
                subscriptionsCount: row.subscriptions_count,
            })),
            recentSubscriptions: recentResult,
        };
    }
    async listPublicPlans() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query(`
      SELECT *
      FROM dbo.saas_plans
      WHERE is_active = 1
      ORDER BY sort_order ASC, price_cents ASC
    `);
        return result.recordset.map(mapPlan);
    }
    async listPlans() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query(`
      SELECT *
      FROM dbo.saas_plans
      ORDER BY sort_order ASC, price_cents ASC
    `);
        return result.recordset.map(mapPlan);
    }
    async findPlanById(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query('SELECT TOP 1 * FROM dbo.saas_plans WHERE id = @id AND is_active = 1');
        return result.recordset[0] ? mapPlan(result.recordset[0]) : null;
    }
    async createPlan(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('code', mssql_1.default.NVarChar(80), input.code)
            .input('name', mssql_1.default.NVarChar(140), input.name)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('priceCents', mssql_1.default.Int, input.priceCents)
            .input('currency', mssql_1.default.NVarChar(3), input.currency.toUpperCase())
            .input('billingInterval', mssql_1.default.NVarChar(30), input.billingInterval)
            .input('maxEvents', mssql_1.default.Int, input.maxEvents)
            .input('maxUsers', mssql_1.default.Int, input.maxUsers)
            .input('maxStorageMb', mssql_1.default.Int, input.maxStorageMb)
            .input('featuresJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.features ?? {}))
            .input('isActive', mssql_1.default.Bit, input.isActive)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder)
            .query(`
        INSERT INTO dbo.saas_plans (
          code, name, description, price_cents, currency, billing_interval,
          max_events, max_users, max_storage_mb, features_json, is_active, sort_order
        )
        OUTPUT INSERTED.*
        VALUES (
          @code, @name, @description, @priceCents, @currency, @billingInterval,
          @maxEvents, @maxUsers, @maxStorageMb, @featuresJson, @isActive, @sortOrder
        )
      `);
        return mapPlan(result.recordset[0]);
    }
    async updatePlan(id, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('code', mssql_1.default.NVarChar(80), input.code ?? null)
            .input('name', mssql_1.default.NVarChar(140), input.name ?? null)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('descriptionProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'description'))
            .input('priceCents', mssql_1.default.Int, input.priceCents ?? null)
            .input('currency', mssql_1.default.NVarChar(3), input.currency?.toUpperCase() ?? null)
            .input('billingInterval', mssql_1.default.NVarChar(30), input.billingInterval ?? null)
            .input('maxEvents', mssql_1.default.Int, input.maxEvents ?? null)
            .input('maxUsers', mssql_1.default.Int, input.maxUsers ?? null)
            .input('maxStorageMb', mssql_1.default.Int, input.maxStorageMb ?? null)
            .input('featuresJson', mssql_1.default.NVarChar(mssql_1.default.MAX), input.features ? JSON.stringify(input.features) : null)
            .input('featuresProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'features'))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .query(`
        UPDATE dbo.saas_plans
        SET
          code = COALESCE(@code, code),
          name = COALESCE(@name, name),
          description = CASE WHEN @descriptionProvided = 1 THEN @description ELSE description END,
          price_cents = COALESCE(@priceCents, price_cents),
          currency = COALESCE(@currency, currency),
          billing_interval = COALESCE(@billingInterval, billing_interval),
          max_events = COALESCE(@maxEvents, max_events),
          max_users = COALESCE(@maxUsers, max_users),
          max_storage_mb = COALESCE(@maxStorageMb, max_storage_mb),
          features_json = CASE WHEN @featuresProvided = 1 THEN @featuresJson ELSE features_json END,
          is_active = COALESCE(@isActive, is_active),
          sort_order = COALESCE(@sortOrder, sort_order),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        return result.recordset[0] ? mapPlan(result.recordset[0]) : null;
    }
    async createSubscription(input) {
        const plan = await this.findPlanById(input.planId);
        if (!plan) {
            throw new Error('Plan not found');
        }
        const startsAt = new Date();
        const endsAt = new Date(startsAt);
        if (plan.billingInterval === 'monthly')
            endsAt.setMonth(endsAt.getMonth() + 1);
        else if (plan.billingInterval === 'yearly')
            endsAt.setFullYear(endsAt.getFullYear() + 1);
        else
            endsAt.setDate(endsAt.getDate() + Number(plan.features.validityDays ?? 365));
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, input.tenantId)
            .input('planId', mssql_1.default.UniqueIdentifier, input.planId)
            .input('createdBy', mssql_1.default.UniqueIdentifier, input.createdBy)
            .input('startsAt', mssql_1.default.DateTime2, startsAt)
            .input('endsAt', mssql_1.default.DateTime2, endsAt)
            .query(`
        INSERT INTO dbo.tenant_subscriptions (tenant_id, plan_id, starts_at, ends_at, created_by)
        OUTPUT INSERTED.id
        VALUES (@tenantId, @planId, @startsAt, @endsAt, @createdBy)
      `);
        return result.recordset[0].id;
    }
    async hasActiveSubscriptionForTenant(tenantId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.tenant_subscriptions
        WHERE tenant_id = @tenantId
          AND status = 'active'
          AND (ends_at IS NULL OR ends_at > SYSUTCDATETIME())
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async getMaxOrganizationsForUser(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT COALESCE(MAX(
          COALESCE(
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.maxOrganizations')),
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.organizations')),
            1
          )
        ), 1) AS max_organizations
        FROM dbo.tenant_users tu
        INNER JOIN dbo.tenant_subscriptions s ON s.tenant_id = tu.tenant_id
        INNER JOIN dbo.saas_plans p ON p.id = s.plan_id
        WHERE tu.user_id = @userId
          AND s.status = 'active'
          AND (s.ends_at IS NULL OR s.ends_at > SYSUTCDATETIME())
      `);
        return Math.max(1, Number(result.recordset[0]?.max_organizations ?? 1));
    }
    async listSubscriptionsForUser(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT
          s.id, s.tenant_id, t.name AS tenant_name, t.slug AS tenant_slug,
          s.plan_id, s.status, s.starts_at, s.ends_at,
          p.max_events, p.max_users, p.max_storage_mb,
          COALESCE(
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.maxOrganizations')),
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.organizations')),
            1
          ) AS max_organizations,
          p.name AS plan_name, p.price_cents AS plan_price_cents, p.currency AS plan_currency,
          (SELECT COUNT(1) FROM dbo.events e
            WHERE e.tenant_id = s.tenant_id AND e.deleted_at IS NULL
              AND (e.ends_at IS NULL OR e.ends_at >= SYSUTCDATETIME())) AS events_count,
          (SELECT COUNT(1) FROM dbo.tenant_users members
            WHERE members.tenant_id = s.tenant_id
              AND members.tenant_role IN ('owner', 'admin')) AS users_count
        FROM dbo.tenant_subscriptions s
        INNER JOIN dbo.tenants t ON t.id = s.tenant_id
        INNER JOIN dbo.saas_plans p ON p.id = s.plan_id
        INNER JOIN dbo.tenant_users tu ON tu.tenant_id = s.tenant_id
        WHERE tu.user_id = @userId
        ORDER BY s.created_at DESC
      `);
        return result.recordset.map(mapSubscription);
    }
    async findActiveSubscriptionByTenant(tenantId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query(`
        SELECT TOP 1
          s.id,
          s.tenant_id,
          s.plan_id,
          s.status,
          s.starts_at,
          s.ends_at,
          p.max_events,
          p.max_users,
          p.max_storage_mb,
          COALESCE(
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.maxOrganizations')),
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.organizations')),
            1
          ) AS max_organizations,
          p.name AS plan_name
        FROM dbo.tenant_subscriptions s
        INNER JOIN dbo.saas_plans p ON p.id = s.plan_id
        WHERE s.tenant_id = @tenantId
          AND s.status = 'active'
          AND (s.ends_at IS NULL OR s.ends_at > SYSUTCDATETIME())
        ORDER BY s.created_at DESC
      `);
        return result.recordset[0] ? mapSubscription(result.recordset[0]) : null;
    }
    async listSubscriptions(limit = 100, options = {}) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('limit', mssql_1.default.Int, limit)
            .input('activeOnly', mssql_1.default.Bit, options.activeOnly ? 1 : 0)
            .query(`
        SELECT TOP (@limit)
          s.id,
          s.tenant_id,
          t.name AS tenant_name,
          t.slug AS tenant_slug,
          s.plan_id,
          s.status,
          s.starts_at,
          s.ends_at,
          p.max_events,
          p.max_users,
          p.max_storage_mb,
          COALESCE(
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.maxOrganizations')),
            TRY_CONVERT(INT, JSON_VALUE(p.features_json, '$.organizations')),
            1
          ) AS max_organizations,
          p.name AS plan_name,
          p.price_cents AS plan_price_cents,
          p.currency AS plan_currency,
          owner.email AS owner_email,
          LTRIM(RTRIM(COALESCE(owner.first_name, '') + ' ' + COALESCE(owner.last_name, ''))) AS owner_name,
          current_event.name AS event_name,
          current_event.logo_file_id AS event_logo_file_id,
          (SELECT COUNT(1) FROM dbo.events e WHERE e.tenant_id = s.tenant_id AND e.deleted_at IS NULL) AS events_count,
          (SELECT COUNT(1) FROM dbo.tenant_users tu
            WHERE tu.tenant_id = s.tenant_id
              AND tu.tenant_role IN ('owner', 'admin')) AS users_count
        FROM dbo.tenant_subscriptions s
        INNER JOIN dbo.tenants t ON t.id = s.tenant_id
        INNER JOIN dbo.saas_plans p ON p.id = s.plan_id
        OUTER APPLY (
          SELECT TOP 1 u.email, u.first_name, u.last_name
          FROM dbo.tenant_users tu
          INNER JOIN dbo.users u ON u.id = tu.user_id
          WHERE tu.tenant_id = s.tenant_id AND tu.tenant_role = 'owner'
          ORDER BY tu.created_at ASC
        ) owner
        OUTER APPLY (
          SELECT TOP 1 event.name, event.logo_file_id
          FROM dbo.events event
          WHERE event.tenant_id = s.tenant_id AND event.deleted_at IS NULL
          ORDER BY
            CASE WHEN event.status = 'published' AND (event.ends_at IS NULL OR event.ends_at >= SYSUTCDATETIME()) THEN 0 ELSE 1 END,
            CASE WHEN event.ends_at IS NULL OR event.ends_at >= SYSUTCDATETIME() THEN 0 ELSE 1 END,
            event.starts_at DESC,
            event.created_at DESC
        ) current_event
        WHERE (@activeOnly = 0 OR (
          s.status = 'active'
          AND (s.ends_at IS NULL OR s.ends_at > SYSUTCDATETIME())
        ))
        ORDER BY s.created_at DESC
      `);
        return result.recordset.map(mapSubscription);
    }
}
exports.SaasRepository = SaasRepository;
//# sourceMappingURL=saas.repository.js.map