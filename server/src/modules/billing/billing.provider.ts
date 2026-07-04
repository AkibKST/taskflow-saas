/**
 * Billing provider abstraction. The app talks to billing through this interface
 * so the payment backend can be swapped without touching the service/controller.
 *
 * - `stubProvider`  — activates plan changes instantly, bills nothing (dev/demo).
 * - `stripeProvider`— real Stripe subscriptions, selected when STRIPE_SECRET_KEY
 *   is set. The `stripe` SDK is an OPTIONAL dependency loaded via lazy require,
 *   so the server runs without it while on the stub.
 */
import {
  SubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from "@taskflow/shared";
import { envVars } from "../../config/env";

export interface ChangePlanInput {
  tenantId: string;
  plan: SubscriptionPlan;
  customerEmail?: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
}

export interface ChangePlanResult {
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodEnd: Date;
}

export interface BillingProvider {
  name: string;
  changePlan(input: ChangePlanInput): Promise<ChangePlanResult>;
  cancel(input: { providerSubscriptionId?: string | null }): Promise<void>;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ── Stub provider ──────────────────────────────────────────────────────────
export const stubProvider: BillingProvider = {
  name: "stub",
  async changePlan(): Promise<ChangePlanResult> {
    return {
      providerCustomerId: null,
      providerSubscriptionId: null,
      currentPeriodEnd: new Date(Date.now() + THIRTY_DAYS_MS),
    };
  },
  async cancel(): Promise<void> {
    // Nothing to cancel with an external provider.
  },
};

// ── Stripe provider ──────────────────────────────────────────────────────────
let stripeClient: any;
/** Lazily construct the Stripe client (optional dependency). */
export const getStripe = (): any => {
  if (!envVars.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require("stripe");
    stripeClient = new Stripe(envVars.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }
  return stripeClient;
};

const priceIdFor = (plan: SubscriptionPlan): string | null => {
  if (plan === SUBSCRIPTION_PLANS.PRO) return envVars.STRIPE_PRICE_PRO ?? null;
  if (plan === SUBSCRIPTION_PLANS.ENTERPRISE)
    return envVars.STRIPE_PRICE_ENTERPRISE ?? null;
  return null; // FREE has no price
};

const periodEndFrom = (subscription: any): Date =>
  subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + THIRTY_DAYS_MS);

export const stripeProvider: BillingProvider = {
  name: "stripe",
  async changePlan(input): Promise<ChangePlanResult> {
    const stripe = getStripe();

    // Ensure a Stripe customer exists for the tenant.
    let customerId = input.providerCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: input.customerEmail,
        metadata: { tenantId: input.tenantId },
      });
      customerId = customer.id;
    }

    const priceId = priceIdFor(input.plan);

    // Downgrade to FREE → cancel the paid subscription immediately.
    if (!priceId) {
      if (input.providerSubscriptionId) {
        await stripe.subscriptions.cancel(input.providerSubscriptionId);
      }
      return {
        providerCustomerId: customerId,
        providerSubscriptionId: null,
        currentPeriodEnd: new Date(Date.now() + THIRTY_DAYS_MS),
      };
    }

    // Update the existing subscription's price, or create a new one.
    if (input.providerSubscriptionId) {
      const existing = await stripe.subscriptions.retrieve(
        input.providerSubscriptionId
      );
      const updated = await stripe.subscriptions.update(
        input.providerSubscriptionId,
        {
          cancel_at_period_end: false,
          items: [{ id: existing.items.data[0].id, price: priceId }],
          proration_behavior: "create_prorations",
        }
      );
      return {
        providerCustomerId: customerId,
        providerSubscriptionId: updated.id,
        currentPeriodEnd: periodEndFrom(updated),
      };
    }

    const created = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      metadata: { tenantId: input.tenantId },
    });
    return {
      providerCustomerId: customerId,
      providerSubscriptionId: created.id,
      currentPeriodEnd: periodEndFrom(created),
    };
  },

  async cancel(input): Promise<void> {
    if (!input.providerSubscriptionId) return;
    const stripe = getStripe();
    await stripe.subscriptions.update(input.providerSubscriptionId, {
      cancel_at_period_end: true,
    });
  },
};

export const getBillingProvider = (): BillingProvider =>
  envVars.STRIPE_SECRET_KEY ? stripeProvider : stubProvider;
