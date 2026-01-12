/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TASK ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { TaskService } from './task.service.js';
import { TaskRepository } from './task.repository.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { authorize } from '../../common/guards/rbac.guard.js';
import {
    CreateTaskSchema,
    UpdateTaskSchema,
    TaskIdParamSchema,
    QueryTasksSchema,
    type CreateTaskInput,
    type UpdateTaskInput,
    type TaskIdParam,
    type QueryTasksInput,
} from './task.schema.js';
import { z } from 'zod';

export async function taskRoutes(
    fastify: FastifyInstance,
    _options: FastifyPluginOptions
): Promise<void> {
    // Dependency injection
    const taskRepo = new TaskRepository();
    const projectRepo = new ProjectRepository();
    const userRepo = new UserRepository();
    const taskService = new TaskService(taskRepo, projectRepo, userRepo);

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /tasks - List tasks
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get<{ Querystring: QueryTasksInput }>('/', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'List tasks with filtering and pagination',
            tags: ['tasks'],
            querystring: QueryTasksSchema,
        },
    }, async (request, reply) => {
        const result = await taskService.listTasks(
            request.query,
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            data: result.data,
            meta: result.meta,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /tasks/my - My assigned tasks
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get('/my', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get tasks assigned to current user',
            tags: ['tasks'],
            querystring: QueryTasksSchema.omit({ assigneeId: true }),
        },
    }, async (request, reply) => {
        const result = await taskService.getMyTasks(
            request.query as Omit<QueryTasksInput, 'assigneeId'>,
            request.user!.id
        );

        reply.send({
            success: true,
            data: result.data,
            meta: result.meta,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /tasks/stats - Dashboard statistics
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get<{ Querystring: { projectId?: string } }>('/stats', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get task statistics for dashboard',
            tags: ['tasks'],
            querystring: z.object({
                projectId: z.string().length(24).optional(),
            }),
        },
    }, async (request, reply) => {
        const stats = await taskService.getStats(request.query.projectId);

        reply.send({
            success: true,
            data: stats,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /tasks - Create task
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post<{ Body: CreateTaskInput }>('/', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Create a new task',
            tags: ['tasks'],
            body: CreateTaskSchema,
        },
    }, async (request, reply) => {
        const task = await taskService.createTask(
            request.body,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'CREATE',
            resource: 'task',
            resourceId: task.id,
        };

        reply.status(201).send({
            success: true,
            data: task,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /tasks/:id - Get task by ID
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get<{ Params: TaskIdParam }>('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get task by ID',
            tags: ['tasks'],
            params: TaskIdParamSchema,
        },
    }, async (request, reply) => {
        const task = await taskService.getTaskById(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            data: task,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // PUT /tasks/:id - Update task
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.put<{ Params: TaskIdParam; Body: UpdateTaskInput }>('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Update task',
            tags: ['tasks'],
            params: TaskIdParamSchema,
            body: UpdateTaskSchema,
        },
    }, async (request, reply) => {
        // Capture old state for audit
        const oldTask = await taskService.getTaskById(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'UPDATE',
            resource: 'task',
            resourceId: request.params.id,
            oldValue: oldTask as unknown as Record<string, unknown>,
        };

        const task = await taskService.updateTask(
            request.params.id,
            request.body,
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            data: task,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // PATCH /tasks/:id/status - Quick status update (for drag-drop)
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.patch<{
        Params: TaskIdParam;
        Body: { status: string }
    }>('/:id/status', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Quick status update for task',
            tags: ['tasks'],
            params: TaskIdParamSchema,
            body: z.object({
                status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']),
            }),
        },
    }, async (request, reply) => {
        const oldTask = await taskService.getTaskById(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'UPDATE',
            resource: 'task',
            resourceId: request.params.id,
            oldValue: { status: oldTask.status },
            metadata: { action: 'STATUS_CHANGE' },
        };

        const task = await taskService.updateTask(
            request.params.id,
            { status: request.body.status as UpdateTaskInput['status'] },
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            data: task,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /tasks/bulk-status - Bulk status update
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post<{
        Body: { ids: string[]; status: string }
    }>('/bulk-status', {
        preHandler: [
            fastify.authenticate,
            authorize('ADMIN', 'MANAGER'),
        ],
        schema: {
            description: 'Bulk update task status',
            tags: ['tasks'],
            body: z.object({
                ids: z.array(z.string().length(24)).min(1).max(50),
                status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']),
            }),
        },
    }, async (request, reply) => {
        const count = await taskService.bulkUpdateStatus(
            request.body.ids,
            request.body.status,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'UPDATE',
            resource: 'task',
            resourceId: request.body.ids.join(','),
            metadata: {
                action: 'BULK_STATUS_UPDATE',
                count,
                newStatus: request.body.status,
            },
        };

        reply.send({
            success: true,
            message: `Updated ${count} tasks`,
            data: { updatedCount: count },
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE /tasks/:id - Delete task
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.delete<{ Params: TaskIdParam }>('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Delete task',
            tags: ['tasks'],
            params: TaskIdParamSchema,
        },
    }, async (request, reply) => {
        const oldTask = await taskService.getTaskById(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'DELETE',
            resource: 'task',
            resourceId: request.params.id,
            oldValue: oldTask as unknown as Record<string, unknown>,
        };

        await taskService.deleteTask(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            message: 'Task deleted successfully',
        });
    });
}
