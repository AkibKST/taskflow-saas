import type { Metadata } from "next";
import Link from "next/link";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { buttonClasses } from "@/lib/ui";

export const metadata: Metadata = {
  title: "TaskFlow — Project management, simplified",
  description:
    "TaskFlow brings projects, tasks, real-time collaboration and your whole team together — so nothing falls through the cracks.",
  openGraph: {
    title: "TaskFlow — Project management, simplified",
    description:
      "Projects, tasks, real-time collaboration and your whole team, in one place.",
    type: "website",
  },
};

const stroke = {
  className: "h-6 w-6",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const features = [
  {
    icon: (
      <svg {...stroke} aria-hidden="true">
        <rect x="3" y="3" width="7" height="18" rx="1.5" />
        <rect x="14" y="3" width="7" height="12" rx="1.5" />
      </svg>
    ),
    title: "Projects & boards",
    desc: "Organize work into projects with Kanban boards, statuses and priorities.",
  },
  {
    icon: (
      <svg {...stroke} aria-hidden="true">
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
      </svg>
    ),
    title: "Real-time collaboration",
    desc: "See live updates and who's online as your team moves tasks together.",
  },
  {
    icon: (
      <svg {...stroke} aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
        <path d="M16 5a3 3 0 0 1 0 6M21 20c0-2.5-2-4-4-4.5" />
      </svg>
    ),
    title: "Roles & permissions",
    desc: "Owners, admins, managers, members and viewers — everyone gets the right access.",
  },
  {
    icon: (
      <svg {...stroke} aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      </svg>
    ),
    title: "Notifications",
    desc: "Stay on top of assignments, mentions and deadlines without the noise.",
  },
  {
    icon: (
      <svg {...stroke} aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
      </svg>
    ),
    title: "Multi-tenant",
    desc: "Each organization gets its own isolated, secure workspace.",
  },
  {
    icon: (
      <svg {...stroke} aria-hidden="true">
        <path d="M21 12a8 8 0 1 0-3.6 6.7L21 20l-.8-3.3A8 8 0 0 0 21 12Z" />
        <path d="M8 11h.01M12 11h.01M16 11h.01" />
      </svg>
    ),
    title: "Comments & mentions",
    desc: "Discuss work in context and loop people in with @mentions.",
  },
];

export default function Home() {
  return (
    <MarketingLayout>
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
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          TaskFlow brings projects, tasks, real-time collaboration and your whole
          team together — so nothing falls through the cracks.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/register" className={buttonClasses("primary", "lg")}>
            Start for free
          </Link>
          <Link href="/login" className={buttonClasses("ghost", "lg")}>
            Sign in
          </Link>
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
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                {f.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA banner ---------------- */}
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
            className="relative mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-brand-700 shadow-lg transition-transform motion-safe:hover:scale-[1.02]"
          >
            Create your workspace
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
