/**
 * Billing provider abstraction.
 *
 * The app talks to billing through this interface so the payment backend can be
 * swapped without touching the service/controller. Today the built-in **stub**
 * provider activates plan changes immediately with no real charge — exactly the
 * same "swap me for a real provider" pattern used by utils/email.ts.
 *
 * To go live with Stripe: implement `BillingProvider` with the Stripe SDK
 * (create/update Subscription, customer portal, webhooks) and return it from
 * `getBillingProvider()` when `STRIPE_SECRET_KEY` is set.
 */
import { SubscriptionPlan } from "@taskflow/shared";

export interface ChangePlanInput {
  tenantId: string;
  plan: SubscriptionPlan;
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

// No external provider — activates instantly, bills nothing.
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

export const getBillingProvider = (): BillingProvider => {
  // if (process.env.STRIPE_SECRET_KEY) return stripeProvider;
  return stubProvider;
};
