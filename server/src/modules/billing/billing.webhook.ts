import { Router, raw } from "express";
import { envVars } from "../../config/env";
import { logger } from "../../utils/logger";
import { verifyStripeSignature, handleStripeEvent } from "./billing.service";

/**
 * Stripe webhook receiver. Mounted in app.ts BEFORE express.json() so the raw
 * request body is available for signature verification (Stripe signs the exact
 * bytes). Returns 2xx quickly; failures return 4xx so Stripe retries.
 */
export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  "/",
  raw({ type: "*/*" }),
  async (req, res) => {
    if (!envVars.STRIPE_SECRET_KEY || !envVars.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: "Billing webhook not configured" });
    }
    try {
      const event = verifyStripeSignature(
        req.body as Buffer,
        req.headers["stripe-signature"]
      );
      await handleStripeEvent(event);
      res.json({ received: true });
    } catch (err) {
      logger.error("stripe webhook rejected", { err: String(err) });
      res.status(400).json({ error: "Invalid webhook signature or payload" });
    }
  }
);
