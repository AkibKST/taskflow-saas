import type { Metadata } from "next";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import ContactForm from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Contact · TaskFlow",
  description:
    "Have a question or just want to say hello? Get in touch with the TaskFlow team.",
  openGraph: {
    title: "Contact TaskFlow",
    description: "Questions, feedback, sales — we'd love to hear from you.",
    type: "website",
  },
};

const CHANNELS = [
  { emoji: "📧", label: "Email", value: "hello@taskflow.app" },
  { emoji: "💬", label: "Discord", value: "discord.gg/taskflow" },
  { emoji: "🐦", label: "Twitter / X", value: "@taskflowapp" },
];

export default function ContactPage() {
  return (
    <MarketingLayout>
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">Get in touch</h1>
          <p className="mt-3 text-gray-600">
            Have a question or just want to say hello? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <ContactForm />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <div key={c.label} className="rounded-2xl bg-white px-4 py-5 shadow-sm ring-1 ring-gray-100">
              <p aria-hidden="true" className="text-2xl">{c.emoji}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className="mt-0.5 text-sm text-gray-700">{c.value}</p>
            </div>
          ))}
        </div>
      </main>
    </MarketingLayout>
  );
}
