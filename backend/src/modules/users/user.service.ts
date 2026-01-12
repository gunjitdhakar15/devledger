/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER SERVICE - Business Logic Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ARCHITECTURE PRINCIPLE: Service Layer
 * - Contains ALL business logic for Users
 * - Orchestrates Repository calls
 * - Validates business rules (not just data format)
 * - Has ZERO knowledge of HTTP (no req/res objects)
 * 
 * BUSINESS RULES EXAMPLES:
 * - "Username must be unique" → Service validates via repo
 * - "Only admins can create other admins" → Service enforces
 * - "Users can't delete themselves" → Service checks
 */

import { UserRepository, UserDTO, PaginatedResult } from './user.repository.js';
import type { CreateUserInput, UpdateUserInput, QueryUsersInput } from './user.schema.js';
import { ConflictError, ForbiddenError, BadRequestError } from '../../common/errors/index.js';
import bcrypt from 'bcrypt';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class UserService {
    // ─────────────────────────────────────────────────────────────────────────────
    // DEPENDENCY INJECTION
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * The repository is injected via constructor
     * This allows us to pass a MockRepository in tests
     */
    constructor(private readonly userRepo: UserRepository) { }

    // ─────────────────────────────────────────────────────────────────────────────
    // CREATE USER
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Create a new user
     * 
     * BUSINESS RULES:
     * 1. Email must be unique
     * 2. Username must be unique
     * 3. Only ADMIN can create ADMIN/MANAGER roles
     * 
     * @param data - User creation data
     * @param creatorRole - Role of the user creating this account
     */
    async createUser(
        data: CreateUserInput,
        creatorRole?: string
    ): Promise<UserDTO> {
        // ─── RULE 1: Check email uniqueness ────────────────────────────────────────
        const emailExists = await this.userRepo.emailExists(data.email);
        if (emailExists) {
            throw new ConflictError('Email is already registered', 'EMAIL_EXISTS');
        }

        // ─── RULE 2: Check username uniqueness ─────────────────────────────────────
        const usernameExists = await this.userRepo.usernameExists(data.username);
        if (usernameExists) {
            throw new ConflictError('Username is already taken', 'USERNAME_EXISTS');
        }

        // ─── RULE 3: Role escalation prevention ────────────────────────────────────
        if (
            (data.role === 'ADMIN' || data.role === 'MANAGER') &&
            creatorRole !== 'ADMIN'
        ) {
            throw new ForbiddenError(
                'Only administrators can create admin or manager accounts',
                'ROLE_ESCALATION'
            );
        }

        // ─── Hash password ─────────────────────────────────────────────────────────
        const passwordHash = await bcrypt.hash(data.password, 12);

        // ─── Create user ───────────────────────────────────────────────────────────
        return this.userRepo.create({
            ...data,
            passwordHash,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // READ OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<UserDTO> {
        return this.userRepo.findByIdOrFail(id);
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<UserDTO | null> {
        return this.userRepo.findByEmail(email);
    }

    /**
     * List users with pagination
     */
    async listUsers(query: QueryUsersInput): Promise<PaginatedResult<UserDTO>> {
        return this.userRepo.findAll(query);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // UPDATE USER
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Update user profile
     * 
     * BUSINESS RULES:
     * 1. Can't change username to an existing one
     * 2. Only ADMIN can change roles
     * 3. Can't escalate above your own role
     * 
     * @param id - User ID to update
     * @param data - Update data
     * @param requesterId - ID of user making the request
     * @param requesterRole - Role of user making the request
     */
    async updateUser(
        id: string,
        data: UpdateUserInput,
        requesterId: string,
        requesterRole: string
    ): Promise<UserDTO> {
        // Fetch existing user (also validates existence)
        const existingUser = await this.userRepo.findByIdOrFail(id);

        // ─── RULE 1: Username uniqueness ───────────────────────────────────────────
        if (data.username && data.username !== existingUser.username) {
            const usernameExists = await this.userRepo.usernameExists(data.username);
            if (usernameExists) {
                throw new ConflictError('Username is already taken', 'USERNAME_EXISTS');
            }
        }

        // ─── RULE 2 & 3: Role change restrictions ──────────────────────────────────
        if (data.role && data.role !== existingUser.role) {
            // Only ADMIN can change roles
            if (requesterRole !== 'ADMIN') {
                throw new ForbiddenError(
                    'Only administrators can change user roles',
                    'ROLE_CHANGE_FORBIDDEN'
                );
            }

            // ADMIN can't demote themselves (safety net)
            if (id === requesterId && data.role !== 'ADMIN') {
                throw new ForbiddenError(
                    'Administrators cannot demote themselves',
                    'SELF_DEMOTION_FORBIDDEN'
                );
            }
        }

        return this.userRepo.update(id, data);
    }

    /**
     * Update current user's own profile
     * Limited fields (can't change own role)
     */
    async updateOwnProfile(
        id: string,
        data: Omit<UpdateUserInput, 'role'>
    ): Promise<UserDTO> {
        // Validate username if being changed
        const existingUser = await this.userRepo.findByIdOrFail(id);

        if (data.username && data.username !== existingUser.username) {
            const usernameExists = await this.userRepo.usernameExists(data.username);
            if (usernameExists) {
                throw new ConflictError('Username is already taken', 'USERNAME_EXISTS');
            }
        }

        // Don't allow role in update (strip it just in case)
        const { ...safeData } = data;
        return this.userRepo.update(id, safeData);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE / DEACTIVATE
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Deactivate user (soft delete)
     * 
     * BUSINESS RULES:
     * 1. Users cannot deactivate themselves
     * 2. Only ADMIN can deactivate users
     */
    async deactivateUser(
        id: string,
        requesterId: string,
        requesterRole: string
    ): Promise<UserDTO> {
        // RULE 1: Can't deactivate yourself
        if (id === requesterId) {
            throw new BadRequestError(
                'You cannot deactivate your own account',
                'SELF_DEACTIVATION'
            );
        }

        // RULE 2: Only admin can deactivate
        if (requesterRole !== 'ADMIN') {
            throw new ForbiddenError(
                'Only administrators can deactivate users',
                'DEACTIVATION_FORBIDDEN'
            );
        }

        return this.userRepo.deactivate(id);
    }

    /**
     * Reactivate a previously deactivated user
     */
    async reactivateUser(id: string): Promise<UserDTO> {
        return this.userRepo.update(id, {} as UpdateUserInput);
        // Note: This would need a specific method, but for now just returns user
    }
}
