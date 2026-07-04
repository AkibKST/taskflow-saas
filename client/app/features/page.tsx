import type { Metadata } from "next";
import Link from "next/link";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { buttonClasses } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Features · TaskFlow",
  description:
    "Kanban boards, real-time collaboration, smart notifications, role-based access and more — everything your team needs in one tool.",
  openGraph: {
    title: "TaskFlow features",
    description:
      "Task management, real-time collaboration, and smart notifications in one beautiful tool.",
    type: "website",
  },
};

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
    <MarketingLayout>
      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Everything your team needs
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            TaskFlow brings together task management, real-time collaboration, and smart notifications in one beautiful tool.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register" className={buttonClasses("primary", "lg", "!text-sm")}>
              Start for free
            </Link>
            <Link href="/pricing" className={buttonClasses("secondary", "lg", "!text-sm")}>
              View pricing
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <p aria-hidden="true" className="mb-3 text-3xl">{f.emoji}</p>
              <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.description}</p>
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
    </MarketingLayout>
  );
}
