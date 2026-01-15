import { cn } from "../lib/utils";

const stats = [
    { name: "Total Projects", value: "12", change: "+2", changeType: "positive", icon: "📁" },
    { name: "Active Tasks", value: "48", change: "+8", changeType: "positive", icon: "✅" },
    { name: "Completed", value: "156", change: "+23", changeType: "positive", icon: "🎉" },
    { name: "Team Members", value: "8", change: "0", changeType: "neutral", icon: "👥" },
];

const recentActivity = [
    { id: 1, action: "Created new project", project: "API Gateway", time: "2 hours ago", user: "John" },
    { id: 2, action: "Completed task", project: "User Auth", time: "4 hours ago", user: "Sarah" },
    { id: 3, action: "Added comment", project: "Dashboard UI", time: "5 hours ago", user: "Mike" },
    { id: 4, action: "Updated status", project: "Database Migration", time: "1 day ago", user: "Emily" },
];

export default function Dashboard() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back! Here's what's happening with your projects.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-3xl">{stat.icon}</span>
                            <span
                                className={cn(
                                    "text-xs font-medium px-2 py-1 rounded-full",
                                    stat.changeType === "positive" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                    stat.changeType === "negative" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                    stat.changeType === "neutral" && "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                                )}
                            >
                                {stat.change}
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.name}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {recentActivity.map((activity) => (
                        <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                                    {activity.user[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        <span className="font-semibold">{activity.user}</span> {activity.action}
                                    </p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">{activity.project}</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
