"use client";
import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-md p-6 flex flex-col space-y-6">
      <h1 className="text-2xl font-bold mb-6">DevLedger</h1>
      <nav className="flex flex-col space-y-3">
        <Link href="/dashboard" className="hover:text-zinc-700">Dashboard</Link>
        <Link href="/dashboard/projects" className="hover:text-zinc-700">Projects</Link>
        <Link href="/dashboard/tasks" className="hover:text-zinc-700">Tasks</Link>
        <Link href="/dashboard/settings" className="hover:text-zinc-700">Settings</Link>
      </nav>
    </div>
  );
}
