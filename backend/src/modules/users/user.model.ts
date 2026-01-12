/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER MODEL (Mongoose Schema)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHY SEPARATE FROM ZOD SCHEMA:
 * - Zod schemas validate INCOMING data (API layer)
 * - Mongoose schema defines DATABASE structure and behavior
 * - They serve different purposes but should be aligned
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Compound indexes for common queries
 * 2. Virtuals for computed properties (no storage cost)
 * 3. Transform methods for clean API responses
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import type { Role } from './user.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw user document interface (what's stored in MongoDB)
 */
export interface IUser {
    email: string;
    passwordHash: string;
    username: string;
    role: Role;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    isActive: boolean;
    lastLoginAt?: Date;
    refreshTokenHash?: string;      // Hashed refresh token for rotation
    createdAt: Date;
    updatedAt: Date;
}

/**
 * User document with Mongoose methods
 */
export interface IUserDocument extends IUser, Document {
    // Instance methods
    comparePassword(candidatePassword: string): Promise<boolean>;
    toJSON(): Record<string, unknown>;  // Override to hide passwordHash
}

/**
 * User model with static methods
 */
export interface IUserModel extends Model<IUserDocument> {
    // Static methods
    findByEmail(email: string): Promise<IUserDocument | null>;
    findActiveUsers(): Promise<IUserDocument[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

const userSchema = new Schema<IUserDocument, IUserModel>({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,                 // Creates unique index automatically
        lowercase: true,              // Always store lowercase
        trim: true,
        index: true,                  // Index for fast email lookups (login)
    },

    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        select: false,                // NEVER return password hash by default
    },

    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [50, 'Username must not exceed 50 characters'],
    },

    role: {
        type: String,
        enum: ['ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER'],
        default: 'DEVELOPER',
        index: true,                  // Index for role-based queries
    },

    firstName: {
        type: String,
        trim: true,
        maxlength: 50,
    },

    lastName: {
        type: String,
        trim: true,
        maxlength: 50,
    },

    avatar: {
        type: String,
        default: null,
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true,                  // Index for active user queries
    },

    lastLoginAt: {
        type: Date,
        default: null,
    },

    refreshTokenHash: {
        type: String,
        default: null,
        select: false,                // Never return refresh token
    },

}, {
    // ─────────────────────────────────────────────────────────────────────────────
    // SCHEMA OPTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    timestamps: true,               // Auto-manage createdAt and updatedAt

    // Transform document when converting to JSON
    toJSON: {
        virtuals: true,               // Include virtual properties
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            delete ret.passwordHash;    // NEVER expose password
            delete ret.refreshTokenHash;
            return ret;
        },
    },

    toObject: {
        virtuals: true,
    },
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS (Computed Properties)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Virtual: fullName
 * Computed from firstName and lastName (no storage cost!)
 */
userSchema.virtual('fullName').get(function (this: IUserDocument) {
    if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.username;
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * COMPOUND INDEX: For admin user listing page
 * Supports: "Show all active DEVELOPERs, sorted by creation date"
 * 
 * ESR Rule:
 * - Equality: isActive, role
 * - Sort: createdAt
 */
userSchema.index({ isActive: 1, role: 1, createdAt: -1 });

/**
 * TEXT INDEX: For user search (username, email, firstName, lastName)
 */
userSchema.index({
    username: 'text',
    email: 'text',
    firstName: 'text',
    lastName: 'text',
}, {
    weights: {
        username: 10,                 // Username matches are most important
        email: 8,
        firstName: 5,
        lastName: 5,
    },
    name: 'user_text_search',
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash password before saving
 * Only runs if password field is modified (not on every save)
 */
userSchema.pre('save', async function (next) {
    // Only hash if password was modified
    if (!this.isModified('passwordHash')) {
        return next();
    }

    try {
        // BCRYPT CONFIGURATION:
        // Salt rounds = 12 (good balance of security vs speed)
        // Higher = more secure but slower
        const SALT_ROUNDS = 12;
        this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare a plain password with the stored hash
 * 
 * @param candidatePassword - Plain text password to compare
 * @returns Promise<boolean> - True if passwords match
 * 
 * TIMING ATTACK PROTECTION:
 * bcrypt.compare uses constant-time comparison internally,
 * preventing timing attacks that could leak password info
 */
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    // Note: We need to explicitly select passwordHash since it's marked as select: false
    const user = await UserModel.findById(this._id).select('+passwordHash');
    if (!user?.passwordHash) {
        return false;
    }
    return bcrypt.compare(candidatePassword, user.passwordHash);
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find user by email (case-insensitive)
 */
userSchema.statics.findByEmail = function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find all active users
 */
userSchema.statics.findActiveUsers = function () {
    return this.find({ isActive: true });
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create model (or use existing one in hot-reload scenarios)
 */
export const UserModel = (mongoose.models.User as IUserModel) ||
    mongoose.model<IUserDocument, IUserModel>('User', userSchema);
