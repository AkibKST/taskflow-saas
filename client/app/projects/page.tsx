"use client";
import { useEffect, useState, SyntheticEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore, Project } from "@/store/projectStore";
import { pageBg, projectStatusBadge, cx } from "@/lib/ui";
import { Badge } from "@/components/ui";

export default function ProjectsPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { projects, setProjects, addProject } = useProjectStore();
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    api.get<Project[]>("/projects").then((res) => {
      if (res) setProjects(res.data);
      setLoading(false);
    });
  }, [setProjects]);

  const handleLogout = async (): Promise<void> => {
    await api.post("/auth/logout");
    clearAuth();
    router.push("/login");
  };

  const handleCreate = async (e: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    try {
      const res = await api.post<Project>("/projects", { name: newName.trim() });
      if (res) addProject(res.data);
      setNewName("");
      setCreating(false);
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNewName(e.target.value);
  };

  const handleToggleCreating = (): void => {
    setCreating(!creating);
  };

  const handleCancelCreate = (): void => {
    setCreating(false);
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-gray-900 hover:text-brand-600">
          TaskFlow
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
          <button
            onClick={handleToggleCreating}
            className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            + New project
          </button>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="mb-6 bg-white border rounded-xl p-4 flex gap-3">
            <input
              autoFocus
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Project name"
              value={newName}
              onChange={handleNameChange}
            />
            <button
              type="submit"
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={handleCancelCreate}
              className="text-gray-400 hover:text-gray-600 px-2"
            >
              Cancel
            </button>
          </form>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl shimmer" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/tasks`}
                className="block bg-white border rounded-xl p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: (project as any).color ?? "#6366f1" }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                        {project.name}
                      </h3>
                      <Badge className={projectStatusBadge[project.status] ?? projectStatusBadge.ACTIVE}>
                        {project.status?.replace("_", " ")}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {(project as any)._count?.tasks ?? 0} tasks · {project.members?.length ?? 0} members
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
