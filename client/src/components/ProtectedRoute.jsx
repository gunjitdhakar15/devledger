"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    else setIsAuthenticated(true);
  }, [router]);

  if (!isAuthenticated) return <p className="text-center mt-20">Checking authentication...</p>;
  return children;
}
