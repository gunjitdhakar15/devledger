/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTH ROUTES - Authentication Endpoints
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ENDPOINTS:
 * - POST /auth/register     - Create new account
 * - POST /auth/login        - Login and get tokens
 * - POST /auth/refresh      - Refresh access token
 * - POST /auth/logout       - Invalidate refresh token
 * - POST /auth/change-password - Change password (authenticated)
 * 
 * SECURITY NOTES:
 * - Login has stricter rate limiting (5 attempts per minute)
 * - Refresh token is HttpOnly cookie (not accessible to JavaScript)
 * - All sensitive endpoints return generic errors to prevent enumeration
 */

import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { UserRepository } from '../users/user.repository.js';
import {
    RegisterSchema,
    LoginSchema,
    ChangePasswordSchema,
    type RegisterInput,
    type LoginInput,
    type ChangePasswordInput,
} from './auth.schema.js';
import { env } from '../../config/env.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

export async function authRoutes(
    fastify: FastifyInstance,
    _options: FastifyPluginOptions
): Promise<void> {
    // Dependency injection
    const userRepo = new UserRepository();
    const authService = new AuthService(userRepo, fastify);

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER: Set refresh token cookie
    // ─────────────────────────────────────────────────────────────────────────────
    const setRefreshTokenCookie = (reply: FastifyReply, token: string): void => {
        reply.setCookie('refreshToken', token, {
            httpOnly: true,           // JavaScript cannot access (XSS protection)
            secure: env.NODE_ENV === 'production',  // HTTPS only in production
            sameSite: 'strict',       // CSRF protection
            path: '/api/v1/auth',     // Only sent to auth endpoints
            maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        });
    };

    const clearRefreshTokenCookie = (reply: FastifyReply): void => {
        reply.clearCookie('refreshToken', {
            path: '/api/v1/auth',
        });
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /auth/register
    // Create new user account
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post<{ Body: RegisterInput }>('/register', {
        schema: {
            description: 'Register a new user account',
            tags: ['auth'],
            body: RegisterSchema,
        },
        // Rate limit: 10 registrations per minute per IP
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const result = await authService.register(request.body);

        // Set audit context
        request.audit = {
            action: 'CREATE',
            resource: 'user',
            resourceId: result.id,
            metadata: { action: 'REGISTRATION' },
        };

        reply.status(201).send({
            success: true,
            message: 'Registration successful. Please login to continue.',
            data: result,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /auth/login
    // Authenticate and get tokens
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post<{ Body: LoginInput }>('/login', {
        schema: {
            description: 'Login and receive access/refresh tokens',
            tags: ['auth'],
            body: LoginSchema,
        },
        // STRICT RATE LIMIT: 5 login attempts per minute per IP
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const result = await authService.login(request.body);

        // Set refresh token as HttpOnly cookie
        setRefreshTokenCookie(reply, result.refreshToken);

        // Set audit context
        request.audit = {
            action: 'LOGIN' as 'CREATE',  // Custom action
            resource: 'session',
            resourceId: result.user.id,
        };

        // Return access token in body (frontend stores in memory)
        reply.send({
            success: true,
            data: {
                accessToken: result.accessToken,
                expiresIn: result.expiresIn,
                user: result.user,
            },
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /auth/refresh
    // Get new access token using refresh token cookie
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post('/refresh', {
        schema: {
            description: 'Refresh access token using refresh token cookie',
            tags: ['auth'],
        },
    }, async (request, reply) => {
        // Get refresh token from cookie
        const refreshToken = request.cookies.refreshToken;

        if (!refreshToken) {
            return reply.status(401).send({
                success: false,
                error: {
                    code: 'NO_REFRESH_TOKEN',
                    message: 'No refresh token provided. Please login again.',
                },
            });
        }

        // Unsign the cookie (if signed)
        let token = refreshToken;
        if (typeof refreshToken === 'object' && 'value' in refreshToken) {
            token = (refreshToken as { value: string }).value;
        }

        const result = await authService.refreshAccessToken(token);

        // Set new rotated refresh token
        setRefreshTokenCookie(reply, result.refreshToken);

        reply.send({
            success: true,
            data: {
                accessToken: result.accessToken,
                expiresIn: result.expiresIn,
                user: result.user,
            },
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /auth/logout
    // Invalidate refresh token
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post('/logout', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Logout and invalidate refresh token',
            tags: ['auth'],
        },
    }, async (request, reply) => {
        await authService.logout(request.user!.id);

        // Clear refresh token cookie
        clearRefreshTokenCookie(reply);

        // Set audit context
        request.audit = {
            action: 'DELETE',
            resource: 'session',
            resourceId: request.user!.id,
            metadata: { action: 'LOGOUT' },
        };

        reply.send({
            success: true,
            message: 'Logged out successfully',
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /auth/change-password
    // Change password (authenticated)
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post<{ Body: ChangePasswordInput }>('/change-password', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Change password (requires current password)',
            tags: ['auth'],
            body: ChangePasswordSchema,
        },
        // Rate limit: 3 attempts per minute
        config: {
            rateLimit: {
                max: 3,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const { currentPassword, newPassword } = request.body;

        await authService.changePassword(
            request.user!.id,
            currentPassword,
            newPassword
        );

        // Clear refresh token (force re-login)
        clearRefreshTokenCookie(reply);

        // Set audit context
        request.audit = {
            action: 'UPDATE',
            resource: 'user',
            resourceId: request.user!.id,
            metadata: { action: 'PASSWORD_CHANGE' },
        };

        reply.send({
            success: true,
            message: 'Password changed successfully. Please login again.',
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /auth/me
    // Get current authenticated user
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get('/me', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get current authenticated user from token',
            tags: ['auth'],
        },
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        // User data is already in request.user from JWT
        reply.send({
            success: true,
            data: request.user,
        });
    });
}
