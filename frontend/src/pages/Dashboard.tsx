import { useEffect, useState } from "react";
import { loadDashboardSnapshot } from "../lib/data";
import { cn } from "../lib/utils";
import type { DashboardSnapshot } from "../lib/types";

export default function Dashboard() {
    const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            const next = await loadDashboardSnapshot();

            if (!cancelled) {
                setSnapshot(next);
                setIsLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    if (isLoading || !snapshot) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse rounded-[28px] border border-white/70 bg-white/80 p-8">
                    <div className="h-4 w-32 rounded-full bg-slate-200" />
                    <div className="mt-4 h-10 w-72 rounded-full bg-slate-200" />
                    <div className="mt-4 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-[24px] border border-white/70 bg-white/80 p-6">
                            <div className="h-10 w-10 rounded-2xl bg-slate-100" />
                            <div className="mt-5 h-8 w-24 rounded-full bg-slate-200" />
                            <div className="mt-3 h-4 w-36 rounded-full bg-slate-100" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-xl shadow-cyan-950/5 backdrop-blur-xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-700">Dashboard</p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
                            {snapshot.user.name}, your delivery view is ready.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                            DevLedger is currently running in <span className="font-semibold text-slate-900">{snapshot.mode}</span> mode.
                            The dashboard keeps a clean portfolio presentation even when the backend is unavailable.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-cyan-100 bg-cyan-50/80 px-5 py-4 text-sm text-cyan-900">
                        <p className="font-semibold">{snapshot.user.role}</p>
                        <p className="mt-1 text-cyan-800">{snapshot.user.email}</p>
                    </div>
                </div>

                {snapshot.note ? (
                    <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
                        {snapshot.note}
                    </div>
                ) : null}
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {snapshot.stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-lg shadow-cyan-950/5 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-3xl">{stat.icon}</span>
                            <span
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs font-semibold",
                                    stat.tone === "positive" && "bg-emerald-100 text-emerald-700",
                                    stat.tone === "warning" && "bg-amber-100 text-amber-700",
                                    stat.tone === "neutral" && "bg-slate-100 text-slate-600"
                                )}
                            >
                                {stat.change}
                            </span>
                        </div>
                        <p className="mt-6 text-4xl font-semibold text-slate-900">{stat.value}</p>
                        <p className="mt-2 text-sm font-medium text-slate-700">{stat.name}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-500">{stat.hint}</p>
                    </div>
                ))}
            </div>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-lg shadow-cyan-950/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">Recent activity</h2>
                            <p className="mt-1 text-sm text-slate-500">A quick view of the most recent task movement.</p>
                        </div>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                            {snapshot.recentActivity.length} updates
                        </span>
                    </div>

                    <div className="mt-6 divide-y divide-slate-200">
                        {snapshot.recentActivity.map((activity) => (
                            <div key={activity.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-sm font-semibold text-white">
                                        {activity.user
                                            .split(" ")
                                            .map((part) => part[0])
                                            .join("")
                                            .slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            <span className="font-semibold">{activity.user}</span> {activity.action}
                                        </p>
                                        <p className="mt-1 text-sm text-cyan-700">{activity.subject}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                                    {activity.time}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-lg shadow-cyan-950/5 backdrop-blur-xl">
                    <h2 className="text-xl font-semibold text-slate-900">Project pulse</h2>
                    <p className="mt-1 text-sm text-slate-500">The most visible projects in the current session.</p>

                    <div className="mt-6 space-y-4">
                        {snapshot.projects.slice(0, 4).map((project) => (
                            <div
                                key={project.id}
                                className="rounded-3xl border border-slate-100 bg-slate-50/90 p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{project.name}</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">{project.description}</p>
                                    </div>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        {project.status.replace("-", " ")}
                                    </span>
                                </div>

                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full"
                                        style={{ width: `${project.progress}%`, background: project.color }}
                                    />
                                </div>

                                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                                    <span>{project.completedTasks}/{project.tasksCount} tasks complete</span>
                                    <span className="font-semibold text-slate-700">{project.progress}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
