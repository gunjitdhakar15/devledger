/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROJECT SERVICE - Business Logic Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ProjectRepository, ProjectDTO, PaginatedResult } from './project.repository.js';
import { UserRepository } from '../users/user.repository.js';
import type { CreateProjectInput, UpdateProjectInput, QueryProjectsInput } from './project.schema.js';
import { ForbiddenError, BadRequestError } from '../../common/errors/index.js';

export class ProjectService {
    constructor(
        private readonly projectRepo: ProjectRepository,
        private readonly userRepo: UserRepository
    ) { }

    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────────

    async createProject(data: CreateProjectInput, ownerId: string): Promise<ProjectDTO> {
        // Validate all member IDs exist
        if (data.members && data.members.length > 0) {
            for (const memberId of data.members) {
                const user = await this.userRepo.findById(memberId);
                if (!user) {
                    throw new BadRequestError(`User with ID ${memberId} not found`);
                }
            }
        }

        return this.projectRepo.create(data, ownerId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────────

    async getProjectById(id: string, requesterId: string, requesterRole: string): Promise<ProjectDTO> {
        const project = await this.projectRepo.findByIdOrFail(id);

        // RBAC: Only owner, members, or admin/manager can view
        if (requesterRole !== 'ADMIN' && requesterRole !== 'MANAGER') {
            const isOwner = project.ownerId === requesterId;
            const isMember = project.members.some((m) => m.id === requesterId);

            if (!isOwner && !isMember) {
                throw new ForbiddenError('You do not have access to this project');
            }
        }

        return project;
    }

    async listProjects(
        query: QueryProjectsInput,
        requesterId: string,
        requesterRole: string
    ): Promise<PaginatedResult<ProjectDTO>> {
        // Admin/Manager can see all projects
        if (requesterRole === 'ADMIN' || requesterRole === 'MANAGER') {
            return this.projectRepo.findAll(query);
        }

        // Regular users only see their own projects
        return this.projectRepo.findAll(query, requesterId);
    }

    async getDashboardStats(userId: string) {
        return this.projectRepo.getStats(userId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────────

    async updateProject(
        id: string,
        data: UpdateProjectInput,
        requesterId: string,
        requesterRole: string
    ): Promise<ProjectDTO> {
        const project = await this.projectRepo.findByIdOrFail(id);

        // Only owner or admin can update
        if (project.ownerId !== requesterId && requesterRole !== 'ADMIN') {
            throw new ForbiddenError('Only the project owner can update this project');
        }

        // Validate new members if provided
        if (data.members && data.members.length > 0) {
            for (const memberId of data.members) {
                const user = await this.userRepo.findById(memberId);
                if (!user) {
                    throw new BadRequestError(`User with ID ${memberId} not found`);
                }
            }
        }

        return this.projectRepo.update(id, data);
    }

    async addMember(
        projectId: string,
        userId: string,
        requesterId: string,
        requesterRole: string
    ): Promise<ProjectDTO> {
        const project = await this.projectRepo.findByIdOrFail(projectId);

        // Only owner, manager, or admin can add members
        if (
            project.ownerId !== requesterId &&
            requesterRole !== 'ADMIN' &&
            requesterRole !== 'MANAGER'
        ) {
            throw new ForbiddenError('You cannot add members to this project');
        }

        // Validate user exists
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new BadRequestError(`User with ID ${userId} not found`);
        }

        return this.projectRepo.addMember(projectId, userId);
    }

    async removeMember(
        projectId: string,
        userId: string,
        requesterId: string,
        requesterRole: string
    ): Promise<ProjectDTO> {
        const project = await this.projectRepo.findByIdOrFail(projectId);

        // Owner, manager, admin, or self can remove
        const canRemove =
            project.ownerId === requesterId ||
            requesterRole === 'ADMIN' ||
            requesterRole === 'MANAGER' ||
            userId === requesterId;  // User removing themselves

        if (!canRemove) {
            throw new ForbiddenError('You cannot remove members from this project');
        }

        // Can't remove owner from their own project
        if (userId === project.ownerId) {
            throw new BadRequestError('Cannot remove the project owner');
        }

        return this.projectRepo.removeMember(projectId, userId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────────

    async archiveProject(
        id: string,
        requesterId: string,
        requesterRole: string
    ): Promise<ProjectDTO> {
        const project = await this.projectRepo.findByIdOrFail(id);

        // Only owner or admin can archive
        if (project.ownerId !== requesterId && requesterRole !== 'ADMIN') {
            throw new ForbiddenError('Only the project owner can archive this project');
        }

        return this.projectRepo.archive(id);
    }

    async deleteProject(
        id: string,
        requesterId: string,
        requesterRole: string
    ): Promise<void> {
        const project = await this.projectRepo.findByIdOrFail(id);

        // Only admin can permanently delete
        if (requesterRole !== 'ADMIN') {
            throw new ForbiddenError('Only administrators can permanently delete projects');
        }

        await this.projectRepo.hardDelete(id);
    }
}
