import crypto from "crypto";
import { prisma } from "../../config/prisma";
import {
  PLAN_CATALOG,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  SubscriptionPlan,
} from "@taskflow/shared";
import { getBillingProvider } from "./billing.provider";

// Get the tenant's subscription, creating a default FREE one on first access.
const ensureSubscription = async (tenantId: string) => {
  return prisma.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan: SUBSCRIPTION_PLANS.FREE as never,
      status: SUBSCRIPTION_STATUS.ACTIVE as never,
      seats: PLAN_CATALOG.FREE.seats,
    },
    update: {},
  });
};

const planOf = (plan: string) => PLAN_CATALOG[plan as SubscriptionPlan];

// Full billing snapshot for the billing page.
export const getBillingService = async (tenantId: string) => {
  const subscription = await ensureSubscription(tenantId);

  const [seatsUsed, invoices] = await Promise.all([
    prisma.user.count({ where: { tenantId, isActive: true } }),
    prisma.invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        number: true,
        amountCents: true,
        currency: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      seats: subscription.seats,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
    plan: planOf(subscription.plan),
    seatsUsed,
    invoices,
    catalog: Object.values(PLAN_CATALOG),
  };
};

// Change the tenant's plan via the configured provider, then persist + invoice.
export const changePlanService = async (
  tenantId: string,
  plan: SubscriptionPlan
) => {
  const subscription = await ensureSubscription(tenantId);
  const provider = getBillingProvider();
  const def = planOf(plan);

  const result = await provider.changePlan({
    tenantId,
    plan,
    providerCustomerId: subscription.providerCustomerId,
    providerSubscriptionId: subscription.providerSubscriptionId,
  });

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      plan: plan as never,
      seats: def.seats,
      status: SUBSCRIPTION_STATUS.ACTIVE as never,
      cancelAtPeriodEnd: false,
      provider: provider.name,
      providerCustomerId: result.providerCustomerId,
      providerSubscriptionId: result.providerSubscriptionId,
      currentPeriodEnd: result.currentPeriodEnd,
    },
  });

  // Paid plans generate an invoice for the new period (free plans don't).
  if (def.priceCents > 0) {
    await prisma.invoice.create({
      data: {
        subscriptionId: updated.id,
        number: `INV-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        amountCents: def.priceCents,
        periodStart: new Date(),
        periodEnd: result.currentPeriodEnd,
      },
    });
  }

  return getBillingService(tenantId);
};

// Cancel — keep access until the period ends (provider-style cancellation).
export const cancelSubscriptionService = async (tenantId: string) => {
  const subscription = await ensureSubscription(tenantId);
  const provider = getBillingProvider();

  await provider.cancel({
    providerSubscriptionId: subscription.providerSubscriptionId,
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });

  return getBillingService(tenantId);
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// getBillingService(tenantId)        → subscription + plan + seat usage + invoices + catalog
// changePlanService(tenantId, plan)  → provider.changePlan → persist plan + create invoice
// cancelSubscriptionService(tenantId)→ provider.cancel → flag cancelAtPeriodEnd
// ──────────────────────────────────────────────────────────────────────────────
