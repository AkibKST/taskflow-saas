import type { Metadata } from "next";
import Link from "next/link";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Avatar } from "@/components/ui";

export const metadata: Metadata = {
  title: "About · TaskFlow",
  description:
    "TaskFlow is built for teams who ship — fast, real-time task management without the configuration overhead.",
  openGraph: {
    title: "About TaskFlow",
    description: "Built for teams who ship.",
    type: "website",
  },
};

const TEAM = [
  { name: "Jordan Lee", role: "Co-founder & CEO" },
  { name: "Alex Kim", role: "Co-founder & CTO" },
  { name: "Sam Rivera", role: "Head of Design" },
  { name: "Morgan Chen", role: "Lead Engineer" },
];

const VALUES = [
  { title: "Simplicity first", body: "We cut everything that doesn't help teams ship. Fewer features used well beat a hundred half-baked ones." },
  { title: "Real-time always", body: "Your team works in the same moment. Your tools should too. Every update is instant, no polling, no stale state." },
  { title: "Roles matter", body: "Different people need different access. We model real organizations with fine-grained, role-based permissions." },
  { title: "Open feedback", body: "We build in public and ship based on what users actually need — not what we think they need." },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
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
                <Avatar name={m.name} size="lg" className="mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{m.role}</p>
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
    </MarketingLayout>
  );
}
