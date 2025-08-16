"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      {user && (
        <div className="flex items-center space-x-4">
          <p>{user.name}</p>
          <Button size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}
