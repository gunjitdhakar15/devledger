/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TASK SCHEMA - Zod Validation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tasks are the core unit of work in DevLedger.
 * Each task belongs to a project and can be assigned to a user.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export const TaskStatusEnum = z.enum([
    'TODO',           // Not started
    'IN_PROGRESS',    // Currently being worked on
    'IN_REVIEW',      // Awaiting review
    'DONE',           // Completed
    'BLOCKED',        // Blocked by dependency
]);

export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskPriorityEnum = z.enum([
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT',
]);

export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateTaskSchema = z.object({
    // Required fields
    title: z.string()
        .min(3, { message: 'Task title must be at least 3 characters' })
        .max(200, { message: 'Task title must not exceed 200 characters' })
        .trim(),

    projectId: z.string()
        .length(24, { message: 'Invalid project ID format' }),

    // Optional fields
    description: z.string()
        .max(5000, { message: 'Description must not exceed 5000 characters' })
        .optional(),

    status: TaskStatusEnum.default('TODO'),
    priority: TaskPriorityEnum.default('MEDIUM'),

    assigneeId: z.string()
        .length(24, { message: 'Invalid assignee ID format' })
        .optional(),

    dueDate: z.string()
        .datetime({ message: 'Invalid date format. Use ISO 8601' })
        .optional(),

    estimatedHours: z.number()
        .min(0.25, { message: 'Minimum estimate is 0.25 hours' })
        .max(1000, { message: 'Maximum estimate is 1000 hours' })
        .optional(),

    tags: z.array(z.string().max(50)).max(10).default([]),

    // Subtasks (for task breakdown)
    subtasks: z.array(z.object({
        title: z.string().min(1).max(200),
        completed: z.boolean().default(false),
    })).max(20).default([]),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
    title: z.string().min(3).max(200).trim().optional(),
    description: z.string().max(5000).optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    assigneeId: z.string().length(24).nullable().optional(),  // null to unassign
    dueDate: z.string().datetime().nullable().optional(),
    estimatedHours: z.number().min(0.25).max(1000).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    subtasks: z.array(z.object({
        title: z.string().min(1).max(200),
        completed: z.boolean(),
    })).max(20).optional(),
    actualHours: z.number().min(0).optional(),  // For time tracking
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const TaskIdParamSchema = z.object({
    id: z.string().length(24, { message: 'Invalid task ID format' }),
});

export type TaskIdParam = z.infer<typeof TaskIdParamSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const QueryTasksSchema = z.object({
    // Pagination
    page: z.string()
        .transform((val) => Math.max(1, parseInt(val, 10) || 1))
        .default('1'),
    limit: z.string()
        .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20)))
        .default('20'),

    // Filters
    projectId: z.string().length(24).optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    assigneeId: z.string().length(24).optional(),
    search: z.string().max(100).optional(),

    // Date filters
    dueBefore: z.string().datetime().optional(),
    dueAfter: z.string().datetime().optional(),
    overdue: z.string().transform((val) => val === 'true').optional(),

    // Sorting
    sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'status', 'title'])
        .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryTasksInput = z.infer<typeof QueryTasksSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const TaskResponseSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: TaskStatusEnum,
    priority: TaskPriorityEnum,
    projectId: z.string(),
    projectName: z.string().optional(),
    creatorId: z.string(),
    assignee: z.object({
        id: z.string(),
        username: z.string(),
        avatar: z.string().nullable(),
    }).nullable(),
    dueDate: z.string().nullable(),
    estimatedHours: z.number().nullable(),
    actualHours: z.number().nullable(),
    tags: z.array(z.string()),
    subtasks: z.array(z.object({
        title: z.string(),
        completed: z.boolean(),
    })),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type TaskResponse = z.infer<typeof TaskResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const TaskStatsSchema = z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
    byPriority: z.record(z.string(), z.number()),
    overdue: z.number(),
    completedThisWeek: z.number(),
    avgCompletionTime: z.number().nullable(),  // average hours
});

export type TaskStats = z.infer<typeof TaskStatsSchema>;