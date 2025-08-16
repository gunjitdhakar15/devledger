import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import Toast from "@/components/Toast";

export default function DashboardLayout({ children }) {
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user")) : null;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <ProtectedRoute>
      <Toast />
      <div className="min-h-screen flex flex-col sm:flex-row">
        <aside className="w-full sm:w-64 p-6 bg-zinc-100 border-b sm:border-b-0 sm:border-r">
          <h2 className="text-xl font-bold mb-6">DevLedger</h2>
          {user && <p className="mb-6">Hello, {user.name}</p>}
          <nav className="flex flex-col gap-2">
            <Link href="/dashboard/projects" className="p-2 hover:bg-zinc-200 rounded">Projects</Link>
            <Link href="/dashboard/tasks" className="p-2 hover:bg-zinc-200 rounded">Tasks</Link>
            <button onClick={logout} className="p-2 mt-4 text-left hover:bg-zinc-200 rounded">Logout</button>
          </nav>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
