/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RBAC (Role-Based Access Control) GUARDS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * AUTHORIZATION vs AUTHENTICATION:
 * - Authentication: WHO are you? (handled by auth plugin)
 * - Authorization:  WHAT can you do? (handled by these guards)
 * 
 * RBAC MODEL:
 * ┌────────────────┬─────────────────────────────────────────────────────────────┐
 * │ Role           │ Permissions                                                 │
 * ├────────────────┼─────────────────────────────────────────────────────────────┤
 * │ ADMIN          │ All operations on all resources                             │
 * │ MANAGER        │ CRUD on projects, assign tasks, view all users              │
 * │ DEVELOPER      │ CRUD on assigned tasks, view projects                       │
 * │ VIEWER         │ Read-only access to projects and tasks                      │
 * └────────────────┴─────────────────────────────────────────────────────────────┘
 * 
 * USAGE IN ROUTES:
 * ```typescript
 * app.delete('/projects/:id', {
 *   preHandler: [app.authenticate, authorize('ADMIN', 'MANAGER')]
 * }, deleteProjectHandler);
 * ```
 */

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Role type - matches what's stored in JWT payload
 */
export type Role = 'ADMIN' | 'MANAGER' | 'DEVELOPER' | 'VIEWER';

/**
 * Role hierarchy for permission checking
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<Role, number> = {
    ADMIN: 100,      // Supreme access
    MANAGER: 75,     // Project-level control
    DEVELOPER: 50,   // Task-level work
    VIEWER: 25,      // Read-only
};

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a preHandler hook that checks if user has one of the required roles
 * 
 * @param requiredRoles - Array of roles that are allowed to access the route
 * @returns Fastify preHandler hook function
 * 
 * EXAMPLE:
 * ```typescript
 * // Only ADMIN and MANAGER can access this route
 * preHandler: [app.authenticate, authorize('ADMIN', 'MANAGER')]
 * 
 * // Any authenticated user can access (all roles allowed)
 * preHandler: [app.authenticate, authorize('ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER')]
 * ```
 * 
 * NOTE: This guard expects `app.authenticate` to run FIRST.
 * If req.user is undefined, it means authentication was skipped → error
 */
export function authorize(...requiredRoles: Role[]): preHandlerHookHandler {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
        // ─────────────────────────────────────────────────────────────────────────
        // STEP 1: Verify user is authenticated
        // ─────────────────────────────────────────────────────────────────────────
        const user = request.user;

        if (!user) {
            // This shouldn't happen if authenticate middleware ran first
            throw new UnauthorizedError('Authentication required');
        }

        // ─────────────────────────────────────────────────────────────────────────
        // STEP 2: Check if user's role is in the allowed list
        // ─────────────────────────────────────────────────────────────────────────
        if (!requiredRoles.includes(user.role)) {
            throw new ForbiddenError(
                `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`
            );
        }

        // User is authorized - continue to the route handler
    };
}

/**
 * Creates a preHandler hook that checks if user's role meets minimum level
 * 
 * @param minimumRole - The minimum role required (based on hierarchy)
 * @returns Fastify preHandler hook function
 * 
 * EXAMPLE:
 * ```typescript
 * // Require at least DEVELOPER level (DEVELOPER, MANAGER, ADMIN can access)
 * preHandler: [app.authenticate, requireMinRole('DEVELOPER')]
 * ```
 */
export function requireMinRole(minimumRole: Role): preHandlerHookHandler {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
        const user = request.user;

        if (!user) {
            throw new UnauthorizedError('Authentication required');
        }

        const userLevel = ROLE_HIERARCHY[user.role];
        const requiredLevel = ROLE_HIERARCHY[minimumRole];

        if (userLevel < requiredLevel) {
            throw new ForbiddenError(
                `Insufficient privileges. Minimum required: ${minimumRole}. Your role: ${user.role}`
            );
        }
    };
}

/**
 * Guard that only allows access to the resource owner
 * 
 * @param getResourceOwnerId - Function to extract owner ID from request
 * @returns Fastify preHandler hook function
 * 
 * EXAMPLE:
 * ```typescript
 * // User can only edit their own profile
 * preHandler: [
 *   app.authenticate,
 *   requireOwnership((req) => req.params.userId)
 * ]
 * ```
 */
export function requireOwnership(
    getResourceOwnerId: (request: FastifyRequest) => string | Promise<string>
): preHandlerHookHandler {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
        const user = request.user;

        if (!user) {
            throw new UnauthorizedError('Authentication required');
        }

        // ADMINs can access any resource (bypass ownership check)
        if (user.role === 'ADMIN') {
            return;
        }

        const ownerId = await getResourceOwnerId(request);

        if (user.id !== ownerId) {
            throw new ForbiddenError('You can only access your own resources');
        }
    };
}

/**
 * Combined guard: User must own the resource OR have one of the specified roles
 * 
 * @param getResourceOwnerId - Function to extract owner ID from request
 * @param bypassRoles - Roles that can bypass ownership check
 * @returns Fastify preHandler hook function
 * 
 * EXAMPLE:
 * ```typescript
 * // Task can be edited by assignee OR manager/admin
 * preHandler: [
 *   app.authenticate,
 *   requireOwnershipOrRole(
 *     (req) => req.task?.assigneeId,  // assuming task is attached by previous middleware
 *     'MANAGER', 'ADMIN'
 *   )
 * ]
 * ```
 */
export function requireOwnershipOrRole(
    getResourceOwnerId: (request: FastifyRequest) => string | Promise<string>,
    ...bypassRoles: Role[]
): preHandlerHookHandler {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
        const user = request.user;

        if (!user) {
            throw new UnauthorizedError('Authentication required');
        }

        // If user has bypass role, allow access
        if (bypassRoles.includes(user.role)) {
            return;
        }

        // Otherwise, check ownership
        const ownerId = await getResourceOwnerId(request);

        if (user.id !== ownerId) {
            throw new ForbiddenError(
                `Access denied. Either own the resource or have role: ${bypassRoles.join(', ')}`
            );
        }
    };
}
