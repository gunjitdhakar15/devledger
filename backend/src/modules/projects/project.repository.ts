/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROJECT REPOSITORY - Data Access Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - .lean() for read operations
 * - Aggregation pipelines for dashboard stats
 * - Populate only needed fields
 */

import mongoose from 'mongoose';
import { ProjectModel, IProjectDocument } from './project.model.js';
import type { CreateProjectInput, UpdateProjectInput, QueryProjectsInput } from './project.schema.js';
import { NotFoundError } from '../../common/errors/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectDTO {
    id: string;
    name: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    ownerId: string;
    members: Array<{
        id: string;
        username: string;
        avatar: string | null;
    }>;
    tags: string[];
    color: string;
    taskCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

export class ProjectRepository {

    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────────

    async create(data: CreateProjectInput, ownerId: string): Promise<ProjectDTO> {
        const project = await ProjectModel.create({
            ...data,
            owner: new mongoose.Types.ObjectId(ownerId),
            members: data.members?.map((id) => new mongoose.Types.ObjectId(id)) || [],
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
        });

        // Populate members for response
        await project.populate('members', 'username avatar');
        return this.toDTO(project);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────────

    async findById(id: string): Promise<ProjectDTO | null> {
        const project = await ProjectModel.findById(id)
            .populate('members', 'username avatar')
            .lean();

        return project ? this.leanToDTO(project) : null;
    }

    async findByIdOrFail(id: string): Promise<ProjectDTO> {
        const project = await this.findById(id);
        if (!project) {
            throw new NotFoundError(`Project with ID ${id} not found`);
        }
        return project;
    }

    /**
     * Find all projects with pagination and filtering
     * 
     * PERFORMANCE:
     * - Uses compound index on { owner, status, createdAt }
     * - Parallel execution of count and find
     */
    async findAll(query: QueryProjectsInput, userId?: string): Promise<PaginatedResult<ProjectDTO>> {
        const { page, limit, status, search, memberId, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        // Build filter
        const filter: Record<string, unknown> = {};

        if (status) {
            filter.status = status;
        }

        if (memberId) {
            filter.$or = [
                { owner: new mongoose.Types.ObjectId(memberId) },
                { members: new mongoose.Types.ObjectId(memberId) },
            ];
        } else if (userId) {
            // Show projects where user is owner or member
            filter.$or = [
                { owner: new mongoose.Types.ObjectId(userId) },
                { members: new mongoose.Types.ObjectId(userId) },
            ];
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // Build sort
        const sort: Record<string, 1 | -1> = {
            [sortBy]: sortOrder === 'asc' ? 1 : -1,
        };

        // Parallel execution
        const [total, projects] = await Promise.all([
            ProjectModel.countDocuments(filter),
            ProjectModel.find(filter)
                .populate('members', 'username avatar')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            data: projects.map((p) => this.leanToDTO(p)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────────

    async update(id: string, data: UpdateProjectInput): Promise<ProjectDTO> {
        const updateData: Record<string, unknown> = { ...data };

        if (data.members) {
            updateData.members = data.members.map((m) => new mongoose.Types.ObjectId(m));
        }
        if (data.startDate) {
            updateData.startDate = new Date(data.startDate);
        }
        if (data.endDate) {
            updateData.endDate = new Date(data.endDate);
        }

        const project = await ProjectModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate('members', 'username avatar')
            .lean();

        if (!project) {
            throw new NotFoundError(`Project with ID ${id} not found`);
        }

        return this.leanToDTO(project);
    }

    /**
     * Add member to project
     */
    async addMember(projectId: string, userId: string): Promise<ProjectDTO> {
        const project = await ProjectModel.findByIdAndUpdate(
            projectId,
            { $addToSet: { members: new mongoose.Types.ObjectId(userId) } },
            { new: true }
        )
            .populate('members', 'username avatar')
            .lean();

        if (!project) {
            throw new NotFoundError(`Project with ID ${projectId} not found`);
        }

        return this.leanToDTO(project);
    }

    /**
     * Remove member from project
     */
    async removeMember(projectId: string, userId: string): Promise<ProjectDTO> {
        const project = await ProjectModel.findByIdAndUpdate(
            projectId,
            { $pull: { members: new mongoose.Types.ObjectId(userId) } },
            { new: true }
        )
            .populate('members', 'username avatar')
            .lean();

        if (!project) {
            throw new NotFoundError(`Project with ID ${projectId} not found`);
        }

        return this.leanToDTO(project);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────────

    async archive(id: string): Promise<ProjectDTO> {
        const project = await ProjectModel.findByIdAndUpdate(
            id,
            { $set: { status: 'ARCHIVED' } },
            { new: true }
        )
            .populate('members', 'username avatar')
            .lean();

        if (!project) {
            throw new NotFoundError(`Project with ID ${id} not found`);
        }

        return this.leanToDTO(project);
    }

    async hardDelete(id: string): Promise<void> {
        const result = await ProjectModel.findByIdAndDelete(id);
        if (!result) {
            throw new NotFoundError(`Project with ID ${id} not found`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DASHBOARD ANALYTICS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get project statistics for a user
     * Uses $facet for efficient multiple aggregations
     */
    async getStats(userId: string): Promise<{
        totalProjects: number;
        byStatus: Record<string, number>;
        recentProjects: ProjectDTO[];
    }> {
        const userOid = new mongoose.Types.ObjectId(userId);

        const result = await ProjectModel.aggregate([
            // Match projects where user is owner or member
            {
                $match: {
                    $or: [
                        { owner: userOid },
                        { members: userOid },
                    ],
                },
            },
            // Run multiple pipelines in parallel
            {
                $facet: {
                    // Total count
                    total: [{ $count: 'count' }],

                    // Count by status
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } },
                    ],

                    // Recent projects
                    recent: [
                        { $sort: { updatedAt: -1 } },
                        { $limit: 5 },
                        { $project: { name: 1, status: 1, color: 1, updatedAt: 1 } },
                    ],
                },
            },
        ]);

        const stats = result[0];

        return {
            totalProjects: stats.total[0]?.count || 0,
            byStatus: Object.fromEntries(
                stats.byStatus.map((s: { _id: string; count: number }) => [s._id, s.count])
            ),
            recentProjects: stats.recent.map((p: Record<string, unknown>) => ({
                id: String(p._id),
                name: p.name,
                status: p.status,
                color: p.color,
                updatedAt: p.updatedAt,
            })) as ProjectDTO[],
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    private toDTO(project: IProjectDocument): ProjectDTO {
        const obj = project.toJSON();
        return {
            id: obj.id,
            name: obj.name,
            description: obj.description || null,
            status: obj.status,
            startDate: obj.startDate || null,
            endDate: obj.endDate || null,
            ownerId: obj.ownerId,
            members: (obj.members || []).map((m: Record<string, unknown>) => ({
                id: String(m._id || m.id),
                username: m.username as string,
                avatar: (m.avatar as string) || null,
            })),
            tags: obj.tags || [],
            color: obj.color,
            createdAt: obj.createdAt,
            updatedAt: obj.updatedAt,
        };
    }

    private leanToDTO(project: Record<string, unknown>): ProjectDTO {
        return {
            id: String(project._id),
            name: project.name as string,
            description: (project.description as string) || null,
            status: project.status as string,
            startDate: (project.startDate as Date) || null,
            endDate: (project.endDate as Date) || null,
            ownerId: String(project.owner),
            members: ((project.members as Record<string, unknown>[]) || []).map((m) => ({
                id: String(m._id),
                username: m.username as string,
                avatar: (m.avatar as string) || null,
            })),
            tags: (project.tags as string[]) || [],
            color: project.color as string,
            createdAt: project.createdAt as Date,
            updatedAt: project.updatedAt as Date,
        };
    }
}
