/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVER ENTRY POINT - The Launch Pad
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHAT THIS FILE DOES:
 * 1. Loads environment variables (before anything else!)
 * 2. Builds the application using the factory
 * 3. Starts listening for HTTP requests
 * 4. Handles graceful shutdown signals (SIGTERM, SIGINT)
 * 
 * WHY SEPARATE FROM app.ts:
 * - app.ts exports a builder function for testing (can create isolated instances)
 * - server.ts is the "real world" bootstrap (runs once, listens forever)
 * - Tests import app.ts; Production runs server.ts
 */

// Imports -> App builder and env config
import { buildApp } from './app.js';
import { env } from './config/env.js';

// MAIN FUNCTION "async because we have to wait for DB to connect"
async function main(): Promise<void> {
    let app;

    try {
        // BUILD THE APPLICATION (Promise<void> -> typescript syntax for promise that this function will return nothing and will be complete eventually)
        // 1.bulid the app ( Plugins, routes, etc)
        app = await buildApp();

        // 2.Start listening for request on the PORT from env
        await app.listen({
            port: env.PORT,
            host: env.HOST,           // '0.0.0.0' allows external connections
        });

        console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ██████╗ ███████╗██╗   ██╗██╗     ███████╗██████╗  ██████╗ ███████╗██████╗   ║
║   ██╔══██╗██╔════╝██║   ██║██║     ██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗  ║
║   ██║  ██║█████╗  ██║   ██║██║     █████╗  ██║  ██║██║  ███╗█████╗  ██████╔╝  ║
║   ██║  ██║██╔══╝  ╚██╗ ██╔╝██║     ██╔══╝  ██║  ██║██║   ██║██╔══╝  ██╔══██╗  ║
║   ██████╔╝███████╗ ╚████╔╝ ███████╗███████╗██████╔╝╚██████╔╝███████╗██║  ██║  ║
║   ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝  ║
║                                                                               ║
║   🚀 High-Performance Project Management Dashboard                            ║
║   📍 Server: http://${env.HOST}:${env.PORT}                                   ║
║   🔧 Environment: ${env.NODE_ENV.padEnd(12)}                                  ║
║   📋 API Docs: http://${env.HOST}:${env.PORT}/docs                            ║
║                                                                               ║
║   Operator Mode: ACTIVE                                                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    } catch (err) {
        if (app) {
            app.log.error(err, 'Server failed to start');
        }
        console.error('Server failed to start:', err);
        process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // GRACEFUL SHUTDOWN
    // ─────────────────────────────────────────────────────────────────────────────
    /**
     * WHY GRACEFUL SHUTDOWN MATTERS:
     * - SIGTERM: Sent by Kubernetes/Docker when scaling down
     * - SIGINT:  Sent when you press Ctrl+C
     * 
     * Without handling these:
     * - Active database connections are abruptly terminated
     * - In-flight requests get dropped
     * - Data corruption is possible
     * 
     * With graceful shutdown:
     * - Server stops accepting NEW connections
     * - Waits for EXISTING connections to finish
     * - Closes database connections cleanly
     * - THEN exits the process
     */
    const shutdown = async (signal: string) => {
        console.log(`\n⚡ Received ${signal}. Starting graceful shutdown...`);

        try {
            // Fastify's close() method:
            // 1. Stops accepting new connections
            // 2. Waits for existing connections to complete
            // 3. Runs onClose hooks (which close DB connection)
            await app.close();

            console.log('✅ Server closed gracefully');
            process.exit(0);
        } catch (err) {
            console.error('❌ Error during shutdown:', err);
            process.exit(1);
        }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error('💥 Uncaught Exception:', err);
        shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
        console.error('💥 Unhandled Rejection:', reason);
        shutdown('unhandledRejection');
    });
}

// Run the Server
main();
