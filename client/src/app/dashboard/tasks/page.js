"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { showToast } from "@/components/Toast";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [status, setStatus] = useState("todo");
  const [search, setSearch] = useState("");
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks/${projectId}`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [projectId]);

  const addTask = async () => {
    if (!newTask) return showToast("Task name required", "error");
    try {
      const res = await api.post(`/tasks/${projectId}`, { name: newTask, status });
      setTasks([...tasks, res.data]);
      setNewTask(""); setStatus("todo");
      showToast("Task added", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to add task", "error");
    }
  };

  const deleteTask = async id => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
      showToast("Task deleted", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete task", "error");
    }
  };

  const updateTask = async (id, field, value) => {
    try {
      await api.put(`/tasks/${id}`, { [field]: value });
      setTasks(tasks.map(t => t._id === id ? { ...t, [field]: value } : t));
      showToast("Task updated", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update task", "error");
    }
  };

  const filteredTasks = tasks.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <p className="text-center mt-20">Loading tasks...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tasks</h2>

      <div className="flex flex-col sm:flex-row gap-2 items-center mb-4">
        <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        <Input placeholder="New task" value={newTask} onChange={e => setNewTask(e.target.value)} className="flex-1"/>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={addTask}>Add Task</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map(task => (
          <Card key={task._id} className="p-4 shadow hover:shadow-lg transition flex flex-col">
            <Input
              value={task.name}
              onChange={e => updateTask(task._id, "name", e.target.value)}
              className="font-bold text-lg border-b border-zinc-300 focus:outline-none"
            />
            <p className="text-zinc-600 mt-1">Project: {task.project.name}</p>
            <Select value={task.status} onValueChange={val => updateTask(task._id, "status", val)}>
              <SelectTrigger className="w-32 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Button variant="outline" onClick={() => deleteTask(task._id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
