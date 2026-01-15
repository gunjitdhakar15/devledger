import { useState } from "react";
import { cn } from "../lib/utils";

interface Task {
    id: string;
    title: string;
    description: string;
    status: "todo" | "in-progress" | "review" | "done";
    priority: "low" | "medium" | "high";
    project: string;
    assignee: string;
    dueDate: string;
}

const mockTasks: Task[] = [
    { id: "1", title: "Implement JWT refresh tokens", description: "Add refresh token logic to auth flow", status: "in-progress", priority: "high", project: "User Auth", assignee: "JD", dueDate: "2026-01-18" },
    { id: "2", title: "Design settings page", description: "Create wireframes for user settings", status: "todo", priority: "medium", project: "Dashboard UI", assignee: "SK", dueDate: "2026-01-20" },
    { id: "3", title: "Write API documentation", description: "Document all REST endpoints", status: "review", priority: "medium", project: "API Gateway", assignee: "MP", dueDate: "2026-01-16" },
    { id: "4", title: "Fix login redirect bug", description: "Users not redirected after login", status: "done", priority: "high", project: "User Auth", assignee: "EM", dueDate: "2026-01-14" },
    { id: "5", title: "Add rate limiting", description: "Implement rate limiting middleware", status: "todo", priority: "high", project: "API Gateway", assignee: "JD", dueDate: "2026-01-22" },
    { id: "6", title: "Create data backup script", description: "Automate daily database backups", status: "in-progress", priority: "low", project: "Database Migration", assignee: "MP", dueDate: "2026-01-25" },
];

const statusColumns = [
    { key: "todo", label: "To Do", color: "bg-slate-400" },
    { key: "in-progress", label: "In Progress", color: "bg-blue-500" },
    { key: "review", label: "In Review", color: "bg-yellow-500" },
    { key: "done", label: "Done", color: "bg-green-500" },
];

const priorityConfig = {
    low: { label: "Low", className: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
    medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    high: { label: "High", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function Tasks() {
    const [view, setView] = useState<"board" | "list">("board");

    const getTasksByStatus = (status: string) => mockTasks.filter(t => t.status === status);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tasks</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage your tasks across projects</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setView("board")}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                view === "board" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500"
                            )}
                        >
                            Board
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                view === "list" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500"
                            )}
                        >
                            List
                        </button>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200">
                        + Add Task
                    </button>
                </div>
            </div>

            {/* Board View */}
            {view === "board" && (
                <div className="grid grid-cols-4 gap-6">
                    {statusColumns.map((column) => (
                        <div key={column.key} className="space-y-4">
                            {/* Column Header */}
                            <div className="flex items-center gap-2">
                                <div className={cn("w-3 h-3 rounded-full", column.color)} />
                                <h3 className="font-semibold text-slate-900 dark:text-white">{column.label}</h3>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    ({getTasksByStatus(column.key).length})
                                </span>
                            </div>

                            {/* Tasks */}
                            <div className="space-y-3">
                                {getTasksByStatus(column.key).map((task) => (
                                    <div
                                        key={task.id}
                                        className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", priorityConfig[task.priority].className)}>
                                                {priorityConfig[task.priority].label}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {task.title}
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{task.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{task.project}</span>
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                                                {task.assignee}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* List View */}
            {view === "list" && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignee</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {mockTasks.map((task) => (
                                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900 dark:text-white">{task.title}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400 font-medium">{task.project}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "text-xs font-medium px-2 py-1 rounded-full",
                                            task.status === "done" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                            task.status === "in-progress" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                            task.status === "review" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                            task.status === "todo" && "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                        )}>
                                            {task.status.replace("-", " ")}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", priorityConfig[task.priority].className)}>
                                            {priorityConfig[task.priority].label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{task.dueDate}</td>
                                    <td className="px-6 py-4">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                                            {task.assignee}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
