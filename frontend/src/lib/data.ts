import { api, projectsApi, tasksApi, usersApi, type ApiError } from "./api";
import {
  getDemoDashboardSnapshot,
  getDemoProjectsSnapshot,
  getDemoTasksSnapshot,
} from "./demo-data";
import { getAuthToken, isDemoMode } from "./session";
import { formatRelativeTime } from "./utils";
import type {
  ActivityItem,
  CurrentUser,
  DashboardSnapshot,
  DashboardStat,
  ProjectMember,
  ProjectStatusView,
  ProjectView,
  ProjectsSnapshot,
  TaskPriorityView,
  TasksSnapshot,
  TaskStatusView,
  TaskView,
} from "./types";

type AnyRecord = Record<string, unknown>;

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function mapUser(user: AnyRecord): CurrentUser {
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    (user.username as string | undefined) ||
    (user.email as string).split("@")[0];

  return {
    id: String(user.id),
    name,
    email: String(user.email),
    role: String(user.role),
    initials: getInitials(name),
  };
}

function mapProjectStatus(status: string): ProjectStatusView {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "ON_HOLD":
      return "on-hold";
    case "COMPLETED":
      return "completed";
    case "ARCHIVED":
      return "archived";
    default:
      return "planning";
  }
}

function mapTaskStatus(status: string): TaskStatusView {
  switch (status) {
    case "IN_PROGRESS":
      return "in-progress";
    case "IN_REVIEW":
      return "review";
    case "DONE":
      return "done";
    case "BLOCKED":
      return "blocked";
    default:
      return "todo";
  }
}

function mapPriority(priority: string): TaskPriorityView {
  switch (priority) {
    case "LOW":
      return "low";
    case "HIGH":
      return "high";
    case "URGENT":
      return "urgent";
    default:
      return "medium";
  }
}

function mapMembers(value: unknown): ProjectMember[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((member) => {
    const record = member as AnyRecord;
    const name = String(record.username ?? record.name ?? "Member");

    return {
      id: String(record.id ?? record._id ?? name),
      name,
      initials: getInitials(name),
    };
  });
}

function mapTask(task: AnyRecord): TaskView {
  const assignee = (task.assignee as AnyRecord | null) ?? null;
  const assigneeName = String(assignee?.username ?? "Unassigned");
  const projectRecord = (task.project as AnyRecord | null) ?? null;
  const projectName = String(task.projectName ?? projectRecord?.name ?? task.project ?? "Unknown Project");

  return {
    id: String(task.id),
    title: String(task.title),
    description: String(task.description ?? "No description provided."),
    status: mapTaskStatus(String(task.status)),
    priority: mapPriority(String(task.priority)),
    project: projectName,
    assignee: assignee ? getInitials(assigneeName) : "NA",
    assigneeName,
    dueDate: String(task.dueDate ?? new Date().toISOString()),
    updatedAt: String(task.updatedAt ?? task.createdAt ?? new Date().toISOString()),
  };
}

function buildProjectMetrics(project: AnyRecord, tasks: TaskView[]): ProjectView {
  const projectTasks = tasks.filter((task) => task.project === String(project.name));
  const completedTasks = projectTasks.filter((task) => task.status === "done").length;
  const tasksCount = projectTasks.length;
  const status = mapProjectStatus(String(project.status));
  const fallbackProgress =
    status === "completed"
      ? 100
      : tasksCount > 0
        ? Math.round((completedTasks / tasksCount) * 100)
        : status === "active"
          ? 55
          : status === "planning"
            ? 20
            : 35;

  return {
    id: String(project.id),
    name: String(project.name),
    description: String(project.description ?? "No description provided yet."),
    status,
    progress: fallbackProgress,
    tasksCount,
    completedTasks,
    members: mapMembers(project.members),
    color: normalizeProjectColor(project.color),
    tags: Array.isArray(project.tags) ? (project.tags as string[]) : [],
  };
}

function normalizeProjectColor(value: unknown): string {
  if (typeof value === "string" && value.startsWith("linear-gradient")) {
    return value;
  }

  if (typeof value === "string" && value.startsWith("#")) {
    return `linear-gradient(135deg, ${value} 0%, #0f766e 100%)`;
  }

  return "linear-gradient(135deg, #0f172a 0%, #0f766e 100%)";
}

function buildDashboardStats(projects: ProjectView[], tasks: TaskView[], apiStats?: AnyRecord): DashboardStat[] {
  const completed = tasks.filter((task) => task.status === "done").length;
  const overdue = tasks.filter(
    (task) => task.status !== "done" && new Date(task.dueDate).getTime() < Date.now()
  ).length;
  const totalProjects = Number(apiStats?.totalProjects ?? projects.length);
  const activeProjects = projects.filter((project) => project.status === "active").length;

  return [
    {
      name: "Projects in Flight",
      value: String(totalProjects),
      change: `${activeProjects} active`,
      tone: activeProjects > 0 ? "positive" : "neutral",
      icon: "📁",
      hint: "Projects visible to the current session.",
    },
    {
      name: "Task Completion",
      value: tasks.length ? `${Math.round((completed / tasks.length) * 100)}%` : "0%",
      change: `${completed}/${tasks.length} done`,
      tone: completed > 0 ? "positive" : "neutral",
      icon: "✅",
      hint: "Completion rate based on available task data.",
    },
    {
      name: "Delivery Risk",
      value: String(overdue),
      change: overdue > 0 ? "Needs attention" : "On track",
      tone: overdue > 0 ? "warning" : "neutral",
      icon: "⚠️",
      hint: "Tasks past due date and not yet completed.",
    },
    {
      name: "High Priority Work",
      value: String(tasks.filter((task) => task.priority === "high" || task.priority === "urgent").length),
      change: "RBAC-tracked workload",
      tone: "neutral",
      icon: "⚡",
      hint: "High-impact tasks across the workspace.",
    },
  ];
}

function buildRecentActivity(tasks: TaskView[]): ActivityItem[] {
  return tasks
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6)
    .map((task) => ({
      id: task.id,
      action:
        task.status === "done"
          ? "completed task"
          : task.status === "review"
            ? "moved task to review"
            : "updated task",
      subject: task.title,
      time: formatRelativeTime(task.updatedAt),
      user: task.assigneeName,
    }));
}

function getFallbackReason(error: unknown): string {
  const apiError = error as ApiError | undefined;

  if (apiError?.statusCode === 401) {
    return "Showing demo data because the API needs an authenticated session.";
  }

  if (apiError?.message) {
    return `Showing demo data because the live API is unavailable: ${apiError.message}`;
  }

  return "Showing demo data because the live API could not be reached.";
}

async function loadLiveWorkspace() {
  const [user, projects, projectStats, tasks] = await Promise.all([
    usersApi.me(),
    projectsApi.getAll({ limit: 12 }),
    projectsApi.getStats(),
    tasksApi.getAll({ limit: 24 }),
  ]);

  const mappedTasks = tasks.map((task) => mapTask(task as AnyRecord));
  const mappedProjects = projects.map((project) => buildProjectMetrics(project as AnyRecord, mappedTasks));

  return {
    user: mapUser(user as AnyRecord),
    projects: mappedProjects,
    projectStats: projectStats as AnyRecord,
    tasks: mappedTasks,
  };
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (isDemoMode() || !getAuthToken()) {
    return getDemoDashboardSnapshot(
      isDemoMode()
        ? "Demo mode is on. Use the seeded credentials to switch to a live API session."
        : "No API session found, so the dashboard is showing portfolio-ready demo data."
    );
  }

  try {
    const { user, projects, projectStats, tasks } = await loadLiveWorkspace();

    return {
      mode: "live",
      user,
      projects,
      tasks,
      stats: buildDashboardStats(projects, tasks, projectStats),
      recentActivity: buildRecentActivity(tasks),
    };
  } catch (error) {
    api.setToken(null);
    return getDemoDashboardSnapshot(getFallbackReason(error));
  }
}

export async function loadProjectsSnapshot(): Promise<ProjectsSnapshot> {
  if (isDemoMode() || !getAuthToken()) {
    return getDemoProjectsSnapshot(
      "Projects are currently using demo data. Sign in to swap in live MongoDB-backed records."
    );
  }

  try {
    const { user, projects } = await loadLiveWorkspace();
    return {
      mode: "live",
      user,
      projects,
    };
  } catch (error) {
    api.setToken(null);
    return getDemoProjectsSnapshot(getFallbackReason(error));
  }
}

export async function loadTasksSnapshot(): Promise<TasksSnapshot> {
  if (isDemoMode() || !getAuthToken()) {
    return getDemoTasksSnapshot(
      "Tasks are currently using demo data. Sign in to browse live project work."
    );
  }

  try {
    const { user, tasks } = await loadLiveWorkspace();
    return {
      mode: "live",
      user,
      tasks,
    };
  } catch (error) {
    api.setToken(null);
    return getDemoTasksSnapshot(getFallbackReason(error));
  }
}
