import Link from "next/link";

const TEAM = [
  { name: "Jordan Lee", role: "Co-founder & CEO", avatar: "J" },
  { name: "Alex Kim", role: "Co-founder & CTO", avatar: "A" },
  { name: "Sam Rivera", role: "Head of Design", avatar: "S" },
  { name: "Morgan Chen", role: "Lead Engineer", avatar: "M" },
];

const VALUES = [
  { title: "Simplicity first", body: "We cut everything that doesn't help teams ship. Fewer features used well beat a hundred half-baked ones." },
  { title: "Real-time always", body: "Your team works in the same moment. Your tools should too. Every update is instant, no polling, no stale state." },
  { title: "Roles matter", body: "Different people need different access. We model real organizations with fine-grained, role-based permissions." },
  { title: "Open feedback", body: "We build in public and ship based on what users actually need — not what we think they need." },
];

export default function AboutPage() {
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
            <Link href="/features" className="hover:text-gray-800">Features</Link>
            <Link href="/pricing" className="hover:text-gray-800">Pricing</Link>
            <Link href="/login" className="rounded-full border border-gray-200 px-4 py-1.5 hover:bg-gray-50">Sign in</Link>
            <Link href="/register" className="rounded-full bg-brand-600 px-4 py-1.5 text-white hover:bg-brand-700">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Built for teams who ship
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            TaskFlow started as a side project to scratch our own itch: we needed a task manager
            that was fast, real-time, and didn&apos;t require a PhD to configure permissions.
          </p>
        </div>

        <div className="mb-16 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Our story</h2>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              We were a small engineering team juggling Jira, Notion, and Slack to track work.
              Context-switching between tools was costing us hours every week.
            </p>
            <p>
              In 2024 we built the first version of TaskFlow in a weekend — a kanban board with
              real-time socket updates and role-based access. Our team switched to it immediately
              and never looked back.
            </p>
            <p>
              Today TaskFlow is used by product teams, agencies, and startups who need a tool that
              gets out of the way and lets them focus on building.
            </p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">Our values</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-bold text-gray-900">{v.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{v.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-8 text-2xl font-bold text-gray-900">The team</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {TEAM.map((m) => (
              <div key={m.name} className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white">
                  {m.avatar}
                </span>
                <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">{m.role}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-500 p-10 text-center text-white">
          <h2 className="text-2xl font-extrabold">Join us on the journey</h2>
          <p className="mt-2 text-brand-100 text-sm">
            We&apos;re always looking for feedback, contributors, and users who care about great tooling.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/register" className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              Try TaskFlow free
            </Link>
            <Link href="/contact" className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              Get in touch
            </Link>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} TaskFlow. All rights reserved.
      </footer>
    </div>
  );
}
