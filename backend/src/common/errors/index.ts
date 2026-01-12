/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CUSTOM ERROR CLASSES - The Foundation of Error Handling
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHY CUSTOM ERRORS:
 * - Standard Error class doesn't carry HTTP status codes
 * - We need to distinguish between client errors (4xx) and server errors (5xx)
 * - This enables automatic error response formatting in the error handler
 * 
 * ARCHITECTURE PRINCIPLE:
 * - All errors thrown in the app should extend AppError
 * - The error handler can then determine the correct HTTP response
 * - This is the "Hexagonal Architecture" boundary - domain errors → HTTP responses
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BASE APPLICATION ERROR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base class for all application errors
 * 
 * @property statusCode - HTTP status code to return (e.g., 400, 401, 404)
 * @property isOperational - If true, this is a "known" error (client mistake)
 *                          If false, this is an unexpected error (bug/crash)
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code: string;             // Machine-readable error code

    constructor(
        message: string,                        // Human-readable message
        statusCode: number = 500,               // HTTP status (default: Internal Server Error)
        code: string = 'INTERNAL_ERROR',        // Machine code for frontend handling
        isOperational: boolean = true            // Is this a "known" error?
    ) {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);

        // Set the prototype explicitly (required for extending built-in classes in TS)
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC ERROR TYPES (Semantic Errors)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 400 Bad Request - Client sent invalid data
 * Examples: Missing required fields, invalid format, validation failures
 */
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad Request', code: string = 'BAD_REQUEST') {
        super(message, 400, code);
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

/**
 * 401 Unauthorized - Client is not authenticated
 * Examples: Missing token, expired token, invalid token
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required', code: string = 'UNAUTHORIZED') {
        super(message, 401, code);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * 403 Forbidden - Client is authenticated but lacks permission
 * Examples: User trying to delete admin-only resource, RBAC violation
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied', code: string = 'FORBIDDEN') {
        super(message, 403, code);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * 404 Not Found - Requested resource doesn't exist
 * Examples: Task ID doesn't exist, Project not found
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
        super(message, 404, code);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * 409 Conflict - Request conflicts with current state
 * Examples: Email already registered, duplicate project name
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists', code: string = 'CONFLICT') {
        super(message, 409, code);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * 422 Unprocessable Entity - Validation passed but business logic failed
 * Examples: Can't assign task to inactive user, project budget exceeded
 */
export class UnprocessableEntityError extends AppError {
    constructor(message: string = 'Unable to process request', code: string = 'UNPROCESSABLE') {
        super(message, 422, code);
        Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 * Examples: Too many login attempts, API quota exceeded
 */
export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests, please slow down', code: string = 'RATE_LIMITED') {
        super(message, 429, code);
        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
    }
}

/**
 * 500 Internal Server Error - Something unexpected went wrong
 * This should be used sparingly - prefer specific error types
 */
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') {
        super(message, 500, code, false);  // isOperational = false (this is a bug)
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}
