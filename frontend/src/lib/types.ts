export type AppMode = "demo" | "live";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}

export interface DashboardStat {
  name: string;
  value: string;
  change: string;
  tone: "positive" | "neutral" | "warning";
  icon: string;
  hint: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  subject: string;
  time: string;
  user: string;
}

export type ProjectStatusView =
  | "planning"
  | "active"
  | "on-hold"
  | "completed"
  | "archived";

export interface ProjectMember {
  id: string;
  name: string;
  initials: string;
}

export interface ProjectView {
  id: string;
  name: string;
  description: string;
  status: ProjectStatusView;
  progress: number;
  tasksCount: number;
  completedTasks: number;
  members: ProjectMember[];
  color: string;
  tags: string[];
}

export type TaskStatusView =
  | "todo"
  | "in-progress"
  | "review"
  | "done"
  | "blocked";

export type TaskPriorityView = "low" | "medium" | "high" | "urgent";

export interface TaskView {
  id: string;
  title: string;
  description: string;
  status: TaskStatusView;
  priority: TaskPriorityView;
  project: string;
  assignee: string;
  assigneeName: string;
  dueDate: string;
  updatedAt: string;
}

export interface SnapshotBase {
  mode: AppMode;
  note?: string;
  user: CurrentUser;
}

export interface DashboardSnapshot extends SnapshotBase {
  stats: DashboardStat[];
  recentActivity: ActivityItem[];
  projects: ProjectView[];
  tasks: TaskView[];
}

export interface ProjectsSnapshot extends SnapshotBase {
  projects: ProjectView[];
}

export interface TasksSnapshot extends SnapshotBase {
  tasks: TaskView[];
}
