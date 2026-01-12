/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROJECT ROUTES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { ProjectService } from './project.service.js';
import { ProjectRepository } from './project.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { authorize } from '../../common/guards/rbac.guard.js';
import {
    CreateProjectSchema,
    UpdateProjectSchema,
    ProjectIdParamSchema,
    QueryProjectsSchema,
    type CreateProjectInput,
    type UpdateProjectInput,
    type ProjectIdParam,
    type QueryProjectsInput,
} from './project.schema.js';
import { z } from 'zod';

export async function projectRoutes(
    fastify: FastifyInstance,
    _options: FastifyPluginOptions
): Promise<void> {
    // Dependency injection
    const projectRepo = new ProjectRepository();
    const userRepo = new UserRepository();
    const projectService = new ProjectService(projectRepo, userRepo);

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /projects - List projects
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get<{ Querystring: QueryProjectsInput }>('/', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'List projects (filtered by access)',
            tags: ['projects'],
            querystring: QueryProjectsSchema,
        },
    }, async (request, reply) => {
        const result = await projectService.listProjects(
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
    // GET /projects/stats - Dashboard statistics
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get('/stats', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get project statistics for dashboard',
            tags: ['projects'],
        },
    }, async (request, reply) => {
        const stats = await projectService.getDashboardStats(request.user!.id);

        reply.send({
            success: true,
            data: stats,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /projects - Create project
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post<{ Body: CreateProjectInput }>('/', {
        preHandler: [
            fastify.authenticate,
            authorize('ADMIN', 'MANAGER', 'DEVELOPER'),
        ],
        schema: {
            description: 'Create a new project',
            tags: ['projects'],
            body: CreateProjectSchema,
        },
    }, async (request, reply) => {
        const project = await projectService.createProject(
            request.body,
            request.user!.id
        );

        request.audit = {
            action: 'CREATE',
            resource: 'project',
            resourceId: project.id,
        };

        reply.status(201).send({
            success: true,
            data: project,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // GET /projects/:id - Get project by ID
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.get<{ Params: ProjectIdParam }>('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get project by ID',
            tags: ['projects'],
            params: ProjectIdParamSchema,
        },
    }, async (request, reply) => {
        const project = await projectService.getProjectById(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            data: project,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // PUT /projects/:id - Update project
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.put<{ Params: ProjectIdParam; Body: UpdateProjectInput }>('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Update project',
            tags: ['projects'],
            params: ProjectIdParamSchema,
            body: UpdateProjectSchema,
        },
    }, async (request, reply) => {
        // Capture old state for audit
        const oldProject = await projectService.getProjectById(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'UPDATE',
            resource: 'project',
            resourceId: request.params.id,
            oldValue: oldProject as unknown as Record<string, unknown>,
        };

        const project = await projectService.updateProject(
            request.params.id,
            request.body,
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            data: project,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // POST /projects/:id/members - Add member
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.post<{
        Params: ProjectIdParam;
        Body: { userId: string }
    }>('/:id/members', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Add member to project',
            tags: ['projects'],
            params: ProjectIdParamSchema,
            body: z.object({ userId: z.string().length(24) }),
        },
    }, async (request, reply) => {
        const project = await projectService.addMember(
            request.params.id,
            request.body.userId,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'UPDATE',
            resource: 'project',
            resourceId: request.params.id,
            metadata: { action: 'ADD_MEMBER', userId: request.body.userId },
        };

        reply.send({
            success: true,
            data: project,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE /projects/:id/members/:userId - Remove member
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.delete<{
        Params: ProjectIdParam & { userId: string }
    }>('/:id/members/:userId', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Remove member from project',
            tags: ['projects'],
        },
    }, async (request, reply) => {
        const project = await projectService.removeMember(
            request.params.id,
            request.params.userId,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'UPDATE',
            resource: 'project',
            resourceId: request.params.id,
            metadata: { action: 'REMOVE_MEMBER', userId: request.params.userId },
        };

        reply.send({
            success: true,
            data: project,
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE /projects/:id - Archive project
    // ─────────────────────────────────────────────────────────────────────────────
    fastify.delete<{ Params: ProjectIdParam }>('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Archive project (soft delete)',
            tags: ['projects'],
            params: ProjectIdParamSchema,
        },
    }, async (request, reply) => {
        const oldProject = await projectService.getProjectById(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        request.audit = {
            action: 'DELETE',
            resource: 'project',
            resourceId: request.params.id,
            oldValue: oldProject as unknown as Record<string, unknown>,
        };

        const project = await projectService.archiveProject(
            request.params.id,
            request.user!.id,
            request.user!.role
        );

        reply.send({
            success: true,
            data: project,
            message: 'Project archived successfully',
        });
    });
}
