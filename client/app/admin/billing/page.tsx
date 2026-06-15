"use client";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { cx, pageBg } from "@/lib/ui";

const PLAN = {
  name: "Pro",
  price: "$29 / month",
  renewsOn: "2026-07-15",
  seats: 25,
  usedSeats: 8,
};

const INVOICES = [
  { id: "INV-001", date: "2026-06-01", amount: "$29.00", status: "Paid" },
  { id: "INV-002", date: "2026-05-01", amount: "$29.00", status: "Paid" },
  { id: "INV-003", date: "2026-04-01", amount: "$29.00", status: "Paid" },
];

export default function BillingPage() {
  const { user } = useAuthStore();
  const role = (user?.role ?? "MEMBER").toUpperCase();
  const isOwner = role === "OWNER";

  if (!isOwner) {
    return (
      <div className={cx("min-h-screen", pageBg)}>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-8">
          <Card>
            <EmptyState emoji="🔒" title="Access denied" hint="Only the workspace Owner can manage billing." />
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Billing & subscription</h1>

        <Card className="mb-6">
          <SectionHeader title="Current plan" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-gray-900">{PLAN.name}</p>
                <Badge className="bg-brand-100 text-brand-700">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">{PLAN.price}</p>
              <p className="mt-1 text-xs text-gray-400">
                Renews on {new Date(PLAN.renewsOn).toLocaleDateString(undefined, { dateStyle: "long" })}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {PLAN.usedSeats} / {PLAN.seats} seats used
              </p>
              <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(PLAN.usedSeats / PLAN.seats) * 100}%` }}
                />
              </div>
            </div>
            <button className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Upgrade plan
            </button>
          </div>
        </Card>

        <Card className="mb-6">
          <SectionHeader title="Payment method" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600">
                VISA
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">•••• •••• •••• 4242</p>
                <p className="text-xs text-gray-400">Expires 12/27</p>
              </div>
            </div>
            <button className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Update
            </button>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Invoice history" />
          <ul className="divide-y divide-gray-100">
            {INVOICES.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.id}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(inv.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">{inv.amount}</span>
                  <Badge className="bg-emerald-100 text-emerald-700">{inv.status}</Badge>
                  <button className="text-xs text-brand-600 hover:text-brand-700">Download</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
}
