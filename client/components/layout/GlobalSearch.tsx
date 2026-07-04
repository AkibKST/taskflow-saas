"use client";
/**
 * Global search box (header). Debounced queries to /search return projects and
 * tasks the caller can access; results link straight to the item. Replaces
 * having to scroll the board to find a task by text.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cx } from "@/lib/ui";

interface SearchResults {
  query: string;
  projects: { id: string; name: string; color?: string | null }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    projectId: string;
    project?: { name: string };
  }[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search.
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get<SearchResults>(`/search?q=${encodeURIComponent(q.trim())}`)
        .then((res) => setResults(res.data))
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const hasResults =
    results && (results.projects.length > 0 || results.tasks.length > 0);

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search tasks & projects…"
        aria-label="Search"
        className="w-56 rounded-full border border-gray-200 bg-white/70 px-4 py-1.5 text-sm outline-none transition focus:w-72 focus:border-brand-400"
      />

      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl bg-white p-2 shadow-xl ring-1 ring-gray-100">
          {loading && (
            <p className="px-3 py-2 text-sm text-gray-500">Searching…</p>
          )}
          {!loading && !hasResults && (
            <p className="px-3 py-2 text-sm text-gray-500">No matches</p>
          )}
          {!loading && results && results.projects.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Projects
              </p>
              {results.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(`/projects/${p.id}`)}
                  className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: p.color ?? "#00ff41" }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {!loading && results && results.tasks.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tasks
              </p>
              {results.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => go(`/projects/${t.projectId}/tasks/${t.id}`)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="block truncate text-gray-800">{t.title}</span>
                  <span className={cx("text-xs text-gray-500")}>
                    {t.project?.name} · {t.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
