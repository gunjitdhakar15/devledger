"use client";
import { useState, useEffect } from "react";

let showToastFn;

export function showToast(message, type = "info") {
  if (showToastFn) showToastFn({ message, type });
}

export default function Toast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    showToastFn = setToast;
  }, []);

  if (!toast) return null;

  const { message, type } = toast;

  setTimeout(() => setToast(null), 3000);

  return (
    <div className={`fixed top-5 right-5 p-4 rounded shadow text-white z-50 ${
      type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-zinc-700"
    }`}>
      {message}
    </div>
  );
}
