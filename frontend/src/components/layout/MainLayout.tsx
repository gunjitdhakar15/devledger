import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { clearSession, isDemoMode } from "../../lib/session";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: "📊" },
    { name: "Projects", href: "/projects", icon: "📁" },
    { name: "Tasks", href: "/tasks", icon: "✅" },
];

export default function MainLayout() {
    const navigate = useNavigate();
    const modeLabel = isDemoMode() ? "Demo Mode" : "Live API";

    const handleLogout = () => {
        clearSession();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.14),_transparent_38%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_40%,_#f8fafc_100%)] text-slate-900">
            <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:hidden">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-sm font-bold text-white shadow-glow">
                                DL
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-700">
                                    DevLedger
                                </p>
                                <p className="text-xs text-slate-500">Project management workspace</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                            Sign Out
                        </button>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                            {modeLabel}
                        </span>
                        <p className="text-xs text-slate-500">Hash routing keeps static deploys simple.</p>
                    </div>
                </div>
                <div className="mx-auto hidden max-w-7xl items-center justify-between px-6 py-4 lg:flex">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-base font-bold text-white shadow-glow">
                            DL
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-cyan-700">
                                DevLedger
                            </p>
                            <h1 className="text-lg font-semibold text-slate-900">RBAC-ready project delivery dashboard</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                            {modeLabel}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-6">
                <aside className="hidden w-72 shrink-0 lg:block">
                    <div className="rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-xl shadow-cyan-950/5 backdrop-blur-xl">
                        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-5 text-white">
                            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Workspace</p>
                            <h2 className="mt-3 text-2xl font-semibold">Ship the portfolio version.</h2>
                            <p className="mt-3 text-sm leading-6 text-slate-200">
                                Demo mode gives you a clean showcase, while live mode can pull directly from the backend once a token is available.
                            </p>
                        </div>
                        <nav className="mt-4 space-y-1">
                            {navigation.map((item) => (
                                <NavLink
                                    key={item.name}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/15"
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        )
                                    }
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    {item.name}
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-white/70 p-2 shadow-lg shadow-cyan-950/5 backdrop-blur-xl lg:hidden">
                        {navigation.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                className={({ isActive }) =>
                                    cn(
                                        "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all",
                                        isActive
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    )
                                }
                            >
                                {item.icon} {item.name}
                            </NavLink>
                        ))}
                    </nav>

                    <Outlet />
                </main>
            </div>
        </div>
    );
}
