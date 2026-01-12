/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GLOBAL ERROR HANDLER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHAT THIS DOES:
 * - Catches ALL errors thrown during request handling
 * - Transforms errors into consistent API responses
 * - Logs errors appropriately (operational vs programming errors)
 * 
 * ERROR TYPES HANDLED:
 * 1. AppError (our custom errors) → Use statusCode from error
 * 2. Zod Validation Errors → 400 Bad Request with details
 * 3. Mongoose Validation Errors → 400 Bad Request
 * 4. Unknown Errors → 500 Internal Server Error
 */

import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/index.js';
import { env } from '../../config/env.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorResponse {
    success: false;
    error: {
        code: string;              // Machine-readable code (e.g., 'VALIDATION_ERROR')
        message: string;           // Human-readable message
        details?: unknown;         // Additional details (validation errors, etc.)
        stack?: string;            // Stack trace (dev only)
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Log the error with request context
    request.log.error({
        err: error,
        requestId: request.id,
        url: request.url,
        method: request.method,
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // CASE 1: Our Custom AppError
    // ─────────────────────────────────────────────────────────────────────────────
    if (error instanceof AppError) {
        const response: ErrorResponse = {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                // Only include stack in development
                ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
            },
        };

        return reply.status(error.statusCode).send(response);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CASE 2: Zod Validation Error (from schema validation)
    // ─────────────────────────────────────────────────────────────────────────────
    if (error instanceof ZodError) {
        const response: ErrorResponse = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            },
        };

        return reply.status(400).send(response);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CASE 3: Mongoose Validation Error
    // ─────────────────────────────────────────────────────────────────────────────
    if (error.name === 'ValidationError') {
        const response: ErrorResponse = {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Database validation failed',
                details: error.message,
            },
        };

        return reply.status(400).send(response);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CASE 4: Mongoose Cast Error (invalid ObjectId)
    // ─────────────────────────────────────────────────────────────────────────────
    if (error.name === 'CastError') {
        const response: ErrorResponse = {
            success: false,
            error: {
                code: 'INVALID_ID',
                message: 'Invalid resource ID format',
            },
        };

        return reply.status(400).send(response);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CASE 5: Duplicate Key Error (MongoDB unique constraint)
    // ─────────────────────────────────────────────────────────────────────────────
    if ('code' in error && error.code === 11000) {
        const response: ErrorResponse = {
            success: false,
            error: {
                code: 'DUPLICATE_ENTRY',
                message: 'A resource with this identifier already exists',
            },
        };

        return reply.status(409).send(response);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DEFAULT: Unknown Error (500 Internal Server Error)
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * SECURITY: Never expose internal error details in production
     * Attackers can use error messages to understand system internals
     */
    const response: ErrorResponse = {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : error.message,
            ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
        },
    };

    return reply.status(500).send(response);
}
