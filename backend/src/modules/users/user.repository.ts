/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER REPOSITORY - Data Access Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE PRINCIPLE: Repository Pattern
 * - Encapsulates ALL database operations for Users
 * - The Service layer has ZERO knowledge of Mongoose/MongoDB
 * - Enables swapping database implementations (e.g., testing with in-memory)
 * - Single place to optimize queries with .lean(), indexes, etc.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. .lean() for read operations (returns POJOs, not Mongoose docs)
 * 2. Projection to fetch only needed fields
 * 3. Aggregation pipelines for complex queries
 */

import { UserModel, IUserDocument } from './user.model.js';
import type { CreateUserInput, UpdateUserInput, QueryUsersInput } from './user.schema.js';
import { NotFoundError } from '../../common/errors/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User data transfer object (what the repository returns)
 * Clean, typed data without Mongoose baggage
 */
export interface UserDTO {
    id: string;
    email: string;
    username: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Paginated query result
 */
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
// REPOSITORY CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class UserRepository {

    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Create a new user
     * 
     * @param data - User creation data
     * @returns The created user (without password)
     */
    async create(data: CreateUserInput & { passwordHash: string }): Promise<UserDTO> {
        const user = await UserModel.create({
            email: data.email,
            passwordHash: data.passwordHash,
            username: data.username,
            role: data.role,
            firstName: data.firstName,
            lastName: data.lastName,
            avatar: data.avatar,
        });

        // Return as DTO (toJSON removes password)
        return this.toDTO(user);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // READ OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Find user by ID
     * 
     * @param id - MongoDB ObjectId
     * @returns User DTO or null
     * 
     * PERFORMANCE: Uses .lean() for faster reads
     */
    async findById(id: string): Promise<UserDTO | null> {
        const user = await UserModel.findById(id).lean();
        return user ? this.leanToDTO(user) : null;
    }

    /**
     * Find user by ID or throw NotFoundError
     * Use this when you expect the user to exist
     */
    async findByIdOrFail(id: string): Promise<UserDTO> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }
        return user;
    }

    /**
     * Find user by email (for authentication)
     * 
     * IMPORTANT: This includes passwordHash for password comparison
     * Only use this in the Auth module!
     */
    async findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
        return UserModel.findOne({ email: email.toLowerCase() })
            .select('+passwordHash +refreshTokenHash');
    }

    /**
     * Find user by email (public - no password)
     */
    async findByEmail(email: string): Promise<UserDTO | null> {
        const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
        return user ? this.leanToDTO(user) : null;
    }

    /**
     * Find user by username
     */
    async findByUsername(username: string): Promise<UserDTO | null> {
        const user = await UserModel.findOne({ username }).lean();
        return user ? this.leanToDTO(user) : null;
    }

    /**
     * List users with pagination, filtering, and sorting
     * 
     * @param query - Query parameters from URL
     * @returns Paginated list of users
     * 
     * PERFORMANCE:
     * - Uses .lean() for 3-5x faster reads
     * - Uses compound index on { isActive, role, createdAt }
     * - Runs COUNT and FIND in parallel
     */
    async findAll(query: QueryUsersInput): Promise<PaginatedResult<UserDTO>> {
        const { page, limit, role, search, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        // Build filter
        const filter: Record<string, unknown> = { isActive: true };

        if (role) {
            filter.role = role;
        }

        if (search) {
            // Use text search for partial matching
            filter.$text = { $search: search };
        }

        // Build sort
        const sort: Record<string, 1 | -1> = {
            [sortBy]: sortOrder === 'asc' ? 1 : -1,
        };

        // Execute count and find in PARALLEL for performance
        const [total, users] = await Promise.all([
            UserModel.countDocuments(filter),
            UserModel.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            data: users.map((u) => this.leanToDTO(u)),
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

    /**
     * Update user by ID
     * 
     * @param id - User ID
     * @param data - Partial update data
     * @returns Updated user DTO
     * 
     * IMPORTANT: Returns the updated document (new: true)
     */
    async update(id: string, data: UpdateUserInput): Promise<UserDTO> {
        const user = await UserModel.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }  // Return updated doc, run validations
        ).lean();

        if (!user) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }

        return this.leanToDTO(user);
    }

    /**
     * Update refresh token hash (for token rotation)
     */
    async updateRefreshToken(id: string, tokenHash: string | null): Promise<void> {
        await UserModel.findByIdAndUpdate(id, {
            refreshTokenHash: tokenHash,
            lastLoginAt: tokenHash ? new Date() : undefined,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Soft delete - deactivate user
     * We never hard delete users for audit trail purposes
     */
    async deactivate(id: string): Promise<UserDTO> {
        const user = await UserModel.findByIdAndUpdate(
            id,
            { $set: { isActive: false } },
            { new: true }
        ).lean();

        if (!user) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }

        return this.leanToDTO(user);
    }

    /**
     * Hard delete (use with caution!)
     * Only for GDPR "right to be forgotten" requests
     */
    async hardDelete(id: string): Promise<void> {
        const result = await UserModel.findByIdAndDelete(id);
        if (!result) {
            throw new NotFoundError(`User with ID ${id} not found`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EXISTENCE CHECKS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Check if email is already registered
     */
    async emailExists(email: string): Promise<boolean> {
        const count = await UserModel.countDocuments({ email: email.toLowerCase() });
        return count > 0;
    }

    /**
     * Check if username is already taken
     */
    async usernameExists(username: string): Promise<boolean> {
        const count = await UserModel.countDocuments({ username });
        return count > 0;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Convert Mongoose document to DTO
     */
    private toDTO(user: IUserDocument): UserDTO {
        const obj = user.toJSON() as Record<string, unknown>;
        return {
            id: String(obj.id),
            email: String(obj.email),
            username: String(obj.username),
            role: String(obj.role),
            firstName: (obj.firstName as string | null) || null,
            lastName: (obj.lastName as string | null) || null,
            avatar: (obj.avatar as string | null) || null,
            isActive: Boolean(obj.isActive),
            lastLoginAt: (obj.lastLoginAt as Date | null) || null,
            createdAt: obj.createdAt as Date,
            updatedAt: obj.updatedAt as Date,
        };
    }

    /**
     * Convert lean document (POJO) to DTO
     */
    private leanToDTO(user: Record<string, unknown>): UserDTO {
        return {
            id: String(user._id),
            email: user.email as string,
            username: user.username as string,
            role: user.role as string,
            firstName: (user.firstName as string) || null,
            lastName: (user.lastName as string) || null,
            avatar: (user.avatar as string) || null,
            isActive: user.isActive as boolean,
            lastLoginAt: (user.lastLoginAt as Date) || null,
            createdAt: user.createdAt as Date,
            updatedAt: user.updatedAt as Date,
        };
    }
}
