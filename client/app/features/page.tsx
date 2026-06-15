import Link from "next/link";

const FEATURES = [
  {
    emoji: "📋",
    title: "Kanban board",
    description:
      "Visualize your workflow with drag-and-drop columns: TODO → IN PROGRESS → IN REVIEW → DONE → BLOCKED. Move tasks with a single drag.",
  },
  {
    emoji: "⚡",
    title: "Real-time collaboration",
    description:
      "See who's online on your board right now. Task updates, new cards, and status changes appear instantly for every teammate — no refresh needed.",
  },
  {
    emoji: "🔔",
    title: "Smart notifications",
    description:
      "Get notified when tasks are assigned to you, due dates approach, or teammates mention you. Configure exactly which events you care about.",
  },
  {
    emoji: "👥",
    title: "Role-based access",
    description:
      "OWNER, ADMIN, MANAGER, MEMBER, VIEWER — each role has the right permissions. Viewers can see without accidentally breaking things.",
  },
  {
    emoji: "📊",
    title: "Dashboard & analytics",
    description:
      "Your personal dashboard shows open tasks, recent projects, team members online, and a live breakdown of work by status.",
  },
  {
    emoji: "🏗️",
    title: "Project management",
    description:
      "Create projects with names, colors, dates, and custom statuses. Manage members, set roles per project, and track overall progress.",
  },
  {
    emoji: "🎯",
    title: "Task detail",
    description:
      "Each task has a title, description, priority, status, due date, and assignees. Full detail view keeps context in one place.",
  },
  {
    emoji: "📱",
    title: "Responsive design",
    description:
      "Works great on desktop, tablet, and mobile. Plan your sprint on your laptop, check task status on your phone.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </span>
            <span className="text-lg font-bold text-gray-900">TaskFlow</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <Link href="/pricing" className="hover:text-gray-800">Pricing</Link>
            <Link href="/about" className="hover:text-gray-800">About</Link>
            <Link href="/login" className="rounded-full border border-gray-200 px-4 py-1.5 hover:bg-gray-50">Sign in</Link>
            <Link href="/register" className="rounded-full bg-brand-600 px-4 py-1.5 text-white hover:bg-brand-700">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Everything your team needs
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            TaskFlow brings together task management, real-time collaboration, and smart notifications in one beautiful tool.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register" className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700">
              Start for free
            </Link>
            <Link href="/pricing" className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              View pricing
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <p className="mb-3 text-3xl">{f.emoji}</p>
              <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-500 p-12 text-center text-white">
          <h2 className="text-3xl font-extrabold">Ready to ship faster?</h2>
          <p className="mt-3 text-brand-100">
            Join teams already using TaskFlow to stay organized and ship on time.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow-lg hover:bg-brand-50"
          >
            Get started for free
          </Link>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} TaskFlow. All rights reserved.
      </footer>
    </div>
  );
}
