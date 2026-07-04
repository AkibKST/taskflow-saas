"use client";
import { useState, FormEvent } from "react";
import { Button, Field, Select, Textarea } from "@/components/ui";

const TOPICS = [
  "General inquiry",
  "Sales / pricing",
  "Bug report",
  "Feature request",
  "Partnership",
  "Other",
];

export default function ContactForm() {
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

  if (sent) {
    return (
      <div className="py-10 text-center">
        <p aria-hidden="true" className="mb-4 text-5xl">📬</p>
        <h2 className="text-xl font-bold text-gray-800">Message received!</h2>
        <p className="mt-2 text-sm text-gray-600">
          Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.
        </p>
        <Button
          variant="ghost"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setForm({ name: "", email: "", topic: "", message: "" });
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          placeholder="Your name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Field
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <Select
        label="Topic"
        required
        value={form.topic}
        onChange={(e) => setForm({ ...form, topic: e.target.value })}
      >
        <option value="">Select a topic…</option>
        {TOPICS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
      <Textarea
        label="Message"
        className="min-h-[140px]"
        placeholder="Tell us what's on your mind…"
        required
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
      />
      <Button type="submit" fullWidth loading={sending}>
        {sending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
