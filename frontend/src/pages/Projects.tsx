import { useEffect, useMemo, useState } from "react";
import { loadProjectsSnapshot } from "../lib/data";
import { cn } from "../lib/utils";
import type { ProjectStatusView, ProjectsSnapshot } from "../lib/types";

const statusConfig = {
    planning: { label: "Planning", className: "bg-slate-100 text-slate-700" },
    active: { label: "Active", className: "bg-cyan-100 text-cyan-700" },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
    "on-hold": { label: "On Hold", className: "bg-amber-100 text-amber-700" },
    archived: { label: "Archived", className: "bg-rose-100 text-rose-700" },
};

export default function Projects() {
    const [snapshot, setSnapshot] = useState<ProjectsSnapshot | null>(null);
    const [filter, setFilter] = useState<"all" | ProjectStatusView>("all");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const next = await loadProjectsSnapshot();

            if (!cancelled) {
                setSnapshot(next);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredProjects = useMemo(() => {
        if (!snapshot) {
            return [];
        }

        return filter === "all"
            ? snapshot.projects
            : snapshot.projects.filter((project) => project.status === filter);
    }, [filter, snapshot]);

    if (!snapshot) {
        return <div className="rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-lg shadow-cyan-950/5">Loading projects...</div>;
    }

    return (
        <div className="space-y-8">
            <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-xl shadow-cyan-950/5 backdrop-blur-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-700">Projects</p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Delivery portfolio at a glance</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                            Browse project health, task coverage, and team allocation across your current workspace.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">{snapshot.mode === "live" ? "Live API session" : "Demo portfolio mode"}</p>
                        <p className="mt-1">{snapshot.note ?? "Connected to your current workspace."}</p>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap gap-2">
                {["all", "planning", "active", "completed", "on-hold", "archived"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status as typeof filter)}
                        className={cn(
                            "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                            filter === status
                                ? "bg-slate-900 text-white"
                                : "bg-white/80 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        {status.replace("-", " ")}
                    </button>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {filteredProjects.map((project) => (
                    <article
                        key={project.id}
                        className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-lg shadow-cyan-950/5 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1"
                    >
                        <div className="h-2" style={{ background: project.color }} />
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">{project.name}</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{project.description}</p>
                                </div>
                                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]", statusConfig[project.status].className)}>
                                    {statusConfig[project.status].label}
                                </span>
                            </div>

                            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${project.progress}%`, background: project.color }}
                                />
                            </div>

                            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                                <span>{project.completedTasks}/{project.tasksCount} tasks complete</span>
                                <span className="font-semibold text-slate-700">{project.progress}%</span>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                                <div className="flex -space-x-2">
                                    {project.members.slice(0, 4).map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-slate-900 to-cyan-700 text-xs font-semibold text-white"
                                            title={member.name}
                                        >
                                            {member.initials}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag) => (
                                        <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {!filteredProjects.length ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
                    No projects match the current filter.
                </div>
            ) : null}
        </div>
    );
}
