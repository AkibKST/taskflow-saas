import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { SubscriptionPlan } from "@taskflow/shared";
import {
  getBillingService,
  changePlanService,
  cancelSubscriptionService,
} from "./billing.service";
import { changePlanSchema } from "./billing.model";

export const getBilling = catchAsync(async (req, res) => {
  const data = await getBillingService(req.user!.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Billing fetched",
    data,
  });
});

export const changePlan = catchAsync(async (req, res) => {
  const { plan } = changePlanSchema.parse(req.body);
  const data = await changePlanService(req.user!.tenantId, plan as SubscriptionPlan);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plan updated",
    data,
  });
});

export const cancelSubscription = catchAsync(async (req, res) => {
  const data = await cancelSubscriptionService(req.user!.tenantId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription will cancel at the end of the period",
    data,
  });
});
