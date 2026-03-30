/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APPLICATION FACTORY - The Heart of the Modular Monolith
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHY AN APPLICATION FACTORY:
 * - Enables isolated testing: Create a fresh app instance per test
 * - Supports parallel test execution without shared state
 * - Separates app configuration from server startup
 * 
 * ARCHITECTURE PATTERN:
 * This follows the "Composition Root" pattern from Dependency Injection:
 * - All dependencies are wired together in ONE place
 * - The app doesn't know about the database implementation
 * - The app doesn't know about the authentication mechanism
 * - It just knows it has plugins that provide these capabilities
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { env } from './config/env.js';

// Plugins
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import auditPlugin from './plugins/audit.js';

// Routes (will be imported as we build them)
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { taskRoutes } from './modules/tasks/task.routes.js';

// Error handler
import { errorHandler } from './common/utils/error-handler.js';

// ═══════════════════════════════════════════════════════════════════════════════
// APP FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build and configure a Fastify application instance
 * 
 * @returns Configured Fastify instance ready to listen
 * 
 * WHAT THIS DOES:
 * 1. Creates a new Fastify instance with logging
 * 2. Registers security plugins (helmet, cors, rate-limit)
 * 3. Registers infrastructure plugins (db, auth, audit)
 * 4. Registers feature routes (auth, users, projects, tasks)
 * 5. Sets up global error handling
 */
export async function buildApp(): Promise<FastifyInstance> {
    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE FASTIFY INSTANCE
    // ─────────────────────────────────────────────────────────────────────────────
    const app = Fastify({
        logger: {
            level: env.NODE_ENV === 'production' ? 'info' : 'debug',
            // Pretty printing for development (easier to read)
            transport: env.NODE_ENV !== 'production'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined,
        },
        // Generate unique request IDs for tracing
        genReqId: (req) => {
            return req.headers['x-request-id'] as string || crypto.randomUUID();
        },
    });

    // Let Fastify validate and serialize the Zod schemas used across the routes.
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // ─────────────────────────────────────────────────────────────────────────────
    // SECURITY PLUGINS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * HELMET: Sets security-related HTTP headers
     * - HSTS: Enforces HTTPS
     * - X-Frame-Options: Prevents clickjacking
     * - X-Content-Type-Options: Prevents MIME sniffing
     * - CSP: Restricts resource loading
     */
    await app.register(helmet, {
        contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    });

    /**
     * CORS: Cross-Origin Resource Sharing
     * - Allows frontend to make requests to this API
     * - Credentials: true allows cookies (for refresh tokens)
     */
    await app.register(cors, {
        origin: env.FRONTEND_URL,     // Only allow requests from our frontend
        credentials: true,             // Allow cookies
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    /**
     * RATE LIMITING: Protects against DDoS and brute force
     * - Global limit: 100 requests per minute
     * - Can be overridden per-route for sensitive endpoints
     */
    await app.register(rateLimit, {
        global: true,
        max: 100,                      // Max requests per window
        timeWindow: '1 minute',
        // Custom handler for rate limit exceeded
        errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please slow down.',
            code: 'RATE_LIMITED',
        }),
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // INFRASTRUCTURE PLUGINS
    // ─────────────────────────────────────────────────────────────────────────────

    // MongoDB connection (decorates app with app.mongoose)
    await app.register(dbPlugin);

    // JWT authentication (decorates app with app.authenticate)
    await app.register(authPlugin);

    // SOC-2 audit logging (adds onSend hook)
    await app.register(auditPlugin);

    // ─────────────────────────────────────────────────────────────────────────────
    // FEATURE ROUTES
    // ─────────────────────────────────────────────────────────────────────────────
    // Each route module is prefixed with /api/v1/{feature}

    await app.register(authRoutes, { prefix: '/api/v1/auth' });
    await app.register(userRoutes, { prefix: '/api/v1/users' });
    await app.register(projectRoutes, { prefix: '/api/v1/projects' });
    await app.register(taskRoutes, { prefix: '/api/v1/tasks' });

    // ─────────────────────────────────────────────────────────────────────────────
    // HEALTH CHECK ENDPOINT
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * Health check for load balancers and Kubernetes probes
     * Returns 200 if app is running, includes DB status
     */
    app.get('/health', async () => {
        const dbStatus = app.mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            uptime: process.uptime(),
        };
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // GLOBAL ERROR HANDLER
    // ─────────────────────────────────────────────────────────────────────────────
    app.setErrorHandler(errorHandler);

    return app;
}
