/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEED DATA - Realistic Sample Data for Development
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file contains all the sample data used to populate the database
 * for development and testing purposes.
 * 
 * DATA STRUCTURE:
 * - Users: Admin, Manager, and Developers with different roles
 * - Projects: Realistic software projects with various statuses
 * - Tasks: Diverse tasks with different priorities and statuses
 */

import type { Role } from '../modules/users/user.schema.js';
import type { ProjectStatus } from '../modules/projects/project.schema.js';
import type { TaskStatus, TaskPriority } from '../modules/tasks/task.schema.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE USERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SeedUser {
    email: string;
    password: string;  // Plain text - will be hashed during seeding
    username: string;
    role: Role;
    firstName: string;
    lastName: string;
    isActive: boolean;
}

export const seedUsers: SeedUser[] = [
    {
        email: 'admin@devledger.com',
        password: 'Admin@123456',
        username: 'admin',
        role: 'ADMIN',
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
    },
    {
        email: 'sarah.manager@devledger.com',
        password: 'Manager@123456',
        username: 'sarah_manager',
        role: 'MANAGER',
        firstName: 'Sarah',
        lastName: 'Johnson',
        isActive: true,
    },
    {
        email: 'john.dev@devledger.com',
        password: 'Developer@123456',
        username: 'john_dev',
        role: 'DEVELOPER',
        firstName: 'John',
        lastName: 'Smith',
        isActive: true,
    },
    {
        email: 'emily.dev@devledger.com',
        password: 'Developer@123456',
        username: 'emily_dev',
        role: 'DEVELOPER',
        firstName: 'Emily',
        lastName: 'Chen',
        isActive: true,
    },
    {
        email: 'mike.dev@devledger.com',
        password: 'Developer@123456',
        username: 'mike_dev',
        role: 'DEVELOPER',
        firstName: 'Mike',
        lastName: 'Williams',
        isActive: true,
    },
    {
        email: 'viewer@devledger.com',
        password: 'Viewer@123456',
        username: 'viewer',
        role: 'VIEWER',
        firstName: 'Guest',
        lastName: 'User',
        isActive: true,
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SeedProject {
    name: string;
    description: string;
    status: ProjectStatus;
    color: string;
    tags: string[];
    startDate?: Date;
    endDate?: Date;
}

export const seedProjects: SeedProject[] = [
    {
        name: 'DevLedger Dashboard',
        description: 'Modern project management dashboard with real-time analytics, task tracking, and team collaboration features.',
        status: 'ACTIVE',
        color: '#6366f1',
        tags: ['react', 'typescript', 'dashboard', 'priority'],
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
    },
    {
        name: 'API Gateway Refactor',
        description: 'Refactoring the monolithic API into microservices with improved authentication and rate limiting.',
        status: 'ACTIVE',
        color: '#10b981',
        tags: ['backend', 'microservices', 'security'],
        startDate: new Date('2026-01-15'),
    },
    {
        name: 'Mobile App MVP',
        description: 'React Native mobile application for iOS and Android with offline-first capabilities.',
        status: 'PLANNING',
        color: '#f59e0b',
        tags: ['mobile', 'react-native', 'mvp'],
    },
    {
        name: 'Legacy Migration',
        description: 'Migrating legacy PHP system to modern Node.js/TypeScript stack with zero downtime.',
        status: 'ON_HOLD',
        color: '#ef4444',
        tags: ['migration', 'legacy', 'node'],
        startDate: new Date('2025-10-01'),
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE TASKS (Templates - Project IDs assigned during seeding)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SeedTask {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectIndex: number;  // Index into seedProjects array
    assigneeIndex?: number; // Index into seedUsers array (developers only)
    tags: string[];
    estimatedHours?: number;
    dueDate?: Date;
    subtasks?: { title: string; completed: boolean }[];
}

export const seedTasks: SeedTask[] = [
    // DevLedger Dashboard Tasks
    {
        title: 'Implement user authentication flow',
        description: 'Set up JWT-based authentication with refresh token rotation and secure cookie handling.',
        status: 'DONE',
        priority: 'HIGH',
        projectIndex: 0,
        assigneeIndex: 2, // john_dev
        tags: ['auth', 'security'],
        estimatedHours: 16,
        dueDate: new Date('2026-01-10'),
    },
    {
        title: 'Build dashboard analytics widgets',
        description: 'Create reusable chart components using Recharts for task statistics and project progress.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectIndex: 0,
        assigneeIndex: 3, // emily_dev
        tags: ['frontend', 'charts'],
        estimatedHours: 24,
        dueDate: new Date('2026-01-20'),
        subtasks: [
            { title: 'Task completion pie chart', completed: true },
            { title: 'Weekly activity line chart', completed: true },
            { title: 'Project status bar chart', completed: false },
            { title: 'Team velocity metrics', completed: false },
        ],
    },
    {
        title: 'Set up CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing, linting, and deployment to staging/production.',
        status: 'TODO',
        priority: 'MEDIUM',
        projectIndex: 0,
        tags: ['devops', 'automation'],
        estimatedHours: 8,
        dueDate: new Date('2026-01-25'),
    },
    {
        title: 'Add dark mode support',
        description: 'Implement theme switching with CSS variables and persist user preference.',
        status: 'TODO',
        priority: 'LOW',
        projectIndex: 0,
        assigneeIndex: 4, // mike_dev
        tags: ['frontend', 'ux'],
        estimatedHours: 6,
    },

    // API Gateway Tasks
    {
        title: 'Design microservices architecture',
        description: 'Document service boundaries, communication patterns, and data ownership.',
        status: 'DONE',
        priority: 'URGENT',
        projectIndex: 1,
        assigneeIndex: 2, // john_dev
        tags: ['architecture', 'documentation'],
        estimatedHours: 12,
    },
    {
        title: 'Implement rate limiting middleware',
        description: 'Add Redis-based rate limiting with configurable windows per endpoint.',
        status: 'IN_REVIEW',
        priority: 'HIGH',
        projectIndex: 1,
        assigneeIndex: 3, // emily_dev
        tags: ['security', 'performance'],
        estimatedHours: 10,
        dueDate: new Date('2026-01-18'),
    },
    {
        title: 'Set up service mesh',
        description: 'Configure Istio for service-to-service communication, load balancing, and observability.',
        status: 'BLOCKED',
        priority: 'HIGH',
        projectIndex: 1,
        tags: ['infrastructure', 'kubernetes'],
        estimatedHours: 20,
    },

    // Mobile App Tasks
    {
        title: 'Create wireframes and mockups',
        description: 'Design mobile-first UI/UX in Figma with component library.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectIndex: 2,
        tags: ['design', 'ux'],
        estimatedHours: 16,
        dueDate: new Date('2026-02-01'),
    },
    {
        title: 'Set up React Native project',
        description: 'Initialize project with Expo, configure navigation, and set up state management.',
        status: 'TODO',
        priority: 'MEDIUM',
        projectIndex: 2,
        assigneeIndex: 4, // mike_dev
        tags: ['setup', 'mobile'],
        estimatedHours: 8,
    },
    {
        title: 'Research offline sync strategies',
        description: 'Evaluate WatermelonDB, Realm, and SQLite for offline-first data persistence.',
        status: 'TODO',
        priority: 'MEDIUM',
        projectIndex: 2,
        tags: ['research', 'database'],
        estimatedHours: 6,
    },

    // Legacy Migration Tasks
    {
        title: 'Audit existing PHP codebase',
        description: 'Document all endpoints, database schemas, and business logic for migration planning.',
        status: 'DONE',
        priority: 'HIGH',
        projectIndex: 3,
        assigneeIndex: 2, // john_dev
        tags: ['analysis', 'documentation'],
        estimatedHours: 40,
    },
    {
        title: 'Create data migration scripts',
        description: 'Build ETL pipeline to transform and migrate data from MySQL to MongoDB.',
        status: 'TODO',
        priority: 'MEDIUM',
        projectIndex: 3,
        tags: ['database', 'migration'],
        estimatedHours: 32,
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a random past date within the last N days
 */
export function getRandomPastDate(maxDaysAgo: number): Date {
    const daysAgo = Math.floor(Math.random() * maxDaysAgo);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
}

/**
 * Get a random future date within the next N days
 */
export function getRandomFutureDate(maxDaysAhead: number): Date {
    const daysAhead = Math.floor(Math.random() * maxDaysAhead) + 1;
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date;
}
