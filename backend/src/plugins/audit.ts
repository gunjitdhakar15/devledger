/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOC-2 AUDIT LOGGING PLUGIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SOC-2 COMPLIANCE REQUIREMENT:
 * The audit log must answer: WHO did WHAT to WHICH resource, WHEN, and WHAT CHANGED
 * 
 * ┌───────────────┬─────────────────────────────────────────────────────────────┐
 * │ Field         │ Description                                                 │
 * ├───────────────┼─────────────────────────────────────────────────────────────┤
 * │ actor         │ User ID who performed the action                            │
 * │ action        │ What was done (CREATE, UPDATE, DELETE, READ)                │
 * │ resource      │ Which entity was affected (task, project, etc.)             │
 * │ resourceId    │ ID of the affected entity                                   │
 * │ oldValue      │ State BEFORE the change (null for CREATE)                   │
 * │ newValue      │ State AFTER the change (null for DELETE)                    │
 * │ diff          │ Computed difference between old and new                     │
 * │ timestamp     │ When the action occurred (ISO 8601)                         │
 * │ ipAddress     │ Client IP for security investigation                        │
 * │ userAgent     │ Client info for forensics                                   │
 * └───────────────┴─────────────────────────────────────────────────────────────┘
 * 
 * ARCHITECTURE: "State Capture" Pattern
 * 1. Service layer captures oldValue BEFORE mutation
 * 2. Service attaches it to request.audit context
 * 3. onSend hook fires AFTER response is ready
 * 4. Hook computes diff and writes audit entry asynchronously
 */

import fp from 'fastify-plugin';
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DECLARATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Audit context attached to request by Service layer
 */
export interface AuditContext {
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
    resource: string;              // e.g., 'task', 'project', 'user'
    resourceId: string;            // MongoDB _id of the resource
    oldValue?: Record<string, unknown>;  // State before change
    metadata?: Record<string, unknown>;  // Additional context
}

/**
 * Extend Fastify Request with audit context
 */
declare module 'fastify' {
    interface FastifyRequest {
        audit?: AuditContext;
    }
}

/**
 * Audit log entry structure
 */
interface AuditLogDocument extends Document {
    actor: mongoose.Types.ObjectId | null;  // User who performed action
    actorEmail: string;                      // Cached email for display
    action: string;
    resource: string;
    resourceId: string;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
    diff: unknown[];                         // deep-diff result
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    requestId: string;
    duration: number;                        // Request duration in ms
    metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG MODEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mongoose schema for audit logs
 * INDEX STRATEGY: Optimized for compliance queries
 */
const auditLogSchema = new Schema<AuditLogDocument>({
    actor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,               // null for unauthenticated actions
    },
    actorEmail: {
        type: String,
        default: 'anonymous',
    },
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'READ', 'LOGIN', 'LOGOUT'],
    },
    resource: {
        type: String,
        required: true,
        index: true,                 // Fast lookups by resource type
    },
    resourceId: {
        type: String,
        required: true,
    },
    oldValue: {
        type: Schema.Types.Mixed,
        default: null,
    },
    newValue: {
        type: Schema.Types.Mixed,
        default: null,
    },
    diff: {
        type: [Schema.Types.Mixed],
        default: [],
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,                 // Fast time-range queries
    },
    ipAddress: String,
    userAgent: String,
    requestId: String,
    duration: Number,
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
}, {
    // ─────────────────────────────────────────────────────────────────────────────
    // PERFORMANCE: Use a capped collection for automatic rotation
    // After ~10M docs or 5GB, oldest entries are automatically deleted
    // ─────────────────────────────────────────────────────────────────────────────
    // capped: { size: 5368709120, max: 10000000 },  // Uncomment for capped collection

    // Use separate collection for audit isolation
    collection: 'audit_logs',
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOUND INDEX for common compliance queries:
// "Show all UPDATE actions on tasks in the last 30 days"
// ─────────────────────────────────────────────────────────────────────────────
auditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });

// Index for user activity reports
auditLogSchema.index({ actor: 1, timestamp: -1 });

let AuditLogModel: Model<AuditLogDocument>;

interface AuditDiffEntry {
    path: string;
    before: unknown;
    after: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize sensitive fields before logging
 * NEVER log: passwords, tokens, credit cards, SSN
 */
function sanitizeForAudit(obj: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!obj) return null;

    const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'ssn'];
    const sanitized = { ...obj };

    for (const field of SENSITIVE_FIELDS) {
        if (field in sanitized) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Extract client IP from request (handles proxies)
 */
function getClientIp(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildDiffEntries(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    currentPath: string[] = []
): AuditDiffEntry[] {
    const keys = new Set([
        ...Object.keys(before),
        ...Object.keys(after),
    ]);

    const changes: AuditDiffEntry[] = [];

    for (const key of keys) {
        const nextPath = [...currentPath, key];
        const left = before[key];
        const right = after[key];

        if (isPlainObject(left) && isPlainObject(right)) {
            changes.push(...buildDiffEntries(left, right, nextPath));
            continue;
        }

        if (Array.isArray(left) && Array.isArray(right)) {
            if (JSON.stringify(left) !== JSON.stringify(right)) {
                changes.push({
                    path: nextPath.join('.'),
                    before: left,
                    after: right,
                });
            }
            continue;
        }

        if (left instanceof Date || right instanceof Date) {
            const leftValue = left instanceof Date ? left.toISOString() : left;
            const rightValue = right instanceof Date ? right.toISOString() : right;

            if (leftValue !== rightValue) {
                changes.push({
                    path: nextPath.join('.'),
                    before: leftValue,
                    after: rightValue,
                });
            }
            continue;
        }

        if (left !== right) {
            changes.push({
                path: nextPath.join('.'),
                before: left,
                after: right,
            });
        }
    }

    return changes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

async function auditPlugin(fastify: FastifyInstance) {
    // ─────────────────────────────────────────────────────────────────────────────
    // INITIALIZE MODEL
    // ─────────────────────────────────────────────────────────────────────────────
    // Create model if it doesn't exist (prevents "OverwriteModelError" in tests)
    AuditLogModel = mongoose.models.AuditLog as Model<AuditLogDocument> ||
        mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);

    // ─────────────────────────────────────────────────────────────────────────────
    // DECORATE REQUEST WITH AUDIT CONTEXT
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.decorateRequest('audit', undefined);

    // ─────────────────────────────────────────────────────────────────────────────
    // ON REQUEST: Capture start time for duration calculation
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.addHook('onRequest', async (request) => {
        // Store start time for duration calculation
        (request as FastifyRequest & { startTime: bigint }).startTime = process.hrtime.bigint();
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // ON SEND: Capture response and write audit log
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * The onSend hook fires when the response payload is ready but before it's sent
     * This is the perfect time to capture the "newValue" for audit logging
     */
    fastify.addHook('onSend', async (request, reply, payload) => {
        // Skip if no audit context was set (not an auditable action)
        if (!request.audit) {
            return payload;
        }

        const { action, resource, resourceId, oldValue, metadata } = request.audit;

        // ─────────────────────────────────────────────────────────────────────────
        // EXTRACT NEW VALUE FROM RESPONSE
        // ─────────────────────────────────────────────────────────────────────────
        let newValue: Record<string, unknown> | null = null;

        // Only parse if payload is a string (JSON response)
        if (typeof payload === 'string' && payload.length > 0) {
            try {
                const parsed = JSON.parse(payload);
                // Common patterns: { data: {...} } or direct object
                newValue = parsed.data || parsed;
            } catch {
                // Not JSON, skip newValue capture
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // COMPUTE DIFF (for UPDATE actions)
        // ─────────────────────────────────────────────────────────────────────────
        let changes: unknown[] = [];
        if (action === 'UPDATE' && oldValue && newValue) {
            changes = buildDiffEntries(oldValue, newValue);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // CALCULATE DURATION
        // ─────────────────────────────────────────────────────────────────────────
        const startTime = (request as FastifyRequest & { startTime?: bigint }).startTime;
        const duration = startTime
            ? Number(process.hrtime.bigint() - startTime) / 1_000_000  // Convert ns to ms
            : 0;

        // ─────────────────────────────────────────────────────────────────────────
        // WRITE AUDIT LOG (ASYNC - Fire and Forget)
        // ─────────────────────────────────────────────────────────────────────────
        /**
         * IMPORTANT: We don't await this write
         * Writing to DB adds latency to the response, but audit logs shouldn't
         * slow down user experience. We "fire and forget."
         * 
         * TRADE-OFF: If server crashes between response and write, log is lost
         * MITIGATION: For critical systems, use a message queue (Redis/RabbitMQ)
         */
        AuditLogModel.create({
            actor: request.user?.id ? new mongoose.Types.ObjectId(request.user.id) : null,
            actorEmail: request.user?.email || 'anonymous',
            action,
            resource,
            resourceId,
            oldValue: sanitizeForAudit(oldValue || null),
            newValue: sanitizeForAudit(newValue),
            diff: changes,
            timestamp: new Date(),
            ipAddress: getClientIp(request),
            userAgent: request.headers['user-agent'] || 'unknown',
            requestId: request.id,
            duration,
            metadata: metadata || {},
        }).catch((err) => {
            // Log error but don't fail the request
            fastify.log.error({ err }, 'Failed to write audit log');
        });

        return payload;
    });

    fastify.log.info('📋 Audit logging plugin registered');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default fp(auditPlugin, {
    name: 'audit-plugin',
    fastify: '5.x',
    dependencies: ['db-plugin'],   // Requires MongoDB connection
});

// Export model for direct queries (e.g., admin dashboard)
export { AuditLogModel };
