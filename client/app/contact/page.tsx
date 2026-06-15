"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30";

const TOPICS = [
  "General inquiry",
  "Sales / pricing",
  "Bug report",
  "Feature request",
  "Partnership",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 700));
    setSending(false);
    setSent(true);
  };

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
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">Get in touch</h1>
          <p className="mt-3 text-gray-500">
            Have a question or just want to say hello? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          {sent ? (
            <div className="py-10 text-center">
              <p className="mb-4 text-5xl">📬</p>
              <h2 className="text-xl font-bold text-gray-800">Message received!</h2>
              <p className="mt-2 text-sm text-gray-500">
                Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.
              </p>
              <button
                onClick={() => { setSent(false); setForm({ name: "", email: "", topic: "", message: "" }); }}
                className="mt-6 rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Name</label>
                  <input
                    className={inputClass}
                    placeholder="Your name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-600">Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    placeholder="you@example.com"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Topic</label>
                <select
                  className={inputClass}
                  required
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                >
                  <option value="">Select a topic…</option>
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">Message</label>
                <textarea
                  className={`${inputClass} min-h-[140px] resize-y`}
                  placeholder="Tell us what's on your mind…"
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
          {[
            { emoji: "📧", label: "Email", value: "hello@taskflow.app" },
            { emoji: "💬", label: "Discord", value: "discord.gg/taskflow" },
            { emoji: "🐦", label: "Twitter / X", value: "@taskflowapp" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-white px-4 py-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-2xl">{c.emoji}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
              <p className="mt-0.5 text-sm text-gray-700">{c.value}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} TaskFlow. All rights reserved.
      </footer>
    </div>
  );
}
