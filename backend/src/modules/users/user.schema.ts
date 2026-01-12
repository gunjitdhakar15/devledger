/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER SCHEMA & TYPES (Zod Validation)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SINGLE SOURCE OF TRUTH:
 * - Zod schemas define runtime validation rules
 * - TypeScript types are INFERRED from schemas (no duplication!)
 * - If the schema changes, the types change automatically
 * 
 * LAYERS:
 * ┌─────────────────────┬─────────────────────────────────────────────────────┐
 * │ Schema              │ Purpose                                             │
 * ├─────────────────────┼─────────────────────────────────────────────────────┤
 * │ CreateUserSchema    │ Validate data when CREATING a new user              │
 * │ UpdateUserSchema    │ Validate data when UPDATING existing user           │
 * │ UserResponseSchema  │ Shape the data sent BACK to client (hide password)  │
 * │ QueryUsersSchema    │ Validate query parameters for listing users         │
 * └─────────────────────┴─────────────────────────────────────────────────────┘
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE ENUM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User roles for RBAC (Role-Based Access Control)
 */
export const RoleEnum = z.enum(['ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER']);
export type Role = z.infer<typeof RoleEnum>;

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS (What the client sends)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new user
 * Used in: POST /api/v1/auth/register
 */
export const CreateUserSchema = z.object({
    // ─────────────────────────────────────────────────────────────────────────────
    // EMAIL VALIDATION
    // ─────────────────────────────────────────────────────────────────────────────
    email: z.string()
        .email({ message: 'Invalid email format' })
        .toLowerCase()               // Normalize to lowercase
        .trim(),                     // Remove whitespace

    // ─────────────────────────────────────────────────────────────────────────────
    // PASSWORD VALIDATION
    // Strong password requirements for security
    // ─────────────────────────────────────────────────────────────────────────────
    password: z.string()
        .min(8, { message: 'Password must be at least 8 characters' })
        .max(128, { message: 'Password must not exceed 128 characters' })
        .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
        .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
        .regex(/[0-9]/, { message: 'Password must contain at least one number' })
        .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),

    // ─────────────────────────────────────────────────────────────────────────────
    // USERNAME
    // ─────────────────────────────────────────────────────────────────────────────
    username: z.string()
        .min(3, { message: 'Username must be at least 3 characters' })
        .max(50, { message: 'Username must not exceed 50 characters' })
        .regex(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' }),

    // ─────────────────────────────────────────────────────────────────────────────
    // ROLE (optional, defaults to DEVELOPER)
    // ─────────────────────────────────────────────────────────────────────────────
    role: RoleEnum.default('DEVELOPER'),

    // ─────────────────────────────────────────────────────────────────────────────
    // PROFILE FIELDS (optional)
    // ─────────────────────────────────────────────────────────────────────────────
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    avatar: z.string().url().optional(),
});

/**
 * TypeScript type inferred from schema
 * This ensures type safety throughout the codebase
 */
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/**
 * Schema for updating an existing user
 * All fields are optional (partial update)
 */
export const UpdateUserSchema = z.object({
    username: z.string()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_]+$/)
        .optional(),
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    avatar: z.string().url().optional(),
    role: RoleEnum.optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

/**
 * Schema for user ID in URL params
 */
export const UserIdParamSchema = z.object({
    id: z.string().length(24, { message: 'Invalid user ID format' }),  // MongoDB ObjectId is 24 chars
});

export type UserIdParam = z.infer<typeof UserIdParamSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS (For listing/filtering)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for query parameters when listing users
 * Used in: GET /api/v1/users?role=DEVELOPER&page=1
 */
export const QueryUsersSchema = z.object({
    // Pagination
    page: z.string()
        .transform((val) => Math.max(1, parseInt(val, 10) || 1))
        .default('1'),
    limit: z.string()
        .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10)))
        .default('10'),

    // Filters
    role: RoleEnum.optional(),
    search: z.string().max(100).optional(),  // Search by username or email

    // Sorting
    sortBy: z.enum(['createdAt', 'username', 'email']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryUsersInput = z.infer<typeof QueryUsersSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE SCHEMAS (What we send back to client)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for user data in API responses
 * IMPORTANT: Never include passwordHash in responses!
 */
export const UserResponseSchema = z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    role: RoleEnum,
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    avatar: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),         // ISO 8601 date string
    updatedAt: z.string(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

/**
 * Paginated response wrapper
 */
export const PaginatedUsersSchema = z.object({
    data: z.array(UserResponseSchema),
    meta: z.object({
        total: z.number(),           // Total matching records
        page: z.number(),            // Current page
        limit: z.number(),           // Records per page
        totalPages: z.number(),      // Total number of pages
    }),
});

export type PaginatedUsersResponse = z.infer<typeof PaginatedUsersSchema>;
