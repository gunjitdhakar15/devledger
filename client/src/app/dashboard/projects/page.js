"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState("");
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const addProject = async () => {
    if (!newProject) return showToast("Project name required", "error");
    try {
      const res = await api.post("/projects", { name: newProject });
      setProjects([...projects, res.data]);
      setNewProject("");
      showToast("Project added", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to add project", "error");
    }
  };

  const deleteProject = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(projects.filter((p) => p._id !== id));
      showToast("Project deleted", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete project", "error");
    }
  };

  const updateProject = async (id, name) => {
    try {
      await api.put(`/projects/${id}`, { name });
      setProjects(projects.map(p => p._id === id ? { ...p, name } : p));
      showToast("Project updated", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update project", "error");
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <p className="text-center mt-20">Loading projects...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Projects</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        <Input placeholder="New project" value={newProject} onChange={e => setNewProject(e.target.value)} className="flex-1"/>
        <Button onClick={addProject}>Add</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(project => (
          <Card key={project._id} className="p-4 shadow hover:shadow-lg transition flex flex-col">
            <input
              className="font-bold text-lg border-b border-zinc-300 focus:outline-none"
              value={project.name}
              onChange={e => updateProject(project._id, e.target.value)}
            />
            <p className="text-zinc-600 mt-2">Owner: {project.owner.name}</p>
            <p className="text-zinc-600">{project.tasks?.length || 0} tasks</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => (window.location.href = `/dashboard/tasks?project=${project._id}`)}>View Tasks</Button>
              <Button variant="outline" onClick={() => deleteProject(project._id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
