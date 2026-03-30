import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";
import { clearSession, setDemoMode } from "../lib/session";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("admin@devledger.com");
    const [password, setPassword] = useState("Admin@123456");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await authApi.login(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError((err as { message?: string }).message ?? "Unable to sign in right now.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDemoMode = () => {
        clearSession();
        setDemoMode(true);
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,_#ecfeff_0%,_#f8fafc_45%,_#eef2ff_100%)] px-4 py-10 text-slate-900 sm:px-6">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-8 text-white shadow-2xl shadow-cyan-950/15 sm:p-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.4em] text-cyan-200">DevLedger</p>
                    <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
                        Finish the project, then show it like it already belongs on your resume.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                        This frontend supports both live API sessions and a portfolio-safe demo mode, so you can deploy it now and connect the backend as soon as your Atlas credentials are ready.
                    </p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-cyan-200">Secure RBAC</p>
                            <p className="mt-2 text-2xl font-semibold">4 roles</p>
                            <p className="mt-2 text-sm text-slate-300">Admin, Manager, Developer, Viewer.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-cyan-200">Delivery Tracking</p>
                            <p className="mt-2 text-2xl font-semibold">Projects + Tasks</p>
                            <p className="mt-2 text-sm text-slate-300">Live mode uses the Fastify API, demo mode keeps the UI deployable.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-cyan-200">Static Friendly</p>
                            <p className="mt-2 text-2xl font-semibold">Hash routing</p>
                            <p className="mt-2 text-sm text-slate-300">Deploy to free static hosting without extra rewrite rules.</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl sm:p-10">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-700">Access</p>
                            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Sign in or use demo mode</h2>
                        </div>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                            Portfolio MVP
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                            <input
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                type="email"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                                placeholder="admin@devledger.com"
                                autoComplete="email"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                            <input
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                type="password"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                                placeholder="Admin@123456"
                                autoComplete="current-password"
                            />
                        </label>

                        {error ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {error}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "Signing in..." : "Sign In to Live API"}
                        </button>
                    </form>

                    <button
                        onClick={handleDemoMode}
                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                    >
                        Continue in Demo Mode
                    </button>

                    <div className="mt-8 rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">Seeded credentials</p>
                        <p className="mt-2 text-sm text-slate-600">Admin: <code>admin@devledger.com</code> / <code>Admin@123456</code></p>
                        <p className="mt-1 text-sm text-slate-600">Manager: <code>sarah.manager@devledger.com</code> / <code>Manager@123456</code></p>
                        <p className="mt-4 text-xs leading-6 text-slate-500">
                            If the backend is offline or MongoDB is not connected yet, demo mode keeps the UI deployable and portfolio-ready.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
