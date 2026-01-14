/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATABASE UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * USAGE:
 *   npm run db:status   # Check database connection and collection stats
 *   npm run db:reset    # Clear all data from the database
 * 
 * Utility functions for database management and health checks.
 */

import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../modules/users/user.model.js';
import { ProjectModel } from '../modules/projects/project.model.js';
import { TaskModel } from '../modules/tasks/task.model.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLE OUTPUT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof COLORS = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════

async function connect(): Promise<boolean> {
    try {
        await mongoose.connect(env.MONGODB_URI, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
        });
        return true;
    } catch (error) {
        log(`❌ Connection failed: ${error}`, 'red');
        return false;
    }
}

async function disconnect(): Promise<void> {
    await mongoose.connection.close();
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

async function showStatus(): Promise<void> {
    log('\n═══════════════════════════════════════════════════════════════', 'cyan');
    log('                 DevLedger Database Status                      ', 'cyan');
    log('═══════════════════════════════════════════════════════════════', 'cyan');

    log('\n📡 Connecting to MongoDB...', 'dim');
    const connected = await connect();

    if (!connected) {
        log('\n❌ Could not connect to database', 'red');
        log('   Check your MONGODB_URI environment variable', 'dim');
        process.exit(1);
    }

    log('✅ Connected successfully', 'green');

    // Get connection info
    const db = mongoose.connection.db;
    const dbName = db?.databaseName || 'unknown';

    log(`\n📊 Database: ${dbName}`, 'cyan');

    // Collection statistics
    try {
        const userCount = await UserModel.countDocuments();
        const projectCount = await ProjectModel.countDocuments();
        const taskCount = await TaskModel.countDocuments();

        log('\n┌─────────────────────────────────────────┐', 'dim');
        log('│           Collection Statistics         │', 'bold');
        log('├─────────────────────────────────────────┤', 'dim');
        log(`│  Users:     ${String(userCount).padStart(6)}                      │`, 'reset');
        log(`│  Projects:  ${String(projectCount).padStart(6)}                      │`, 'reset');
        log(`│  Tasks:     ${String(taskCount).padStart(6)}                      │`, 'reset');
        log('└─────────────────────────────────────────┘', 'dim');

        // Task status breakdown
        if (taskCount > 0) {
            log('\n📋 Task Status Breakdown:', 'cyan');
            const tasksByStatus = await TaskModel.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]);

            for (const status of tasksByStatus) {
                const bar = '█'.repeat(Math.min(20, Math.ceil((status.count / taskCount) * 20)));
                log(`   ${status._id.padEnd(12)} ${bar} ${status.count}`, 'dim');
            }
        }

        // Project status breakdown
        if (projectCount > 0) {
            log('\n📁 Project Status Breakdown:', 'cyan');
            const projectsByStatus = await ProjectModel.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]);

            for (const status of projectsByStatus) {
                log(`   ${status._id.padEnd(12)}: ${status.count}`, 'dim');
            }
        }

        // User role breakdown
        if (userCount > 0) {
            log('\n👥 User Roles:', 'cyan');
            const usersByRole = await UserModel.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]);

            for (const role of usersByRole) {
                log(`   ${role._id.padEnd(12)}: ${role.count}`, 'dim');
            }
        }

    } catch (error) {
        log(`\n❌ Error reading collections: ${error}`, 'red');
    }

    await disconnect();
    log('\n✅ Status check complete', 'green');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

async function resetDatabase(): Promise<void> {
    log('\n═══════════════════════════════════════════════════════════════', 'red');
    log('                 ⚠️  DATABASE RESET                             ', 'red');
    log('═══════════════════════════════════════════════════════════════', 'red');

    log('\n⚠️  This will DELETE all data from:', 'yellow');
    log('   - Users collection', 'dim');
    log('   - Projects collection', 'dim');
    log('   - Tasks collection', 'dim');

    const connected = await connect();
    if (!connected) {
        process.exit(1);
    }

    try {
        log('\n🗑️  Deleting all documents...', 'yellow');

        const taskResult = await TaskModel.deleteMany({});
        log(`   ↳ Tasks deleted: ${taskResult.deletedCount}`, 'dim');

        const projectResult = await ProjectModel.deleteMany({});
        log(`   ↳ Projects deleted: ${projectResult.deletedCount}`, 'dim');

        const userResult = await UserModel.deleteMany({});
        log(`   ↳ Users deleted: ${userResult.deletedCount}`, 'dim');

        log('\n✅ Database reset complete', 'green');

    } catch (error) {
        log(`\n❌ Reset failed: ${error}`, 'red');
        process.exit(1);
    }

    await disconnect();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    const command = process.argv[2];

    switch (command) {
        case 'status':
            await showStatus();
            break;

        case 'reset':
            await resetDatabase();
            break;

        default:
            log('\n📖 DevLedger Database Utilities', 'cyan');
            log('\nUsage:', 'bold');
            log('  npm run db:status   Check database connection and stats', 'dim');
            log('  npm run db:reset    Clear all data from database', 'dim');
            log('  npm run db:seed     Populate database with sample data', 'dim');
            break;
    }
}

main();
