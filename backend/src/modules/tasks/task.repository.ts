/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TASK REPOSITORY - High-Performance Data Access Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * KEY OPTIMIZATIONS:
 * 1. .lean() for all read operations (3-5x faster)
 * 2. $facet for dashboard stats (single query for multiple aggregations)
 * 3. Proper projection to fetch only needed fields
 * 4. Parallel execution of count + find
 */

import mongoose from 'mongoose';
import { TaskModel, ITaskDocument } from './task.model.js';
import type { CreateTaskInput, UpdateTaskInput, QueryTasksInput, TaskStats } from './task.schema.js';
import { NotFoundError } from '../../common/errors/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TaskDTO {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    projectId: string;
    projectName?: string;
    creatorId: string;
    assignee: {
        id: string;
        username: string;
        avatar: string | null;
    } | null;
    dueDate: Date | null;
    estimatedHours: number | null;
    actualHours: number | null;
    tags: string[];
    subtasks: Array<{ title: string; completed: boolean }>;
    completedAt: Date | null;
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

export class TaskRepository {

    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────────

    async create(data: CreateTaskInput, creatorId: string): Promise<TaskDTO> {
        const task = await TaskModel.create({
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            project: new mongoose.Types.ObjectId(data.projectId),
            creator: new mongoose.Types.ObjectId(creatorId),
            assignee: data.assigneeId ? new mongoose.Types.ObjectId(data.assigneeId) : undefined,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            estimatedHours: data.estimatedHours,
            tags: data.tags,
            subtasks: data.subtasks,
        });

        await task.populate('assignee', 'username avatar');
        return this.toDTO(task);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────────

    async findById(id: string): Promise<TaskDTO | null> {
        const task = await TaskModel.findById(id)
            .populate('assignee', 'username avatar')
            .populate('project', 'name')
            .lean();

        return task ? this.leanToDTO(task) : null;
    }

    async findByIdOrFail(id: string): Promise<TaskDTO> {
        const task = await this.findById(id);
        if (!task) {
            throw new NotFoundError(`Task with ID ${id} not found`);
        }
        return task;
    }

    /**
     * Find tasks with advanced filtering
     * 
     * Uses compound indexes for optimal performance
     */
    async findAll(query: QueryTasksInput): Promise<PaginatedResult<TaskDTO>> {
        const {
            page, limit, projectId, status, priority, assigneeId,
            search, dueBefore, dueAfter, overdue, sortBy, sortOrder
        } = query;
        const skip = (page - 1) * limit;

        // Build filter
        const filter: Record<string, unknown> = {};

        if (projectId) {
            filter.project = new mongoose.Types.ObjectId(projectId);
        }

        if (status) {
            filter.status = status;
        }

        if (priority) {
            filter.priority = priority;
        }

        if (assigneeId) {
            filter.assignee = new mongoose.Types.ObjectId(assigneeId);
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // Date range filters
        if (dueBefore || dueAfter) {
            filter.dueDate = {};
            if (dueBefore) {
                (filter.dueDate as Record<string, unknown>).$lte = new Date(dueBefore);
            }
            if (dueAfter) {
                (filter.dueDate as Record<string, unknown>).$gte = new Date(dueAfter);
            }
        }

        // Overdue filter
        if (overdue) {
            filter.dueDate = { $lt: new Date() };
            filter.status = { $ne: 'DONE' };
        }

        // Build sort (handle priority special case)
        let sort: Record<string, 1 | -1>;
        if (sortBy === 'priority') {
            // Custom priority sort order: URGENT > HIGH > MEDIUM > LOW
            // We'll handle this with aggregation if needed, or use numeric mapping
            sort = { priority: sortOrder === 'asc' ? 1 : -1 };
        } else {
            sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        }

        // Parallel execution for performance
        const [total, tasks] = await Promise.all([
            TaskModel.countDocuments(filter),
            TaskModel.find(filter)
                .populate('assignee', 'username avatar')
                .populate('project', 'name')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            data: tasks.map((t) => this.leanToDTO(t)),
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

    async update(id: string, data: UpdateTaskInput): Promise<TaskDTO> {
        const updateData: Record<string, unknown> = { ...data };

        // Handle special fields
        if ('assigneeId' in data) {
            updateData.assignee = data.assigneeId
                ? new mongoose.Types.ObjectId(data.assigneeId)
                : null;
            delete updateData.assigneeId;
        }

        if (data.dueDate !== undefined) {
            updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        }

        // Handle status change → completedAt
        if (data.status === 'DONE') {
            updateData.completedAt = new Date();
        } else if (data.status && data.status !== 'DONE') {
            updateData.completedAt = null;
        }

        const task = await TaskModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate('assignee', 'username avatar')
            .populate('project', 'name')
            .lean();

        if (!task) {
            throw new NotFoundError(`Task with ID ${id} not found`);
        }

        return this.leanToDTO(task);
    }

    /**
     * Bulk update task status (for drag-and-drop)
     */
    async bulkUpdateStatus(ids: string[], status: string): Promise<number> {
        const result = await TaskModel.updateMany(
            { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
            {
                $set: {
                    status,
                    completedAt: status === 'DONE' ? new Date() : null,
                }
            }
        );
        return result.modifiedCount;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────────

    async delete(id: string): Promise<void> {
        const result = await TaskModel.findByIdAndDelete(id);
        if (!result) {
            throw new NotFoundError(`Task with ID ${id} not found`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DASHBOARD ANALYTICS - The Star Feature
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get comprehensive task statistics using $facet
     * 
     * $FACET EXPLAINED:
     * - Runs MULTIPLE aggregation pipelines on the SAME dataset
     * - Single database query instead of 5 separate queries
     * - Massive performance improvement for dashboards
     */
    async getStats(projectId?: string): Promise<TaskStats> {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Build initial match
        const match: Record<string, unknown> = {};
        if (projectId) {
            match.project = new mongoose.Types.ObjectId(projectId);
        }

        const result = await TaskModel.aggregate([
            // Initial filter (optional project filter)
            { $match: match },

            // Run multiple pipelines in parallel
            {
                $facet: {
                    // ─── Total count ─────────────────────────────────────────────────
                    total: [{ $count: 'count' }],

                    // ─── Count by status ─────────────────────────────────────────────
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } },
                    ],

                    // ─── Count by priority ───────────────────────────────────────────
                    byPriority: [
                        { $group: { _id: '$priority', count: { $sum: 1 } } },
                    ],

                    // ─── Overdue tasks ───────────────────────────────────────────────
                    overdue: [
                        {
                            $match: {
                                dueDate: { $lt: now },
                                status: { $ne: 'DONE' },
                            }
                        },
                        { $count: 'count' },
                    ],

                    // ─── Completed this week ─────────────────────────────────────────
                    completedThisWeek: [
                        {
                            $match: {
                                status: 'DONE',
                                completedAt: { $gte: weekAgo },
                            }
                        },
                        { $count: 'count' },
                    ],

                    // ─── Average completion time (hours) ─────────────────────────────
                    avgCompletionTime: [
                        {
                            $match: {
                                status: 'DONE',
                                completedAt: { $exists: true },
                                createdAt: { $exists: true },
                            }
                        },
                        {
                            $project: {
                                completionHours: {
                                    $divide: [
                                        { $subtract: ['$completedAt', '$createdAt'] },
                                        1000 * 60 * 60,  // Convert ms to hours
                                    ],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                avg: { $avg: '$completionHours' },
                            },
                        },
                    ],
                },
            },
        ]);

        const stats = result[0];

        return {
            total: stats.total[0]?.count || 0,
            byStatus: Object.fromEntries(
                stats.byStatus.map((s: { _id: string; count: number }) => [s._id, s.count])
            ),
            byPriority: Object.fromEntries(
                stats.byPriority.map((p: { _id: string; count: number }) => [p._id, p.count])
            ),
            overdue: stats.overdue[0]?.count || 0,
            completedThisWeek: stats.completedThisWeek[0]?.count || 0,
            avgCompletionTime: stats.avgCompletionTime[0]?.avg
                ? Math.round(stats.avgCompletionTime[0].avg * 10) / 10
                : null,
        };
    }

    /**
     * Get recent activity for a project
     */
    async getRecentActivity(projectId: string, limit: number = 10): Promise<TaskDTO[]> {
        const tasks = await TaskModel.find({ project: new mongoose.Types.ObjectId(projectId) })
            .populate('assignee', 'username avatar')
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean();

        return tasks.map((t) => this.leanToDTO(t));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────────

    private toDTO(task: ITaskDocument): TaskDTO {
        const obj = task.toJSON();
        return this.formatDTO(obj);
    }

    private leanToDTO(task: Record<string, unknown>): TaskDTO {
        return this.formatDTO(task);
    }

    private formatDTO(task: Record<string, unknown>): TaskDTO {
        const assignee = task.assignee as Record<string, unknown> | null;
        const project = task.project as Record<string, unknown> | null;

        return {
            id: String(task._id || task.id),
            title: task.title as string,
            description: (task.description as string) || null,
            status: task.status as string,
            priority: task.priority as string,
            projectId: String(project?._id || task.project),
            projectName: project?.name as string | undefined,
            creatorId: String(task.creator),
            assignee: assignee ? {
                id: String(assignee._id),
                username: assignee.username as string,
                avatar: (assignee.avatar as string) || null,
            } : null,
            dueDate: (task.dueDate as Date) || null,
            estimatedHours: (task.estimatedHours as number) || null,
            actualHours: (task.actualHours as number) || null,
            tags: (task.tags as string[]) || [],
            subtasks: (task.subtasks as Array<{ title: string; completed: boolean }>) || [],
            completedAt: (task.completedAt as Date) || null,
            createdAt: task.createdAt as Date,
            updatedAt: task.updatedAt as Date,
        };
    }
}
