/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TASK MODEL - Mongoose Schema with Performance Optimizations
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INDEX STRATEGY (ESR Rule - Equality, Sort, Range):
 * 
 * Main Dashboard Query: "Show all HIGH priority tasks for Project X, TODO status, sorted by due date"
 * Optimal Index: { projectId: 1, status: 1, priority: 1, dueDate: 1 }
 * 
 * Assignee View: "My tasks across all projects, sorted by due date"
 * Optimal Index: { assignee: 1, status: 1, dueDate: 1 }
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { TaskStatus, TaskPriority } from './task.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ISubtask {
    title: string;
    completed: boolean;
}

export interface ITask {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    project: Types.ObjectId;
    creator: Types.ObjectId;
    assignee?: Types.ObjectId;
    dueDate?: Date;
    estimatedHours?: number;
    actualHours?: number;
    tags: string[];
    subtasks: ISubtask[];
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document { }

export interface ITaskModel extends Model<ITaskDocument> { }

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

const subtaskSchema = new Schema<ISubtask>({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    completed: {
        type: Boolean,
        default: false,
    },
}, { _id: false });  // No _id for subdocuments

const taskSchema = new Schema<ITaskDocument, ITaskModel>({
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        minlength: [3, 'Task title must be at least 3 characters'],
        maxlength: [200, 'Task title must not exceed 200 characters'],
    },

    description: {
        type: String,
        trim: true,
        maxlength: [5000, 'Description must not exceed 5000 characters'],
    },

    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
        default: 'TODO',
        index: true,
    },

    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        default: 'MEDIUM',
        index: true,
    },

    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Task must belong to a project'],
        index: true,
    },

    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Task must have a creator'],
    },

    assignee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,  // Frequently filter by assignee
    },

    dueDate: {
        type: Date,
        default: null,
        index: true,  // For overdue queries
    },

    estimatedHours: {
        type: Number,
        min: 0.25,
        max: 1000,
    },

    actualHours: {
        type: Number,
        min: 0,
        default: 0,
    },

    tags: [{
        type: String,
        trim: true,
        maxlength: 50,
    }],

    subtasks: [subtaskSchema],

    completedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,

    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            ret.projectId = ret.project?.toString();
            ret.creatorId = ret.creator?.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },

    toObject: {
        virtuals: true,
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES (Critical for Dashboard Performance)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PRIMARY COMPOUND INDEX
 * Supports: "Tasks in Project X with status TODO, sorted by priority then due date"
 * 
 * ESR Analysis:
 * - Equality: projectId, status
 * - Sort: priority, dueDate
 */
taskSchema.index({ project: 1, status: 1, priority: -1, dueDate: 1 });

/**
 * ASSIGNEE INDEX
 * Supports: "My tasks (across all projects) sorted by due date"
 */
taskSchema.index({ assignee: 1, status: 1, dueDate: 1 });

/**
 * OVERDUE TASKS INDEX
 * Supports: "All overdue tasks for a project"
 */
taskSchema.index({ project: 1, dueDate: 1, status: 1 });

/**
 * RECENT ACTIVITY INDEX
 * Supports: "Recently updated tasks"
 */
taskSchema.index({ project: 1, updatedAt: -1 });

/**
 * TEXT INDEX for search
 */
taskSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text',
}, {
    weights: {
        title: 10,
        tags: 5,
        description: 1,
    },
    name: 'task_text_search',
});

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-set completedAt when status changes to DONE
 */
taskSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        if (this.status === 'DONE' && !this.completedAt) {
            this.completedAt = new Date();
        } else if (this.status !== 'DONE') {
            this.completedAt = undefined;
        }
    }
    next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Virtual: isOverdue
 */
taskSchema.virtual('isOverdue').get(function (this: ITaskDocument) {
    if (!this.dueDate || this.status === 'DONE') {
        return false;
    }
    return new Date() > this.dueDate;
});

/**
 * Virtual: progress (based on subtasks)
 */
taskSchema.virtual('progress').get(function (this: ITaskDocument) {
    if (!this.subtasks || this.subtasks.length === 0) {
        return this.status === 'DONE' ? 100 : 0;
    }
    const completed = this.subtasks.filter((s) => s.completed).length;
    return Math.round((completed / this.subtasks.length) * 100);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const TaskModel = (mongoose.models.Task as ITaskModel) ||
    mongoose.model<ITaskDocument, ITaskModel>('Task', taskSchema);
