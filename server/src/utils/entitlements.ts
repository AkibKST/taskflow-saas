import { prisma } from "../config/prisma";
import AppError from "./AppError";
import {
  PLAN_CATALOG,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
} from "@taskflow/shared";

/**
 * Central place where "what is this tenant allowed to do?" decisions live, so
 * seat limits and plan features are enforced consistently rather than being
 * displayed but ignored. Seat count is authoritative on Subscription.seats
 * (kept in sync with the plan by the billing service); the plan catalog is the
 * fallback when a tenant has no subscription row yet.
 */

export const getTenantEntitlements = async (tenantId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    select: { plan: true, seats: true, status: true },
  });

  const plan = (subscription?.plan ?? SUBSCRIPTION_PLANS.FREE) as SubscriptionPlan;
  const seats = subscription?.seats ?? PLAN_CATALOG[plan].seats;
  return { plan, seats, def: PLAN_CATALOG[plan] };
};

export const countActiveSeats = (tenantId: string) =>
  prisma.user.count({ where: { tenantId, isActive: true } });

/**
 * Throw 403 if adding `adding` active member(s) would exceed the tenant's seat
 * limit. Used by invite-create, invite-accept, and user reactivation.
 */
export const assertSeatAvailable = async (tenantId: string, adding = 1) => {
  const [{ seats, def }, used] = await Promise.all([
    getTenantEntitlements(tenantId),
    countActiveSeats(tenantId),
  ]);

  if (used + adding > seats) {
    throw new AppError(
      403,
      `Your ${def.name} plan includes ${seats} seats and ${used} are in use. ` +
        `Upgrade your plan to add more members.`
    );
  }
};

/**
 * Throw 400 if a downgrade to `newPlan` would leave more active members than
 * the target plan allows. Called before persisting a plan change.
 */
export const assertCanDowngrade = async (
  tenantId: string,
  newPlan: SubscriptionPlan
) => {
  const targetSeats = PLAN_CATALOG[newPlan].seats;
  const used = await countActiveSeats(tenantId);
  if (used > targetSeats) {
    throw new AppError(
      400,
      `Cannot switch to ${PLAN_CATALOG[newPlan].name}: it allows ${targetSeats} ` +
        `seats but you have ${used} active members. Deactivate members first.`
    );
  }
};
