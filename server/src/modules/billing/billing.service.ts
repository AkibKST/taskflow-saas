import { prisma } from "../../config/prisma";
import {
  PLAN_CATALOG,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  SubscriptionPlan,
} from "@taskflow/shared";
import { getBillingProvider, getStripe } from "./billing.provider";
import { assertCanDowngrade } from "../../utils/entitlements";
import { envVars } from "../../config/env";
import { logger } from "../../utils/logger";
import { writeAudit, AUDIT } from "../../utils/audit";
import { formatInvoiceNumber } from "../../utils/invoiceNumber";
import AppError from "../../utils/AppError";

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

/**
 * Human-readable, collision-free invoice number: a per-subscription monotonic
 * sequence prefixed with a fragment of the subscription id (so it stays unique
 * across the whole `Invoice.number @unique` space, unlike the old random bytes).
 */
const nextInvoiceNumber = async (subscriptionId: string): Promise<string> => {
  const count = await prisma.invoice.count({ where: { subscriptionId } });
  return formatInvoiceNumber(subscriptionId, count + 1);
};

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
  plan: SubscriptionPlan,
  actorId?: string
) => {
  const subscription = await ensureSubscription(tenantId);
  const provider = getBillingProvider();
  const def = planOf(plan);

  // Block a downgrade that would leave more active members than the new plan
  // allows — otherwise the tenant would be silently over its seat limit.
  await assertCanDowngrade(tenantId, plan);

  const owner = await prisma.user.findFirst({
    where: { tenantId, role: "OWNER", isActive: true },
    select: { email: true },
  });

  const result = await provider.changePlan({
    tenantId,
    plan,
    customerEmail: owner?.email,
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

  // With Stripe, invoices arrive via webhooks (real charges). The stub has no
  // real billing, so we fabricate an invoice row for paid plans to populate the
  // billing history UI.
  if (provider.name === "stub" && def.priceCents > 0) {
    await prisma.invoice.create({
      data: {
        subscriptionId: updated.id,
        number: await nextInvoiceNumber(updated.id),
        amountCents: def.priceCents,
        periodStart: new Date(),
        periodEnd: result.currentPeriodEnd,
      },
    });
  }

  await writeAudit({
    tenantId,
    actorId,
    action: AUDIT.BILLING_PLAN_CHANGED,
    targetType: "subscription",
    targetId: updated.id,
    metadata: { plan, provider: provider.name },
  });

  return getBillingService(tenantId);
};

// Cancel — keep access until the period ends (provider-style cancellation).
export const cancelSubscriptionService = async (
  tenantId: string,
  actorId?: string
) => {
  const subscription = await ensureSubscription(tenantId);
  const provider = getBillingProvider();

  await provider.cancel({
    providerSubscriptionId: subscription.providerSubscriptionId,
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });

  await writeAudit({
    tenantId,
    actorId,
    action: AUDIT.BILLING_CANCELED,
    targetType: "subscription",
    targetId: subscription.id,
  });

  return getBillingService(tenantId);
};

// ── Stripe webhook handling ──────────────────────────────────────────────────

export const verifyStripeSignature = (payload: Buffer, signature: unknown) => {
  const stripe = getStripe();
  if (!stripe || !envVars.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(503, "Billing webhook is not configured");
  }
  return stripe.webhooks.constructEvent(
    payload,
    String(signature),
    envVars.STRIPE_WEBHOOK_SECRET
  );
};

const STRIPE_STATUS_MAP: Record<string, string> = {
  active: SUBSCRIPTION_STATUS.ACTIVE,
  trialing: SUBSCRIPTION_STATUS.TRIALING,
  past_due: SUBSCRIPTION_STATUS.PAST_DUE,
  unpaid: SUBSCRIPTION_STATUS.PAST_DUE,
  canceled: SUBSCRIPTION_STATUS.CANCELED,
  incomplete_expired: SUBSCRIPTION_STATUS.CANCELED,
};

const findSubscription = (opts: {
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
}) =>
  prisma.subscription.findFirst({
    where: {
      OR: [
        opts.providerSubscriptionId
          ? { providerSubscriptionId: opts.providerSubscriptionId }
          : undefined,
        opts.providerCustomerId
          ? { providerCustomerId: opts.providerCustomerId }
          : undefined,
      ].filter(Boolean) as any,
    },
  });

/** Apply a verified Stripe event to our subscription/invoice tables. */
export const handleStripeEvent = async (event: any): Promise<void> => {
  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object;
      const local = await findSubscription({
        providerSubscriptionId: sub.id,
        providerCustomerId: sub.customer,
      });
      if (!local) break;
      await prisma.subscription.update({
        where: { id: local.id },
        data: {
          status: (STRIPE_STATUS_MAP[sub.status] ??
            SUBSCRIPTION_STATUS.ACTIVE) as never,
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : local.currentPeriodEnd,
          providerSubscriptionId: sub.id,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const local = await findSubscription({
        providerSubscriptionId: sub.id,
        providerCustomerId: sub.customer,
      });
      if (!local) break;
      // Subscription ended — drop to FREE.
      await prisma.subscription.update({
        where: { id: local.id },
        data: {
          plan: SUBSCRIPTION_PLANS.FREE as never,
          seats: PLAN_CATALOG.FREE.seats,
          status: SUBSCRIPTION_STATUS.CANCELED as never,
          cancelAtPeriodEnd: false,
          providerSubscriptionId: null,
        },
      });
      break;
    }

    case "invoice.paid": {
      const inv = event.data.object;
      const local = await findSubscription({ providerCustomerId: inv.customer });
      if (!local) break;
      await prisma.invoice.create({
        data: {
          subscriptionId: local.id,
          number: inv.number ?? (await nextInvoiceNumber(local.id)),
          amountCents: inv.amount_paid ?? inv.amount_due ?? 0,
          currency: inv.currency ?? "usd",
          status: "PAID" as never,
          periodStart: new Date((inv.period_start ?? Date.now() / 1000) * 1000),
          periodEnd: new Date((inv.period_end ?? Date.now() / 1000) * 1000),
        },
      });
      await prisma.subscription.update({
        where: { id: local.id },
        data: { status: SUBSCRIPTION_STATUS.ACTIVE as never },
      });
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data.object;
      const local = await findSubscription({ providerCustomerId: inv.customer });
      if (!local) break;
      await prisma.subscription.update({
        where: { id: local.id },
        data: { status: SUBSCRIPTION_STATUS.PAST_DUE as never },
      });
      break;
    }

    default:
      logger.debug("stripe webhook ignored", { type: event.type });
  }
};

/**
 * Lifecycle job: downgrade subscriptions whose paid period has ended after a
 * scheduled cancellation. Without this, a canceled PRO tenant keeps PRO forever.
 * (Stripe emits `customer.subscription.deleted` for provider-managed subs; this
 * covers the stub provider and acts as a safety net.)
 */
export const expireEndedSubscriptions = async (): Promise<number> => {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lt: now },
      plan: { not: SUBSCRIPTION_PLANS.FREE as never },
    },
    select: { id: true },
  });

  for (const sub of due) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan: SUBSCRIPTION_PLANS.FREE as never,
        seats: PLAN_CATALOG.FREE.seats,
        status: SUBSCRIPTION_STATUS.CANCELED as never,
        cancelAtPeriodEnd: false,
      },
    });
  }
  return due.length;
};
