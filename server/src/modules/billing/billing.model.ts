import { z } from "zod";
import { SUBSCRIPTION_PLANS } from "@taskflow/shared";

const planValues = Object.values(SUBSCRIPTION_PLANS) as [string, ...string[]];

export const changePlanSchema = z.object({
  plan: z.enum(planValues),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;
