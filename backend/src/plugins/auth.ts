/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * JWT AUTHENTICATION PLUGIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AUTHENTICATION STRATEGY: Stateless JWT
 * 
 * WHY JWT OVER SESSIONS:
 * - Scalability: No server-side session storage needed (no Redis dependency)
 * - Performance: Token validation is CPU-bound (fast) vs network calls (slow)
 * - Stateless: Any server can validate tokens (horizontal scaling)
 * 
 * SECURITY MODEL (Defense in Depth):
 * ┌─────────────────┬────────────────────┬────────────────────────────────────┐
 * │ Token Type      │ Storage            │ Purpose                            │
 * ├─────────────────┼────────────────────┼────────────────────────────────────┤
 * │ Access Token    │ Memory (JS var)    │ Short-lived (15min), sent in       │
 * │                 │ Authorization hdr  │ Bearer header for API calls        │
 * ├─────────────────┼────────────────────┼────────────────────────────────────┤
 * │ Refresh Token   │ HttpOnly Cookie    │ Long-lived (7d), NOT accessible    │
 * │                 │ Secure, SameSite   │ to JavaScript (XSS protection)     │
 * └─────────────────┴────────────────────┴────────────────────────────────────┘
 */

import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../common/errors/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DECLARATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JWT Payload structure - what's encoded in the token
 */
export interface JwtPayload {
    id: string;                    // User's MongoDB _id
    email: string;                 // User's email
    role: 'ADMIN' | 'MANAGER' | 'DEVELOPER' | 'VIEWER';  // RBAC role
}

/**
 * Extend Fastify's type system
 */
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: JwtPayload;         // Type for jwt.sign payload
        user: JwtPayload;            // Type for req.user after verification
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

async function authPlugin(fastify: FastifyInstance) {
    // ─────────────────────────────────────────────────────────────────────────────
    // REGISTER COOKIE PLUGIN (Required for refresh tokens)
    // ─────────────────────────────────────────────────────────────────────────────
    await fastify.register(fastifyCookie, {
        secret: env.JWT_SECRET,       // Used to sign cookies (HMAC)
        hook: 'onRequest',            // Parse cookies early in lifecycle
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // REGISTER JWT PLUGIN
    // ─────────────────────────────────────────────────────────────────────────────
    await fastify.register(fastifyJwt, {
        secret: env.JWT_SECRET,       // Secret for signing tokens
        sign: {
            expiresIn: env.JWT_ACCESS_EXPIRY,  // Access token expiry (default: 15m)
        },
        cookie: {
            cookieName: 'refreshToken',  // Cookie name for refresh token
            signed: true,                // Cookie is signed for integrity
        },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION DECORATOR
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * Decorator function to protect routes
     * 
     * USAGE:
     * ```typescript
     * app.get('/protected', {
     *   preHandler: [app.authenticate]
     * }, handler);
     * ```
     * 
     * WHAT IT DOES:
     * 1. Extracts JWT from Authorization header
     * 2. Verifies the signature
     * 3. Decodes the payload
     * 4. Attaches decoded payload to request.user
     * 5. If any step fails → UnauthorizedError
     */
    fastify.decorate('authenticate', async function (
        request: FastifyRequest,
        _reply: FastifyReply
    ) {
        try {
            // jwtVerify() extracts token from Authorization header, verifies it,
            // and attaches the decoded payload to request.user
            await request.jwtVerify();
        } catch (err) {
            throw new UnauthorizedError('Invalid or expired token');
        }
    });

    fastify.log.info('🔐 Authentication plugin registered');
}



// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default fp(authPlugin, {
    name: 'auth-plugin',
    fastify: '5.x',
    dependencies: ['db-plugin'],   // DB must be registered first (for user lookups)
});
