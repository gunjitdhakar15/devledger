"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        // If not logged in, redirect to login page
        router.push("/");
      }
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
      <Card className="p-8 w-full max-w-md shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome, {user.name}!</h2>
        <p className="mb-6">Email: {user.email}</p>
        <Button onClick={handleLogout} className="w-full">
          Logout
        </Button>
      </Card>
    </div>
  );
}
