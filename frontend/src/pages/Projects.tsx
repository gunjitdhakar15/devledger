import { useState } from "react";
import { cn } from "../lib/utils";

interface Project {
    id: string;
    name: string;
    description: string;
    status: "active" | "completed" | "on-hold";
    progress: number;
    tasksCount: number;
    completedTasks: number;
    members: string[];
    color: string;
}

const mockProjects: Project[] = [
    {
        id: "1",
        name: "API Gateway",
        description: "Build a centralized API gateway for microservices",
        status: "active",
        progress: 65,
        tasksCount: 24,
        completedTasks: 16,
        members: ["JD", "SK", "MP"],
        color: "from-blue-500 to-cyan-500",
    },
    {
        id: "2",
        name: "User Authentication",
        description: "Implement OAuth2 and JWT authentication system",
        status: "completed",
        progress: 100,
        tasksCount: 18,
        completedTasks: 18,
        members: ["JD", "EM"],
        color: "from-green-500 to-emerald-500",
    },
    {
        id: "3",
        name: "Dashboard UI",
        description: "Design and implement the admin dashboard interface",
        status: "active",
        progress: 40,
        tasksCount: 32,
        completedTasks: 13,
        members: ["SK", "MP", "EM", "JD"],
        color: "from-purple-500 to-pink-500",
    },
    {
        id: "4",
        name: "Database Migration",
        description: "Migrate from PostgreSQL to MongoDB",
        status: "on-hold",
        progress: 25,
        tasksCount: 12,
        completedTasks: 3,
        members: ["MP"],
        color: "from-orange-500 to-red-500",
    },
];

const statusConfig = {
    active: { label: "Active", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    completed: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    "on-hold": { label: "On Hold", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
};

export default function Projects() {
    const [filter, setFilter] = useState<"all" | "active" | "completed" | "on-hold">("all");

    const filteredProjects = filter === "all"
        ? mockProjects
        : mockProjects.filter(p => p.status === filter);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projects</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track your project progress</p>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200">
                    + Create Project
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {["all", "active", "completed", "on-hold"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status as typeof filter)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            filter === status
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        )}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                    </button>
                ))}
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProjects.map((project) => (
                    <div
                        key={project.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                    >
                        {/* Gradient Header */}
                        <div className={cn("h-2 bg-gradient-to-r", project.color)} />

                        <div className="p-6">
                            {/* Title and Status */}
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {project.name}
                                </h3>
                                <span className={cn("text-xs font-medium px-2 py-1 rounded-full", statusConfig[project.status].className)}>
                                    {statusConfig[project.status].label}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{project.description}</p>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-slate-600 dark:text-slate-300">Progress</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{project.progress}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", project.color)}
                                        style={{ width: `${project.progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex -space-x-2">
                                    {project.members.slice(0, 3).map((member, i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-slate-800"
                                        >
                                            {member}
                                        </div>
                                    ))}
                                    {project.members.length > 3 && (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-medium border-2 border-white dark:border-slate-800">
                                            +{project.members.length - 3}
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {project.completedTasks}/{project.tasksCount} tasks
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
