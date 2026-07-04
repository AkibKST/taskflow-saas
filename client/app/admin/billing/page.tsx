"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/store/toastStore";
import AppHeader from "@/components/layout/AppHeader";
import { Card, Badge, EmptyState, SectionHeader } from "@/components/ui";
import { cx, pageBg } from "@/lib/ui";

interface PlanDef {
  id: string;
  name: string;
  priceCents: number;
  seats: number;
  features: string[];
}

interface Invoice {
  id: string;
  number: string;
  amountCents: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface Billing {
  subscription: {
    plan: string;
    status: string;
    seats: number;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  plan: PlanDef;
  seatsUsed: number;
  invoices: Invoice[];
  catalog: PlanDef[];
}

const money = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
const monthly = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(0)} / month`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "long" }) : "—";

const statusBadge: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  TRIALING: "bg-sky-100 text-sky-700",
  PAST_DUE: "bg-amber-100 text-amber-700",
  CANCELED: "bg-gray-200 text-gray-500",
};

export default function BillingPage() {
  const { user } = useAuthStore();
  const role = (user?.role ?? "MEMBER").toUpperCase();
  const isOwner = role === "OWNER";

  const [billing, setBilling] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOwner) { setLoading(false); return; }
    api
      .get<Billing>("/billing")
      .then((res) => setBilling(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOwner]);

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

  const changePlan = async (planId: string) => {
    setBusy(true);
    try {
      const res = await api.post<Billing>("/billing/change-plan", { plan: planId });
      setBilling(res.data);
      showToast("Plan updated", "success");
    } catch (err) {
      showToast((err as Error)?.message || "Couldn't change plan", "error");
    } finally {
      setBusy(false);
    }
  };

  const cancelSubscription = async () => {
    setBusy(true);
    try {
      const res = await api.post<Billing>("/billing/cancel");
      setBilling(res.data);
      showToast("Subscription will cancel at period end", "success");
    } catch (err) {
      showToast((err as Error)?.message || "Couldn't cancel", "error");
    } finally {
      setBusy(false);
    }
  };

  const sub = billing?.subscription;
  const seatPct =
    billing && sub ? Math.min(100, Math.round((billing.seatsUsed / sub.seats) * 100)) : 0;

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Billing &amp; subscription</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-3xl shimmer" />
            ))}
          </div>
        ) : !billing || !sub ? (
          <Card>
            <EmptyState emoji="💳" title="Billing unavailable" hint="Couldn't load your subscription. Try again later." />
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <SectionHeader title="Current plan" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-gray-900">{billing.plan.name}</p>
                    <Badge className={statusBadge[sub.status] ?? statusBadge.ACTIVE}>
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{monthly(billing.plan.priceCents)}</p>
                  {sub.currentPeriodEnd && (
                    <p className="mt-1 text-xs text-gray-500">
                      {sub.cancelAtPeriodEnd ? "Cancels on " : "Renews on "}
                      {fmtDate(sub.currentPeriodEnd)}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {billing.seatsUsed} / {sub.seats} seats used
                  </p>
                  <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cx("h-full rounded-full", seatPct >= 100 ? "bg-rose-500" : "bg-brand-500")}
                      style={{ width: `${seatPct}%` }}
                    />
                  </div>
                </div>
                {billing.plan.priceCents > 0 && !sub.cancelAtPeriodEnd && (
                  <button
                    onClick={cancelSubscription}
                    disabled={busy}
                    className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel plan
                  </button>
                )}
              </div>
            </Card>

            <Card className="mb-6">
              <SectionHeader title="Plans" />
              <div className="grid gap-4 sm:grid-cols-3">
                {billing.catalog.map((p) => {
                  const current = p.id === sub.plan;
                  return (
                    <div
                      key={p.id}
                      className={cx(
                        "flex flex-col rounded-2xl border p-4",
                        current ? "border-brand-300 ring-1 ring-brand-200" : "border-gray-100",
                      )}
                    >
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{monthly(p.priceCents)}</p>
                      <ul className="mt-3 flex-1 space-y-1">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-gray-500">
                            <span className="mt-0.5 text-brand-500">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => changePlan(p.id)}
                        disabled={busy || current}
                        className={cx(
                          "mt-4 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
                          current
                            ? "cursor-default bg-gray-100 text-gray-400"
                            : "bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:scale-[1.02]",
                        )}
                      >
                        {current ? "Current plan" : `Switch to ${p.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Plan changes take effect immediately on the built-in billing provider
                (no card required). Connect a payment provider to charge real cards.
              </p>
            </Card>

            <Card>
              <SectionHeader title="Invoice history" />
              {billing.invoices.length === 0 ? (
                <EmptyState emoji="🧾" title="No invoices yet" hint="Invoices appear here after you upgrade to a paid plan." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {billing.invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{inv.number}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(inv.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">{money(inv.amountCents)}</span>
                        <Badge className="bg-emerald-100 text-emerald-700">{inv.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
