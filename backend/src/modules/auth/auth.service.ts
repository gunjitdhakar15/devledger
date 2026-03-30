/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTH SERVICE - Authentication Business Logic
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SECURITY ARCHITECTURE:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                         TOKEN STRATEGY                                       │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                              │
 * │  ACCESS TOKEN (Short-lived: 15 minutes)                                     │
 * │  ├─ Sent in Authorization: Bearer header                                    │
 * │  ├─ Used for API authentication                                             │
 * │  └─ If stolen, attacker has limited window                                  │
 * │                                                                              │
 * │  REFRESH TOKEN (Long-lived: 7 days)                                         │
 * │  ├─ Stored in HttpOnly cookie (XSS immune)                                  │
 * │  ├─ Used only to get new access tokens                                      │
 * │  ├─ Hashed in database (theft from DB useless)                              │
 * │  └─ One-time use (rotation on each refresh)                                 │
 * │                                                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * 
 * REFRESH TOKEN ROTATION:
 * - Each time a refresh token is used, a NEW one is issued
 * - If an old token is used (replay attack), ALL tokens are invalidated
 */

import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { UserRepository } from '../users/user.repository.js';
import { UserModel } from '../users/user.model.js';
import type { RegisterInput, LoginInput, AuthResponse } from './auth.schema.js';
import {
    BadRequestError,
    UnauthorizedError,
    ConflictError
} from '../../common/errors/index.js';
import { env } from '../../config/env.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class AuthService {
    constructor(
        private readonly userRepo: UserRepository,
        private readonly fastify: FastifyInstance
    ) { }

    // ─────────────────────────────────────────────────────────────────────────────
    // REGISTER
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a new user account
     * 
     * @param data - Registration data (email, password, username)
     * @returns User data (without tokens - user must login after registration)
     */
    async register(data: RegisterInput): Promise<{ id: string; email: string; username: string }> {
        // Check if email exists
        const emailExists = await this.userRepo.emailExists(data.email);
        if (emailExists) {
            throw new ConflictError('Email is already registered', 'EMAIL_EXISTS');
        }

        // Check if username exists
        const usernameExists = await this.userRepo.usernameExists(data.username);
        if (usernameExists) {
            throw new ConflictError('Username is already taken', 'USERNAME_EXISTS');
        }

        // Hash password (12 salt rounds for security)
        const passwordHash = await bcrypt.hash(data.password, 12);

        // Create user with default role (DEVELOPER)
        const user = await this.userRepo.create({
            email: data.email,
            username: data.username,
            passwordHash,
            password: data.password,  // Will be ignored - we pass passwordHash
            role: 'DEVELOPER',
            firstName: data.firstName,
            lastName: data.lastName,
            avatar: data.avatar,
        });

        return {
            id: user.id,
            email: user.email,
            username: user.username,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Authenticate user and issue tokens
     * 
     * @param data - Login credentials
     * @returns Access token, refresh token cookie, and user info
     */
    async login(data: LoginInput): Promise<AuthResponse & { refreshToken: string }> {
        // ─── Find user by email (with password hash) ─────────────────────────────
        const user = await this.userRepo.findByEmailWithPassword(data.email);

        if (!user) {
            // Use generic error to prevent email enumeration
            throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
        }

        // ─── Check if user is active ─────────────────────────────────────────────
        if (!user.isActive) {
            throw new UnauthorizedError('Account is deactivated', 'ACCOUNT_DISABLED');
        }

        // ─── Verify password ─────────────────────────────────────────────────────
        const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
        }

        // ─── Generate tokens ─────────────────────────────────────────────────────
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };

        // Access token (short-lived, sent in response)
        const accessToken = this.fastify.jwt.sign(payload, {
            expiresIn: env.JWT_ACCESS_EXPIRY,
        });

        // Refresh token (long-lived, stored in HttpOnly cookie)
        const refreshToken = this.fastify.jwt.sign(
            { id: user._id.toString(), type: 'refresh' } as unknown as import('../../plugins/auth.js').JwtPayload,
            { expiresIn: env.JWT_REFRESH_EXPIRY }
        );

        // ─── Store hashed refresh token in DB (for rotation detection) ───────────
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
        await this.userRepo.updateRefreshToken(user._id.toString(), refreshTokenHash);

        // ─── Update last login timestamp ─────────────────────────────────────────
        await UserModel.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        return {
            accessToken,
            expiresIn: this.parseExpiry(env.JWT_ACCESS_EXPIRY),
            refreshToken,  // Will be set as cookie by controller
            user: {
                id: user._id.toString(),
                email: user.email,
                username: user.username,
                role: user.role,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // REFRESH ACCESS TOKEN
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Issue new access token using refresh token
     * Implements refresh token rotation for security
     * 
     * @param refreshToken - The refresh token from cookie
     * @returns New access token and rotated refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<AuthResponse & { refreshToken: string }> {
        // ─── Verify refresh token ────────────────────────────────────────────────
        let decoded: { id: string; type: string };

        try {
            decoded = this.fastify.jwt.verify(refreshToken) as { id: string; type: string };
        } catch {
            throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
        }

        if (decoded.type !== 'refresh') {
            throw new UnauthorizedError('Invalid token type', 'INVALID_TOKEN_TYPE');
        }

        // ─── Get user with stored refresh token hash ─────────────────────────────
        const user = await this.userRepo.findByEmailWithPassword(
            (await this.userRepo.findById(decoded.id))?.email || ''
        );

        if (!user || !user.refreshTokenHash) {
            throw new UnauthorizedError('Session expired. Please login again.', 'SESSION_EXPIRED');
        }

        // ─── Verify refresh token hash matches (rotation detection) ──────────────
        const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshTokenHash);

        if (!isValidRefreshToken) {
            // SECURITY: Token was already used (replay attack detected)
            // Invalidate ALL sessions for this user
            await this.userRepo.updateRefreshToken(user._id.toString(), null);
            throw new UnauthorizedError(
                'Security alert: Token reuse detected. All sessions have been logged out.',
                'TOKEN_REUSE_DETECTED'
            );
        }

        // ─── Issue new tokens (rotation) ─────────────────────────────────────────
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };

        const newAccessToken = this.fastify.jwt.sign(payload, {
            expiresIn: env.JWT_ACCESS_EXPIRY,
        });

        const newRefreshToken = this.fastify.jwt.sign(
            { id: user._id.toString(), type: 'refresh' } as unknown as import('../../plugins/auth.js').JwtPayload,
            { expiresIn: env.JWT_REFRESH_EXPIRY }
        );

        // Store new hashed refresh token
        const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
        await this.userRepo.updateRefreshToken(user._id.toString(), newRefreshTokenHash);

        return {
            accessToken: newAccessToken,
            expiresIn: this.parseExpiry(env.JWT_ACCESS_EXPIRY),
            refreshToken: newRefreshToken,
            user: {
                id: user._id.toString(),
                email: user.email,
                username: user.username,
                role: user.role,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LOGOUT
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Logout user by invalidating refresh token
     */
    async logout(userId: string): Promise<void> {
        await this.userRepo.updateRefreshToken(userId, null);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CHANGE PASSWORD
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Change password (authenticated user)
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        // Get user with password
        const user = await UserModel.findById(userId).select('+passwordHash');

        if (!user) {
            throw new BadRequestError('User not found');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new BadRequestError('Current password is incorrect', 'WRONG_PASSWORD');
        }

        // Hash and save new password
        user.passwordHash = await bcrypt.hash(newPassword, 12);
        await user.save();

        // Invalidate all sessions (force re-login)
        await this.userRepo.updateRefreshToken(userId, null);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Parse expiry string to seconds
     * @param expiry - e.g., "15m", "7d", "1h"
     */
    private parseExpiry(expiry: string): number {
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) return 900; // default 15 minutes

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 3600;
            case 'd': return value * 86400;
            default: return 900;
        }
    }
}
