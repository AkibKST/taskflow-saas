"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROJECT_COLOR } from "@taskflow/shared";
import { api } from "@/lib/api";
import { useProjectStore, Project } from "@/store/projectStore";
import AppHeader from "@/components/layout/AppHeader";
import { Badge, EmptyState } from "@/components/ui";
import { pageBg, projectStatusBadge, cx } from "@/lib/ui";

export default function ProjectsPage() {
  const { projects, setProjects } = useProjectStore();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    api
      .get<Project[]>("/projects")
      .then((res) => {
        if (active && res) setProjects(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setProjects]);

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/projects/new"
            className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            + New project
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl shimmer" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <EmptyState
              emoji="📋"
              title="No projects yet"
              hint="Create your first project to get started."
            />
            <div className="flex justify-center">
              <Link
                href="/projects/new"
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Create a project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: (project as { color?: string }).color ?? DEFAULT_PROJECT_COLOR }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-brand-600">
                        {project.name}
                      </h3>
                      <Badge className={projectStatusBadge[project.status] ?? projectStatusBadge.ACTIVE}>
                        {project.status?.replace("_", " ")}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                        {project.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      {(project as { _count?: { tasks?: number } })._count?.tasks ?? 0} tasks ·{" "}
                      {project.members?.length ?? 0} members
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
