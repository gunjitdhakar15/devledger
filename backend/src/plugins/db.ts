/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MONGODB CONNECTION PLUGIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHY A FASTIFY PLUGIN:
 * - Fastify plugins allow us to encapsulate functionality
 * - The plugin can "decorate" the Fastify instance with the mongoose connection
 * - This enables access to mongoose via `fastify.mongoose` anywhere in the app
 * 
 * CONNECTION POOLING:
 * - MongoDB drivers maintain a connection pool by default
 * - This means we don't open a new connection per request (huge performance win)
 * - The pool is managed automatically by the driver
 */

import fp from 'fastify-plugin';
import mongoose from 'mongoose';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DECLARATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extend Fastify's type system to include mongoose
 * This gives us type-safe access to `fastify.mongoose`
 */
declare module 'fastify' {
    interface FastifyInstance {
        mongoose: typeof mongoose;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUGIN IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MongoDB Connection Plugin
 * 
 * WHAT IT DOES:
 * 1. Connects to MongoDB using the URI from environment
 * 2. Decorates the Fastify instance with mongoose
 * 3. Handles graceful shutdown when the server stops
 */
async function dbPlugin(fastify: FastifyInstance) {
    try {
        // ─────────────────────────────────────────────────────────────────────────
        // CONNECT TO MONGODB
        // ─────────────────────────────────────────────────────────────────────────
        // Add listeners for runtime connection events
        mongoose.connection.on('error', (err) => {
            fastify.log.error({ err }, 'MongoDB connection error');
        });

        mongoose.connection.on('disconnected', () => {
            fastify.log.warn('MongoDB disconnected');
        });

        await mongoose.connect(env.MONGODB_URI, {
            // Connection options
            maxPoolSize: 10,            // Maximum connections in the pool
            serverSelectionTimeoutMS: 5000,  // Timeout for initial connection
            socketTimeoutMS: 45000,     // Timeout for socket operations
        });

        fastify.log.info('✅ MongoDB connected successfully');

        // ─────────────────────────────────────────────────────────────────────────
        // DECORATE FASTIFY WITH MONGOOSE
        // ─────────────────────────────────────────────────────────────────────────
        // This makes mongoose available throughout the app via fastify.mongoose
        fastify.decorate('mongoose', mongoose);

        // ─────────────────────────────────────────────────────────────────────────
        // GRACEFUL SHUTDOWN HOOK
        // ─────────────────────────────────────────────────────────────────────────
        // When Fastify shuts down, close the MongoDB connection
        fastify.addHook('onClose', async () => {
            await mongoose.connection.close();
            fastify.log.info('🔌 MongoDB connection closed');
        });

    } catch (error) {
        fastify.log.error({ err: error }, '❌ MongoDB connection failed');
        console.error('MongoDB connection failed:', error);
        throw error;  // Re-throw to prevent server from starting
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT AS FASTIFY PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * fp (fastify-plugin) wraps our function to:
 * 1. Skip encapsulation - makes decorators available to parent context
 * 2. Add metadata (name) for debugging
 * 
 * Without fp(), decorators would only be available within this plugin's scope
 */
export default fp(dbPlugin, {
    name: 'db-plugin',             // Plugin name for debugging
    fastify: '5.x',                // Compatible Fastify version
});
