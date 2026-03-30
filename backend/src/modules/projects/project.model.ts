/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROJECT MODEL - Mongoose Schema
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PERFORMANCE FEATURES:
 * - Compound indexes for filtered queries
 * - Text index for search
 * - Virtual for task count (computed property)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { ProjectStatus } from './project.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface IProject {
    name: string;
    description?: string;
    status: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    owner: Types.ObjectId;         // User who created the project
    members: Types.ObjectId[];     // Team members
    tags: string[];
    color: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProjectDocument extends IProject, Document { }

export interface IProjectModel extends Model<IProjectDocument> {
    findByOwner(ownerId: string): Promise<IProjectDocument[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

const projectSchema = new Schema<IProjectDocument, IProjectModel>({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        minlength: [3, 'Project name must be at least 3 characters'],
        maxlength: [100, 'Project name must not exceed 100 characters'],
    },

    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description must not exceed 2000 characters'],
    },

    status: {
        type: String,
        enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
        default: 'PLANNING',
        index: true,                 // Fast filtering by status
    },

    startDate: {
        type: Date,
        default: null,
    },

    endDate: {
        type: Date,
        default: null,
    },

    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Project owner is required'],
        index: true,                 // Fast lookup of user's projects
    },

    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],

    tags: [{
        type: String,
        trim: true,
        maxlength: 50,
    }],

    color: {
        type: String,
        default: '#6366f1',          // Indigo
        validate: {
            validator: (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v),
            message: 'Color must be a valid hex code',
        },
    },
}, {
    timestamps: true,

    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            const transformed = ret as unknown as Record<string, unknown>;
            transformed.id = String(transformed._id);
            transformed.ownerId = String(transformed.owner);
            delete transformed._id;
            delete transformed.__v;
            return transformed;
        },
    },

    toObject: {
        virtuals: true,
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * COMPOUND INDEX: For dashboard - "My active projects sorted by date"
 * ESR: owner (Equality) → status (Equality) → createdAt (Sort)
 */
projectSchema.index({ owner: 1, status: 1, createdAt: -1 });

/**
 * COMPOUND INDEX: For member view - "Projects I'm a member of"
 */
projectSchema.index({ members: 1, status: 1, createdAt: -1 });

/**
 * TEXT INDEX: For project search
 */
projectSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text',
}, {
    weights: {
        name: 10,
        tags: 5,
        description: 1,
    },
    name: 'project_text_search',
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

projectSchema.statics.findByOwner = function (ownerId: string) {
    return this.find({ owner: new mongoose.Types.ObjectId(ownerId) });
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ProjectModel = (mongoose.models.Project as IProjectModel) ||
    mongoose.model<IProjectDocument, IProjectModel>('Project', projectSchema);
