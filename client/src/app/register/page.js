"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/users/register", { name, email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      showToast("Registration successful", "success");
      router.push("/dashboard/projects");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Registration failed", "error");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 p-4">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-4"
        />
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          className="mb-4"
        />
        <Input
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          className="mb-4"
        />
        <Button type="submit" className="w-full mb-2">Register</Button>
        <p className="text-center text-zinc-600">
          Already have an account? <Link href="/login" className="text-blue-500">Login</Link>
        </p>
      </form>
    </div>
  );
}
