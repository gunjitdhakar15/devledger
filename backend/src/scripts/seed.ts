/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATABASE SEEDING SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * USAGE:
 *   npm run db:seed              # Seed without clearing existing data
 *   npm run db:seed -- --clean   # Clear all data before seeding
 * 
 * This script populates the database with realistic sample data for:
 * - Users with different roles (Admin, Manager, Developer, Viewer)
 * - Projects in various statuses
 * - Tasks with priorities, assignees, and subtasks
 */

import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../modules/users/user.model.js';
import { ProjectModel } from '../modules/projects/project.model.js';
import { TaskModel } from '../modules/tasks/task.model.js';
import { seedUsers, seedProjects, seedTasks } from './seed-data.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof COLORS = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════════════════════

async function connectDatabase(): Promise<void> {
    try {
        await mongoose.connect(env.MONGODB_URI, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
        });
        log('✅ Connected to MongoDB', 'green');
    } catch (error) {
        log(`❌ Failed to connect to MongoDB: ${error}`, 'red');
        process.exit(1);
    }
}

async function disconnectDatabase(): Promise<void> {
    await mongoose.connection.close();
    log('🔌 Disconnected from MongoDB', 'dim');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function clearDatabase(): Promise<void> {
    log('\n🗑️  Clearing existing data...', 'yellow');

    await TaskModel.deleteMany({});
    log('   ↳ Tasks cleared', 'dim');

    await ProjectModel.deleteMany({});
    log('   ↳ Projects cleared', 'dim');

    await UserModel.deleteMany({});
    log('   ↳ Users cleared', 'dim');

    log('✅ Database cleared', 'green');
}

async function seedUsersCollection(): Promise<Map<string, mongoose.Types.ObjectId>> {
    log('\n👥 Seeding users...', 'cyan');

    const userIdMap = new Map<string, mongoose.Types.ObjectId>();

    for (const userData of seedUsers) {
        // Check if user already exists
        const existing = await UserModel.findOne({ email: userData.email });
        if (existing) {
            log(`   ↳ User ${userData.email} already exists, skipping`, 'dim');
            userIdMap.set(userData.username, existing._id as mongoose.Types.ObjectId);
            continue;
        }

        // Create new user (password will be hashed by pre-save middleware)
        const user = new UserModel({
            email: userData.email,
            passwordHash: userData.password,  // Will be hashed by middleware
            username: userData.username,
            role: userData.role,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isActive: userData.isActive,
        });

        await user.save();
        userIdMap.set(userData.username, user._id as mongoose.Types.ObjectId);
        log(`   ↳ Created user: ${userData.email} (${userData.role})`, 'dim');
    }

    log(`✅ Seeded ${userIdMap.size} users`, 'green');
    return userIdMap;
}

async function seedProjectsCollection(
    ownerIds: mongoose.Types.ObjectId[],
    memberIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
    log('\n📁 Seeding projects...', 'cyan');

    const projectIds: mongoose.Types.ObjectId[] = [];

    for (let i = 0; i < seedProjects.length; i++) {
        const projectData = seedProjects[i];

        // Check if project already exists
        const existing = await ProjectModel.findOne({ name: projectData.name });
        if (existing) {
            log(`   ↳ Project "${projectData.name}" already exists, skipping`, 'dim');
            projectIds.push(existing._id as mongoose.Types.ObjectId);
            continue;
        }

        // Assign owner (rotate through provided owners)
        const owner = ownerIds[i % ownerIds.length];

        // Assign random subset of members
        const projectMembers = memberIds
            .filter(() => Math.random() > 0.3)
            .slice(0, 3);

        const project = new ProjectModel({
            name: projectData.name,
            description: projectData.description,
            status: projectData.status,
            color: projectData.color,
            tags: projectData.tags,
            startDate: projectData.startDate,
            endDate: projectData.endDate,
            owner,
            members: projectMembers,
        });

        await project.save();
        projectIds.push(project._id as mongoose.Types.ObjectId);
        log(`   ↳ Created project: ${projectData.name} (${projectData.status})`, 'dim');
    }

    log(`✅ Seeded ${projectIds.length} projects`, 'green');
    return projectIds;
}

async function seedTasksCollection(
    projectIds: mongoose.Types.ObjectId[],
    userIdMap: Map<string, mongoose.Types.ObjectId>,
    creatorId: mongoose.Types.ObjectId
): Promise<void> {
    log('\n📋 Seeding tasks...', 'cyan');

    const developerUsernames = ['john_dev', 'emily_dev', 'mike_dev'];
    let createdCount = 0;

    for (const taskData of seedTasks) {
        // Get project ID
        const projectId = projectIds[taskData.projectIndex];
        if (!projectId) continue;

        // Get assignee ID if specified
        let assignee: mongoose.Types.ObjectId | undefined;
        if (taskData.assigneeIndex !== undefined) {
            const username = seedUsers[taskData.assigneeIndex]?.username;
            if (username) {
                assignee = userIdMap.get(username);
            }
        }

        // Check if task already exists
        const existing = await TaskModel.findOne({
            title: taskData.title,
            project: projectId,
        });

        if (existing) {
            log(`   ↳ Task "${taskData.title.slice(0, 30)}..." already exists, skipping`, 'dim');
            continue;
        }

        const task = new TaskModel({
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            project: projectId,
            creator: creatorId,
            assignee,
            tags: taskData.tags,
            estimatedHours: taskData.estimatedHours,
            dueDate: taskData.dueDate,
            subtasks: taskData.subtasks || [],
        });

        await task.save();
        createdCount++;
        log(`   ↳ Created task: ${taskData.title.slice(0, 40)}... (${taskData.status})`, 'dim');
    }

    log(`✅ Seeded ${createdCount} tasks`, 'green');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    const shouldClean = process.argv.includes('--clean');

    log('═══════════════════════════════════════════════════════════════', 'cyan');
    log('              DevLedger Database Seeding Script                 ', 'cyan');
    log('═══════════════════════════════════════════════════════════════', 'cyan');
    log(`Mode: ${shouldClean ? 'CLEAN + SEED' : 'SEED ONLY'}`, 'yellow');

    await connectDatabase();

    try {
        if (shouldClean) {
            await clearDatabase();
        }

        // Seed users and get ID mapping
        const userIdMap = await seedUsersCollection();

        // Get IDs for different roles
        const adminId = userIdMap.get('admin')!;
        const managerId = userIdMap.get('sarah_manager')!;
        const developerIds = [
            userIdMap.get('john_dev')!,
            userIdMap.get('emily_dev')!,
            userIdMap.get('mike_dev')!,
        ].filter(Boolean);

        // Seed projects (admin and manager as owners)
        const projectIds = await seedProjectsCollection(
            [adminId, managerId],
            developerIds
        );

        // Seed tasks
        await seedTasksCollection(projectIds, userIdMap, adminId);

        // Summary
        log('\n═══════════════════════════════════════════════════════════════', 'green');
        log('                    ✅ Seeding Complete!                        ', 'green');
        log('═══════════════════════════════════════════════════════════════', 'green');

        const userCount = await UserModel.countDocuments();
        const projectCount = await ProjectModel.countDocuments();
        const taskCount = await TaskModel.countDocuments();

        log(`\n📊 Database Statistics:`, 'cyan');
        log(`   Users:    ${userCount}`, 'dim');
        log(`   Projects: ${projectCount}`, 'dim');
        log(`   Tasks:    ${taskCount}`, 'dim');

        log(`\n🔑 Test Credentials:`, 'yellow');
        log(`   Admin:     admin@devledger.com / Admin@123456`, 'dim');
        log(`   Manager:   sarah.manager@devledger.com / Manager@123456`, 'dim');
        log(`   Developer: john.dev@devledger.com / Developer@123456`, 'dim');

    } catch (error) {
        log(`\n❌ Seeding failed: ${error}`, 'red');
        console.error(error);
        process.exit(1);
    } finally {
        await disconnectDatabase();
    }
}

// Run the script
main();
