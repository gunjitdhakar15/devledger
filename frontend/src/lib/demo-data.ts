import { formatRelativeTime } from "./utils";
import type {
  ActivityItem,
  CurrentUser,
  DashboardSnapshot,
  DashboardStat,
  ProjectView,
  ProjectsSnapshot,
  TaskView,
  TasksSnapshot,
} from "./types";

const now = new Date();

const daysFromNow = (days: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const hoursAgo = (hours: number) => {
  const date = new Date(now);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

export const demoUser: CurrentUser = {
  id: "demo-user",
  name: "Demo Workspace",
  email: "demo@devledger.local",
  role: "DEVELOPER",
  initials: "DW",
};

export const demoProjects: ProjectView[] = [
  {
    id: "project-api-gateway",
    name: "API Gateway",
    description: "Centralize traffic, auth, and rate limiting for internal platform services.",
    status: "active",
    progress: 68,
    tasksCount: 14,
    completedTasks: 9,
    members: [
      { id: "john", name: "John Dev", initials: "JD" },
      { id: "sarah", name: "Sarah Lead", initials: "SL" },
      { id: "mike", name: "Mike Ops", initials: "MO" },
    ],
    color: "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
    tags: ["backend", "security"],
  },
  {
    id: "project-auth",
    name: "Authentication Revamp",
    description: "Ship refresh token rotation and role-aware session handling.",
    status: "completed",
    progress: 100,
    tasksCount: 11,
    completedTasks: 11,
    members: [
      { id: "john", name: "John Dev", initials: "JD" },
      { id: "emily", name: "Emily QA", initials: "EQ" },
    ],
    color: "linear-gradient(135deg, #10b981 0%, #0f766e 100%)",
    tags: ["auth", "rbac"],
  },
  {
    id: "project-dashboard",
    name: "Portfolio Dashboard",
    description: "Design a polished dashboard that still feels useful in demo mode.",
    status: "active",
    progress: 54,
    tasksCount: 13,
    completedTasks: 7,
    members: [
      { id: "sarah", name: "Sarah Lead", initials: "SL" },
      { id: "mike", name: "Mike Ops", initials: "MO" },
      { id: "emily", name: "Emily QA", initials: "EQ" },
    ],
    color: "linear-gradient(135deg, #d946ef 0%, #f43f5e 100%)",
    tags: ["frontend", "ux"],
  },
  {
    id: "project-reports",
    name: "Weekly Reporting",
    description: "Prepare summary exports and productivity snapshots for project leads.",
    status: "planning",
    progress: 24,
    tasksCount: 8,
    completedTasks: 2,
    members: [
      { id: "sarah", name: "Sarah Lead", initials: "SL" },
      { id: "john", name: "John Dev", initials: "JD" },
    ],
    color: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    tags: ["reporting", "automation"],
  },
];

export const demoTasks: TaskView[] = [
  {
    id: "task-refresh",
    title: "Finalize refresh token rotation",
    description: "Keep sessions short-lived while supporting silent renewals.",
    status: "in-progress",
    priority: "high",
    project: "Authentication Revamp",
    assignee: "JD",
    assigneeName: "John Dev",
    dueDate: daysFromNow(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: "task-rbac",
    title: "Lock down manager-only reporting routes",
    description: "Ensure leads can view summaries without admin-level write access.",
    status: "review",
    priority: "high",
    project: "Weekly Reporting",
    assignee: "SL",
    assigneeName: "Sarah Lead",
    dueDate: daysFromNow(4),
    updatedAt: hoursAgo(4),
  },
  {
    id: "task-dashboard",
    title: "Connect dashboard cards to live metrics",
    description: "Show API-backed numbers when a token is available, otherwise use demo data.",
    status: "todo",
    priority: "medium",
    project: "Portfolio Dashboard",
    assignee: "MO",
    assigneeName: "Mike Ops",
    dueDate: daysFromNow(5),
    updatedAt: hoursAgo(6),
  },
  {
    id: "task-qa",
    title: "Regression-test project filters",
    description: "Validate filters, empty states, and task counts across statuses.",
    status: "done",
    priority: "medium",
    project: "Portfolio Dashboard",
    assignee: "EQ",
    assigneeName: "Emily QA",
    dueDate: daysFromNow(-1),
    updatedAt: hoursAgo(10),
  },
  {
    id: "task-seed",
    title: "Document seeded demo accounts",
    description: "Keep the README aligned with demo-friendly login credentials.",
    status: "blocked",
    priority: "low",
    project: "Authentication Revamp",
    assignee: "JD",
    assigneeName: "John Dev",
    dueDate: daysFromNow(7),
    updatedAt: hoursAgo(18),
  },
  {
    id: "task-analytics",
    title: "Surface overdue tasks in the dashboard",
    description: "Highlight delivery risk with a clear visual signal.",
    status: "in-progress",
    priority: "urgent",
    project: "API Gateway",
    assignee: "SL",
    assigneeName: "Sarah Lead",
    dueDate: daysFromNow(1),
    updatedAt: hoursAgo(1),
  },
];

function buildStats(): DashboardStat[] {
  const totalProjects = demoProjects.length;
  const activeProjects = demoProjects.filter((project) => project.status === "active").length;
  const totalTasks = demoTasks.length;
  const completedTasks = demoTasks.filter((task) => task.status === "done").length;
  const overdue = demoTasks.filter(
    (task) => task.status !== "done" && new Date(task.dueDate) < now
  ).length;

  return [
    {
      name: "Projects in Flight",
      value: String(totalProjects),
      change: `+${activeProjects} active`,
      tone: "positive",
      icon: "📁",
      hint: "Cross-team visibility across planning and delivery.",
    },
    {
      name: "Execution Rate",
      value: `${Math.round((completedTasks / totalTasks) * 100)}%`,
      change: `${completedTasks}/${totalTasks} tasks done`,
      tone: "positive",
      icon: "✅",
      hint: "Completion trend based on current sprint work.",
    },
    {
      name: "High Priority Focus",
      value: String(demoTasks.filter((task) => task.priority === "high" || task.priority === "urgent").length),
      change: `${overdue} overdue`,
      tone: overdue > 0 ? "warning" : "neutral",
      icon: "⚡",
      hint: "Urgent and high-priority work needing attention.",
    },
    {
      name: "Team Coverage",
      value: String(
        new Set(demoProjects.flatMap((project) => project.members.map((member) => member.id))).size
      ),
      change: "RBAC-ready roles",
      tone: "neutral",
      icon: "👥",
      hint: "Members represented across active delivery streams.",
    },
  ];
}

function buildActivity(): ActivityItem[] {
  return demoTasks
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5)
    .map((task) => ({
      id: task.id,
      action:
        task.status === "done"
          ? "closed task"
          : task.status === "review"
            ? "moved task to review"
            : "updated task",
      subject: task.title,
      time: formatRelativeTime(task.updatedAt),
      user: task.assigneeName,
    }));
}

export function getDemoDashboardSnapshot(note?: string): DashboardSnapshot {
  return {
    mode: "demo",
    note,
    user: demoUser,
    stats: buildStats(),
    recentActivity: buildActivity(),
    projects: demoProjects,
    tasks: demoTasks,
  };
}

export function getDemoProjectsSnapshot(note?: string): ProjectsSnapshot {
  return {
    mode: "demo",
    note,
    user: demoUser,
    projects: demoProjects,
  };
}

export function getDemoTasksSnapshot(note?: string): TasksSnapshot {
  return {
    mode: "demo",
    note,
    user: demoUser,
    tasks: demoTasks,
  };
}
