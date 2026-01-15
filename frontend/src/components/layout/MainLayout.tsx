import { Outlet, NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: "📊" },
    { name: "Projects", href: "/projects", icon: "📁" },
    { name: "Tasks", href: "/tasks", icon: "✅" },
];

export default function MainLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                        DL
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">DevLedger</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Project Management</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )
                            }
                        >
                            <span className="text-lg">{item.icon}</span>
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm">
                            U
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">User</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">user@example.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="pl-64">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
