/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER ROUTES - Route Definitions with Schema Validation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * FASTIFY SCHEMA-FIRST APPROACH:
 * - Every route has a Zod schema for request validation
 * - Validation happens BEFORE the handler is called
 * - Invalid requests get rejected with 400 Bad Request automatically
 * - TypeScript types are inferred from schemas (type-safe handlers!)
 * 
 * ROUTE ORGANIZATION:
 * - Each route is fully self-contained with its schema, guards, and handler
 * - Auth and RBAC guards are applied via preHandler
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';
import { authorize } from '../../common/guards/rbac.guard.js';
import {
    CreateUserSchema,
    UpdateUserSchema,
    UserIdParamSchema,
    QueryUsersSchema,
} from './user.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User routes plugin
 * 
 * DEPENDENCY INJECTION:
 * We instantiate the layers right here (Composition Root for this module)
 * In a larger app, this might be passed in from app.ts
 */
export async function userRoutes(
    fastify: FastifyInstance,
    _options: FastifyPluginOptions
): Promise<void> {
    // ─────────────────────────────────────────────────────────────────────────────
    // DEPENDENCY INJECTION - Wire up the layers
    // ─────────────────────────────────────────────────────────────────────────────
    const userRepo = new UserRepository();
    const userService = new UserService(userRepo);
    const userController = new UserController(userService);

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /users/me - Get current user's profile
    // Auth required, any role
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get('/me', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get current authenticated user profile',
            tags: ['users'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                    },
                },
            },
        },
    }, userController.getCurrentUser.bind(userController));

    // ─────────────────────────────────────────────────────────────────────────────
    // PUT /users/me - Update current user's profile
    // Auth required, any role
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.put('/me', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Update current user profile',
            tags: ['users'],
            body: UpdateUserSchema.omit({ role: true }),  // Can't change own role
        },
    }, userController.updateOwnProfile.bind(userController));

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /users - List all users
    // Auth required, ADMIN or MANAGER only
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get('/', {
        preHandler: [
            fastify.authenticate,
            authorize('ADMIN', 'MANAGER'),
        ],
        schema: {
            description: 'List all users with pagination and filtering',
            tags: ['users'],
            querystring: QueryUsersSchema,
        },
    }, userController.listUsers.bind(userController));

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /users - Create new user
    // Auth required, ADMIN only
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post('/', {
        preHandler: [
            fastify.authenticate,
            authorize('ADMIN'),
        ],
        schema: {
            description: 'Create a new user (admin only)',
            tags: ['users'],
            body: CreateUserSchema,
        },
    }, userController.createUser.bind(userController));

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /users/:id - Get user by ID
    // Auth required, ADMIN or MANAGER only
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get('/:id', {
        preHandler: [
            fastify.authenticate,
            authorize('ADMIN', 'MANAGER'),
        ],
        schema: {
            description: 'Get user by ID',
            tags: ['users'],
            params: UserIdParamSchema,
        },
    }, userController.getUserById.bind(userController));

    // ─────────────────────────────────────────────────────────────────────────────
    // PUT /users/:id - Update user by ID
    // Auth required, ADMIN only
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.put('/:id', {
        preHandler: [
            fastify.authenticate,
            authorize('ADMIN'),
        ],
        schema: {
            description: 'Update user by ID (admin only)',
            tags: ['users'],
            params: UserIdParamSchema,
            body: UpdateUserSchema,
        },
    }, userController.updateUser.bind(userController));

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE /users/:id - Deactivate user
    // Auth required, ADMIN only
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.delete('/:id', {
        preHandler: [
            fastify.authenticate,
            authorize('ADMIN'),
        ],
        schema: {
            description: 'Deactivate user (soft delete)',
            tags: ['users'],
            params: UserIdParamSchema,
        },
    }, userController.deactivateUser.bind(userController));
}
