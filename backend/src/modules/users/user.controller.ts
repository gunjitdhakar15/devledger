/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER CONTROLLER - HTTP Interface Adapter
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE PRINCIPLE: Controller as Interface Adapter
 * - Adapts HTTP requests to Service method calls
 * - Adapts Service responses to HTTP responses
 * - Contains ZERO business logic (that's in Service)
 * - Handles request/response transformation only
 * 
 * RESPONSIBILITIES:
 * 1. Extract data from request (params, body, query, user)
 * 2. Call the appropriate Service method
 * 3. Set audit context for SOC-2 logging
 * 4. Return formatted response
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from './user.service.js';
import type {
    CreateUserInput,
    UpdateUserInput,
    UserIdParam,
    QueryUsersInput
} from './user.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROLLER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class UserController {
    // Dependency injection
    constructor(private readonly userService: UserService) { }

    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE USER (Admin only)
    // POST /api/v1/users
    // ─────────────────────────────────────────────────────────────────────────────

    async createUser(
        request: FastifyRequest<{ Body: CreateUserInput }>,
        reply: FastifyReply
    ): Promise<void> {
        // Extract validated data from request body
        const userData = request.body;

        // Get creator's role for permission checking
        const creatorRole = request.user?.role;

        // Call service
        const user = await this.userService.createUser(userData, creatorRole);

        // ─── Set Audit Context ───────────────────────────────────────────────────
        request.audit = {
            action: 'CREATE',
            resource: 'user',
            resourceId: user.id,
        };

        // Return created user
        reply.status(201).send({
            success: true,
            data: user,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // GET USER BY ID
    // GET /api/v1/users/:id
    // ─────────────────────────────────────────────────────────────────────────────

    async getUserById(
        request: FastifyRequest<{ Params: UserIdParam }>,
        reply: FastifyReply
    ): Promise<void> {
        const { id } = request.params;

        const user = await this.userService.getUserById(id);

        reply.send({
            success: true,
            data: user,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // GET CURRENT USER (Self)
    // GET /api/v1/users/me
    // ─────────────────────────────────────────────────────────────────────────────

    async getCurrentUser(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        // User ID from JWT token
        const userId = request.user!.id;

        const user = await this.userService.getUserById(userId);

        reply.send({
            success: true,
            data: user,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LIST USERS
    // GET /api/v1/users?page=1&limit=10&role=DEVELOPER
    // ─────────────────────────────────────────────────────────────────────────────

    async listUsers(
        request: FastifyRequest<{ Querystring: QueryUsersInput }>,
        reply: FastifyReply
    ): Promise<void> {
        // Validated query params
        const query = request.query;

        const result = await this.userService.listUsers(query);

        reply.send({
            success: true,
            data: result.data,
            meta: result.meta,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UPDATE USER (Admin)
    // PUT /api/v1/users/:id
    // ─────────────────────────────────────────────────────────────────────────────

    async updateUser(
        request: FastifyRequest<{ Params: UserIdParam; Body: UpdateUserInput }>,
        reply: FastifyReply
    ): Promise<void> {
        const { id } = request.params;
        const updateData = request.body;
        const requesterId = request.user!.id;
        const requesterRole = request.user!.role;

        // ─── Capture old state for audit ───────────────────────────────────────────
        const oldUser = await this.userService.getUserById(id);
        request.audit = {
            action: 'UPDATE',
            resource: 'user',
            resourceId: id,
            oldValue: oldUser as unknown as Record<string, unknown>,
        };

        const updatedUser = await this.userService.updateUser(
            id,
            updateData,
            requesterId,
            requesterRole
        );

        reply.send({
            success: true,
            data: updatedUser,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UPDATE OWN PROFILE
    // PUT /api/v1/users/me
    // ─────────────────────────────────────────────────────────────────────────────

    async updateOwnProfile(
        request: FastifyRequest<{ Body: Omit<UpdateUserInput, 'role'> }>,
        reply: FastifyReply
    ): Promise<void> {
        const userId = request.user!.id;
        const updateData = request.body;

        // Capture old state for audit
        const oldUser = await this.userService.getUserById(userId);
        request.audit = {
            action: 'UPDATE',
            resource: 'user',
            resourceId: userId,
            oldValue: oldUser as unknown as Record<string, unknown>,
        };

        const updatedUser = await this.userService.updateOwnProfile(userId, updateData);

        reply.send({
            success: true,
            data: updatedUser,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DEACTIVATE USER (Admin)
    // DELETE /api/v1/users/:id
    // ─────────────────────────────────────────────────────────────────────────────

    async deactivateUser(
        request: FastifyRequest<{ Params: UserIdParam }>,
        reply: FastifyReply
    ): Promise<void> {
        const { id } = request.params;
        const requesterId = request.user!.id;
        const requesterRole = request.user!.role;

        // Capture old state for audit
        const oldUser = await this.userService.getUserById(id);
        request.audit = {
            action: 'DELETE',
            resource: 'user',
            resourceId: id,
            oldValue: oldUser as unknown as Record<string, unknown>,
        };

        const deactivatedUser = await this.userService.deactivateUser(
            id,
            requesterId,
            requesterRole
        );

        reply.send({
            success: true,
            data: deactivatedUser,
            message: 'User deactivated successfully',
        });
    }
}
