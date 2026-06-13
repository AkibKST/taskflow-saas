"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { IconBadge } from "@/components/ui";
import { btnPrimary, btnGhost, cx, pageBg } from "@/lib/ui";

const features = [
  {
    emoji: "🗂️",
    title: "Projects & boards",
    desc: "Organize work into projects with Kanban boards, statuses and priorities.",
  },
  {
    emoji: "⚡",
    title: "Real-time collaboration",
    desc: "See live updates and who's online as your team moves tasks together.",
  },
  {
    emoji: "👥",
    title: "Roles & permissions",
    desc: "Owners, admins, managers, members and viewers — everyone gets the right access.",
  },
  {
    emoji: "🔔",
    title: "Notifications",
    desc: "Stay on top of assignments, mentions and deadlines without the noise.",
  },
  {
    emoji: "🏢",
    title: "Multi-tenant",
    desc: "Each organization gets its own isolated, secure workspace.",
  },
  {
    emoji: "💬",
    title: "Comments & mentions",
    desc: "Discuss work in context and loop people in with @mentions.",
  },
];

const checkIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export default function Home() {
  const { user } = useAuthStore();
  const isAuthed = !!user;

  return (
    <div className={cx("min-h-screen", pageBg)}>
      {/* ---------------- Nav ---------------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <IconBadge>{checkIcon}</IconBadge>
          <span className="text-lg font-bold text-gray-900">TaskFlow</span>
        </div>
        <nav className="flex items-center gap-3">
          {isAuthed ? (
            <Link href="/dashboard" className={cx(btnPrimary, "!px-5 !py-2")}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={cx(btnGhost, "!px-5 !py-2")}>
                Sign in
              </Link>
              <Link href="/register" className={cx(btnPrimary, "!px-5 !py-2")}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <span className="inline-block rounded-full bg-brand-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Project management, simplified
        </span>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
          Everything your team needs to
          <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
            {" "}
            ship work
          </span>
          , in one place.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-500">
          TaskFlow brings projects, tasks, real-time collaboration and your whole
          team together — so nothing falls through the cracks.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href={isAuthed ? "/dashboard" : "/register"} className={cx(btnPrimary, "!px-7 !py-3 !text-base")}>
            {isAuthed ? "Open dashboard" : "Start for free"}
          </Link>
          {!isAuthed && (
            <Link href="/login" className={cx(btnGhost, "!px-7 !py-3 !text-base")}>
              Sign in
            </Link>
          )}
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
                {f.emoji}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA banner ---------------- */}
      {!isAuthed && (
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-8 py-14 text-center">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 25%, white 1.5px, transparent 1.5px)",
                backgroundSize: "28px 28px",
              }}
            />
            <h2 className="relative text-3xl font-bold text-white">Ready to get organized?</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-brand-50">
              Create your workspace in seconds and invite your team today.
            </p>
            <Link
              href="/register"
              className="relative mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-brand-700 shadow-lg transition-transform hover:scale-[1.02]"
            >
              Create your workspace
            </Link>
          </div>
        </section>
      )}

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-white/60 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} TaskFlow. All rights reserved.
      </footer>
    </div>
  );
}
