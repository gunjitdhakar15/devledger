/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENVIRONMENT CONFIGURATION - Zod Validated
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHY THIS MATTERS:
 * - Most apps crash at RUNTIME when env vars are missing (e.g., Monday at 3 AM)
 * - With Zod validation, missing/invalid vars cause BOOT-TIME failures
 * - You catch configuration errors during deployment, NOT in production
 * 
 * ARCHITECTURE PRINCIPLE:
 * - This is the "Configuration Layer" - validates ALL environment at startup
 * - If any required var is missing, the server fails fast with a clear error
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════
// Each field here documents WHAT config is needed to run this app

const envSchema = z.object({
    // ─────────────────────────────────────────────────────────────────────────────
    // SERVER CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────────────
    NODE_ENV: z.enum(['development', 'production', 'test'])
        .default('development'),                    // Default to dev if not specified

    PORT: z.string()
        .transform((val) => parseInt(val, 10))      // Convert string "3000" to number 3000
        .default('3000'),                           // Default port

    HOST: z.string()
        .default('0.0.0.0'),                        // Listen on all interfaces (for Docker)

    // ─────────────────────────────────────────────────────────────────────────────
    // DATABASE CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────────────
    MONGODB_URI: z.string()
        .url()                                      // Must be a valid URL format
        .startsWith('mongodb', {                    // Must start with mongodb:// or mongodb+srv://
            message: 'MONGODB_URI must be a valid MongoDB connection string'
        }),

    // ─────────────────────────────────────────────────────────────────────────────
    // SECURITY / JWT CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────────────
    JWT_SECRET: z.string()
        .min(32, { message: 'JWT_SECRET must be at least 32 characters for security' }),

    JWT_ACCESS_EXPIRY: z.string()
        .default('25m'),                            // Access tokens expire fast (15 mins)

    JWT_REFRESH_EXPIRY: z.string()
        .default('7d'),                             // Refresh tokens last 7 days

    // ─────────────────────────────────────────────────────────────────────────────
    // CORS CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────────────
    FRONTEND_URL: z.string()
        .url()
        .default('http://localhost:5173'),          // Vite's default dev server port
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION & EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse and validate environment variables
 * 
 * IF THIS FAILS:
 * - The error message will tell you EXACTLY what's missing
 * - The server will NOT start (fail-fast principle)
 * - You'll know about it during deployment, not at 3 AM in production
 */
function validateEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);  // Exit immediately - don't start with bad config
    }

    return result.data;
}

// Export the validated & typed configuration
export const env = validateEnv();

// Export the type for use elsewhere (e.g., in dependency injection)
export type Env = z.infer<typeof envSchema>;
