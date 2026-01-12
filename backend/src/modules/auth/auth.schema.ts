/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTH SCHEMAS (Zod Validation)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Authentication-specific schemas for:
 * - Registration (uses CreateUserSchema from users)
 * - Login
 * - Token refresh
 * - Password change/reset
 */

import { z } from 'zod';
import { CreateUserSchema } from '../users/user.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registration schema (reuses user creation, minus role)
 * Regular users can't set their own role during registration
 */
export const RegisterSchema = CreateUserSchema.omit({ role: true });
export type RegisterInput = z.infer<typeof RegisterSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Login credentials
 */
export const LoginSchema = z.object({
    email: z.string()
        .email({ message: 'Invalid email format' })
        .toLowerCase()
        .trim(),
    password: z.string()
        .min(1, { message: 'Password is required' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN RESPONSE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auth response with tokens
 */
export const AuthResponseSchema = z.object({
    accessToken: z.string(),
    expiresIn: z.number(),         // Seconds until expiry
    user: z.object({
        id: z.string(),
        email: z.string(),
        username: z.string(),
        role: z.string(),
    }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD CHANGE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Change password (requires current password)
 */
export const ChangePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, { message: 'Current password is required' }),
    newPassword: z.string()
        .min(8, { message: 'Password must be at least 8 characters' })
        .max(128)
        .regex(/[A-Z]/, { message: 'Must contain uppercase letter' })
        .regex(/[a-z]/, { message: 'Must contain lowercase letter' })
        .regex(/[0-9]/, { message: 'Must contain number' })
        .regex(/[^A-Za-z0-9]/, { message: 'Must contain special character' }),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD RESET REQUEST SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request password reset (forgot password)
 */
export const ForgotPasswordSchema = z.object({
    email: z.string()
        .email({ message: 'Invalid email format' })
        .toLowerCase()
        .trim(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * Reset password with token
 */
export const ResetPasswordSchema = z.object({
    token: z.string().min(1, { message: 'Reset token is required' }),
    newPassword: z.string()
        .min(8)
        .max(128)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
