/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROJECT SCHEMA - Zod Validation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export const ProjectStatusEnum = z.enum([
    'PLANNING',      // Initial phase
    'ACTIVE',        // In progress
    'ON_HOLD',       // Temporarily paused
    'COMPLETED',     // Successfully finished
    'ARCHIVED',      // No longer active
]);

export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateProjectSchema = z.object({
    name: z.string()
        .min(3, { message: 'Project name must be at least 3 characters' })
        .max(100, { message: 'Project name must not exceed 100 characters' })
        .trim(),

    description: z.string()
        .max(2000, { message: 'Description must not exceed 2000 characters' })
        .optional(),

    status: ProjectStatusEnum.default('PLANNING'),

    startDate: z.string()
        .datetime({ message: 'Invalid date format. Use ISO 8601' })
        .optional(),

    endDate: z.string()
        .datetime({ message: 'Invalid date format. Use ISO 8601' })
        .optional(),

    // Team members (array of user IDs)
    members: z.array(z.string().length(24)).default([]),

    // Project metadata
    tags: z.array(z.string().max(50)).max(20).default([]),

    color: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex code' })
        .default('#6366f1'),  // Default: Indigo
}).refine((data) => {
    // Validate that endDate is after startDate
    if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
}, {
    message: 'End date must be after start date',
    path: ['endDate'],
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
    name: z.string().min(3).max(100).trim().optional(),
    description: z.string().max(2000).optional(),
    status: ProjectStatusEnum.optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    members: z.array(z.string().length(24)).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const ProjectIdParamSchema = z.object({
    id: z.string().length(24, { message: 'Invalid project ID format' }),
});

export type ProjectIdParam = z.infer<typeof ProjectIdParamSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const QueryProjectsSchema = z.object({
    page: z.string()
        .transform((val) => Math.max(1, parseInt(val, 10) || 1))
        .default('1'),
    limit: z.string()
        .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10)))
        .default('10'),

    status: ProjectStatusEnum.optional(),
    search: z.string().max(100).optional(),
    memberId: z.string().length(24).optional(),  // Filter by member

    sortBy: z.enum(['createdAt', 'name', 'startDate', 'endDate']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryProjectsInput = z.infer<typeof QueryProjectsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const ProjectResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: ProjectStatusEnum,
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    ownerId: z.string(),
    members: z.array(z.object({
        id: z.string(),
        username: z.string(),
        avatar: z.string().nullable(),
    })),
    tags: z.array(z.string()),
    color: z.string(),
    taskCount: z.number().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
