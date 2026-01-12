/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TASK SERVICE - Business Logic Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { TaskRepository, TaskDTO, PaginatedResult } from './task.repository.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { UserRepository } from '../users/user.repository.js';
import type { CreateTaskInput, UpdateTaskInput, QueryTasksInput, TaskStats } from './task.schema.js';
import { ForbiddenError, BadRequestError } from '../../common/errors/index.js';

export class TaskService {
    constructor(
        private readonly taskRepo: TaskRepository,
        private readonly projectRepo: ProjectRepository,
        private readonly userRepo: UserRepository
    ) { }

    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────────

    async createTask(
        data: CreateTaskInput,
        creatorId: string,
        creatorRole: string
    ): Promise<TaskDTO> {
        // Validate project exists and user has access
        const project = await this.projectRepo.findByIdOrFail(data.projectId);

        // Check if user can create tasks in this project
        if (creatorRole !== 'ADMIN' && creatorRole !== 'MANAGER') {
            const isOwner = project.ownerId === creatorId;
            const isMember = project.members.some((m) => m.id === creatorId);

            if (!isOwner && !isMember) {
                throw new ForbiddenError('You do not have access to this project');
            }
        }

        // Validate assignee if provided
        if (data.assigneeId) {
            const assignee = await this.userRepo.findById(data.assigneeId);
            if (!assignee) {
                throw new BadRequestError(`User with ID ${data.assigneeId} not found`);
            }

            // Assignee should be project member
            const isProjectMember =
                project.ownerId === data.assigneeId ||
                project.members.some((m) => m.id === data.assigneeId);

            if (!isProjectMember && creatorRole !== 'ADMIN') {
                throw new BadRequestError('Assignee must be a project member');
            }
        }

        return this.taskRepo.create(data, creatorId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────────

    async getTaskById(
        id: string,
        requesterId: string,
        requesterRole: string
    ): Promise<TaskDTO> {
        const task = await this.taskRepo.findByIdOrFail(id);

        // Validate access
        const project = await this.projectRepo.findByIdOrFail(task.projectId);

        if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER') {
            const isOwner = project.ownerId === requesterId;
            const isMember = project.members.some((m) => m.id === requesterId);
            const isAssignee = task.assignee?.id === requesterId;

            if (!isOwner && !isMember && !isAssignee) {
                throw new ForbiddenError('You do not have access to this task');
            }
        }

        return task;
    }

    async listTasks(
        query: QueryTasksInput,
        requesterId: string,
        requesterRole: string
    ): Promise<PaginatedResult<TaskDTO>> {
        // If filtering by project, validate access
        if (query.projectId) {
            const project = await this.projectRepo.findByIdOrFail(query.projectId);

            if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER') {
                const isOwner = project.ownerId === requesterId;
                const isMember = project.members.some((m) => m.id === requesterId);

                if (!isOwner && !isMember) {
                    throw new ForbiddenError('You do not have access to this project');
                }
            }
        }

        // If filtering by assignee, allow viewing own tasks
        if (query.assigneeId && query.assigneeId !== requesterId) {
            // Only admin/manager can view other users' tasks
            if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER') {
                throw new ForbiddenError('You can only view your own tasks');
            }
        }

        return this.taskRepo.findAll(query);
    }

    async getMyTasks(
        query: Omit<QueryTasksInput, 'assigneeId'>,
        userId: string
    ): Promise<PaginatedResult<TaskDTO>> {
        return this.taskRepo.findAll({ ...query, assigneeId: userId } as QueryTasksInput);
    }

    async getStats(projectId?: string): Promise<TaskStats> {
        return this.taskRepo.getStats(projectId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────────

    async updateTask(
        id: string,
        data: UpdateTaskInput,
        requesterId: string,
        requesterRole: string
    ): Promise<TaskDTO> {
        const task = await this.taskRepo.findByIdOrFail(id);
        const project = await this.projectRepo.findByIdOrFail(task.projectId);

        // Check permission
        const isOwner = project.ownerId === requesterId;
        const isAssignee = task.assignee?.id === requesterId;
        const isCreator = task.creatorId === requesterId;
        const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'MANAGER';

        if (!isOwner && !isAssignee && !isCreator && !isAdmin) {
            throw new ForbiddenError('You do not have permission to update this task');
        }

        // Regular users can only update status, not reassign
        if (!isOwner && !isAdmin && data.assigneeId !== undefined) {
            throw new ForbiddenError('Only project owner or admin can reassign tasks');
        }

        // Validate new assignee if provided
        if (data.assigneeId) {
            const assignee = await this.userRepo.findById(data.assigneeId);
            if (!assignee) {
                throw new BadRequestError(`User with ID ${data.assigneeId} not found`);
            }
        }

        return this.taskRepo.update(id, data);
    }

    async bulkUpdateStatus(
        ids: string[],
        status: string,
        requesterId: string,
        requesterRole: string
    ): Promise<number> {
        // Validate all tasks exist and user has access
        for (const id of ids) {
            const task = await this.taskRepo.findByIdOrFail(id);
            const project = await this.projectRepo.findByIdOrFail(task.projectId);

            const hasAccess =
                requesterRole === 'ADMIN' ||
                requesterRole === 'MANAGER' ||
                project.ownerId === requesterId ||
                task.assignee?.id === requesterId;

            if (!hasAccess) {
                throw new ForbiddenError(`No permission to update task ${id}`);
            }
        }

        return this.taskRepo.bulkUpdateStatus(ids, status);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────────

    async deleteTask(
        id: string,
        requesterId: string,
        requesterRole: string
    ): Promise<void> {
        const task = await this.taskRepo.findByIdOrFail(id);
        const project = await this.projectRepo.findByIdOrFail(task.projectId);

        // Only project owner, task creator, or admin can delete
        const canDelete =
            requesterRole === 'ADMIN' ||
            project.ownerId === requesterId ||
            task.creatorId === requesterId;

        if (!canDelete) {
            throw new ForbiddenError('You do not have permission to delete this task');
        }

        await this.taskRepo.delete(id);
    }
}
