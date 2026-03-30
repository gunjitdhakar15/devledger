import { useEffect, useMemo, useState } from "react";
import { loadTasksSnapshot } from "../lib/data";
import { formatDate, cn } from "../lib/utils";
import type { TasksSnapshot } from "../lib/types";

const statusColumns = [
    { key: "todo", label: "To Do", color: "bg-slate-400" },
    { key: "in-progress", label: "In Progress", color: "bg-cyan-500" },
    { key: "review", label: "In Review", color: "bg-amber-500" },
    { key: "done", label: "Done", color: "bg-emerald-500" },
    { key: "blocked", label: "Blocked", color: "bg-rose-500" },
];

const priorityConfig = {
    low: { label: "Low", className: "bg-slate-100 text-slate-600" },
    medium: { label: "Medium", className: "bg-amber-100 text-amber-700" },
    high: { label: "High", className: "bg-rose-100 text-rose-700" },
    urgent: { label: "Urgent", className: "bg-violet-100 text-violet-700" },
};

export default function Tasks() {
    const [snapshot, setSnapshot] = useState<TasksSnapshot | null>(null);
    const [view, setView] = useState<"board" | "list">("board");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const next = await loadTasksSnapshot();

            if (!cancelled) {
                setSnapshot(next);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const groupedTasks = useMemo(() => {
        if (!snapshot) {
            return [];
        }

        return statusColumns.map((column) => ({
            ...column,
            tasks: snapshot.tasks.filter((task) => task.status === column.key),
        }));
    }, [snapshot]);

    if (!snapshot) {
        return <div className="rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-lg shadow-cyan-950/5">Loading tasks...</div>;
    }

    return (
        <div className="space-y-8">
            <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-xl shadow-cyan-950/5 backdrop-blur-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-700">Tasks</p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Execution board with portfolio-safe fallback</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                            Browse your work as a Kanban board or a detail list. Demo mode keeps the UI useful even before the backend is fully wired up.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">{snapshot.mode === "live" ? "Live API session" : "Demo portfolio mode"}</p>
                        <p className="mt-1">{snapshot.note ?? "Connected to the current task workspace."}</p>
                    </div>
                </div>
            </section>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-white/70 p-2 shadow-lg shadow-cyan-950/5 backdrop-blur-xl">
                    <div className="flex rounded-xl bg-slate-100 p-1">
                        <button
                            onClick={() => setView("board")}
                            className={cn(
                                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                                view === "board" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                            )}
                        >
                            Board
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn(
                                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                                view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                            )}
                        >
                            List
                        </button>
                    </div>

                    {statusColumns.map((column) => (
                        <div key={column.key} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span className={cn("h-2.5 w-2.5 rounded-full", column.color)} />
                            {column.label}
                        </div>
                    ))}
                </div>
            </div>

            {view === "board" && (
                <div className="grid gap-6 xl:grid-cols-5">
                    {groupedTasks.map((column) => (
                        <section key={column.key} className="space-y-4 rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-lg shadow-cyan-950/5 backdrop-blur-xl">
                            <div className="flex items-center gap-2">
                                <div className={cn("h-3 w-3 rounded-full", column.color)} />
                                <h3 className="font-semibold text-slate-900">{column.label}</h3>
                                <span className="text-sm text-slate-500">({column.tasks.length})</span>
                            </div>

                            <div className="space-y-3">
                                {column.tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityConfig[task.priority].className)}>
                                                {priorityConfig[task.priority].label}
                                            </span>
                                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                                                {task.assignee}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-slate-900">{task.title}</h4>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{task.description}</p>
                                        <div className="mt-4 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">{task.project}</p>
                                                <p className="mt-1 text-xs text-slate-400">Due {formatDate(task.dueDate)}</p>
                                            </div>
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-cyan-700 text-xs font-semibold text-white">
                                                {task.assignee}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!column.tasks.length ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                                        No tasks here yet.
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {view === "list" && (
                <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-lg shadow-cyan-950/5 backdrop-blur-xl">
                    <table className="w-full">
                        <thead className="bg-slate-50/90">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Task</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assignee</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {snapshot.tasks.map((task) => (
                                <tr key={task.id} className="transition-colors hover:bg-slate-50/70">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900">{task.title}</p>
                                        <p className="text-sm text-slate-500">{task.description}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-cyan-700">{task.project}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                                            task.status === "done" && "bg-emerald-100 text-emerald-700",
                                            task.status === "in-progress" && "bg-cyan-100 text-cyan-700",
                                            task.status === "review" && "bg-amber-100 text-amber-700",
                                            task.status === "todo" && "bg-slate-100 text-slate-600",
                                            task.status === "blocked" && "bg-rose-100 text-rose-700"
                                        )}>
                                            {task.status.replace("-", " ")}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", priorityConfig[task.priority].className)}>
                                            {priorityConfig[task.priority].label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(task.dueDate)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-cyan-700 text-xs font-semibold text-white" title={task.assigneeName}>
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
