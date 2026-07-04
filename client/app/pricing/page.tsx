import type { Metadata } from "next";
import Link from "next/link";
import MarketingLayout from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Pricing · TaskFlow",
  description:
    "Simple, transparent pricing. Start for free and scale as your team grows — no hidden fees.",
  openGraph: {
    title: "TaskFlow pricing",
    description: "Start for free. Scale as your team grows. No hidden fees.",
    type: "website",
  },
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for personal projects and small teams.",
    features: ["Up to 3 projects", "5 team members", "Kanban board", "Basic notifications"],
    cta: "Get started free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "Everything you need to run a growing team.",
    features: [
      "Unlimited projects",
      "25 team members",
      "Kanban + calendar view",
      "Real-time collaboration",
      "Priority notifications",
      "Task due-date alerts",
    ],
    cta: "Start free trial",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For large organizations with advanced needs.",
    features: [
      "Unlimited everything",
      "SSO / SAML",
      "Advanced audit logs",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact sales",
    href: "/contact",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout>
      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Start for free. Scale as your team grows. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 ${
                plan.highlight
                  ? "bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-2xl shadow-brand-500/30"
                  : "bg-white shadow-sm ring-1 ring-gray-100"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-0.5 text-xs font-bold text-amber-900">
                  Most popular
                </span>
              )}
              <p className={`text-sm font-semibold ${plan.highlight ? "text-brand-100" : "text-gray-600"}`}>
                {plan.name}
              </p>
              <p className={`mt-2 text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                {plan.price}
                <span className={`ml-1 text-base font-normal ${plan.highlight ? "text-brand-100" : "text-gray-500"}`}>
                  /{plan.period}
                </span>
              </p>
              <p className={`mt-3 text-sm ${plan.highlight ? "text-brand-100" : "text-gray-600"}`}>
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <svg
                      className={`h-4 w-4 shrink-0 ${plan.highlight ? "text-brand-200" : "text-brand-500"}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12.5 10 17.5 19 6.5" />
                    </svg>
                    <span className={plan.highlight ? "text-brand-50" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-white text-brand-700 hover:bg-brand-50"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <h2 className="text-xl font-bold text-gray-900">All plans include</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-600 sm:grid-cols-4">
            {["99.9% uptime SLA", "SSL encryption", "Daily backups", "Email support"].map((f) => (
              <div key={f} className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5 10 17.5 19 6.5" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
