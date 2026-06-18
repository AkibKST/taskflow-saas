/**
 * @taskflow/shared — single source of truth for every enum value, status
 * string and socket event name used by both the API and the client.
 *
 * Rule: no enum value, status string or socket event name may be hardcoded
 * anywhere else. Import from this package instead.
 */

export const ROLES = Object.freeze({
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
} as const);

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PROJECT_ROLES = Object.freeze({
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
} as const);

export type ProjectRole = (typeof PROJECT_ROLES)[keyof typeof PROJECT_ROLES];

export const PROJECT_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const);

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const TASK_STATUS = Object.freeze({
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  DONE: "DONE",
  BLOCKED: "BLOCKED",
} as const);

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/** Columns shown on the Kanban board, in display order. */
export const BOARD_COLUMNS = Object.freeze([
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.IN_REVIEW,
  TASK_STATUS.DONE,
] as const);

export const PRIORITY = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const);

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_ORDER = Object.freeze([
  PRIORITY.LOW,
  PRIORITY.MEDIUM,
  PRIORITY.HIGH,
  PRIORITY.URGENT,
] as const);

export const NOTIFICATION_TYPES = Object.freeze({
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_COMMENTED: "TASK_COMMENTED",
  DUE_SOON: "DUE_SOON",
  MENTIONED: "MENTIONED",
  MEMBER_JOINED: "MEMBER_JOINED",
} as const);

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Per-user notification preference keys. Each maps 1:1 to a boolean column on
 * the `NotificationPreference` model and to a toggle on /settings/notifications.
 */
export const NOTIFICATION_PREF_KEYS = Object.freeze({
  TASK_ASSIGNED: "taskAssigned",
  TASK_DUE: "taskDue",
  COMMENT_MENTION: "commentMention",
  MEMBER_JOINED: "memberJoined",
  PROJECT_UPDATE: "projectUpdate",
} as const);

export type NotificationPrefKey =
  (typeof NOTIFICATION_PREF_KEYS)[keyof typeof NOTIFICATION_PREF_KEYS];

export const SUBSCRIPTION_PLANS = Object.freeze({
  FREE: "FREE",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
} as const);

export type SubscriptionPlan =
  (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS];

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  TRIALING: "TRIALING",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
} as const);

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export interface PlanDef {
  id: SubscriptionPlan;
  name: string;
  /** Monthly price in cents (USD). */
  priceCents: number;
  /** Included seats (members). */
  seats: number;
  features: readonly string[];
}

/** Plan catalog — single source of truth for pricing & seat limits. */
export const PLAN_CATALOG: Readonly<Record<SubscriptionPlan, PlanDef>> = Object.freeze({
  FREE: {
    id: "FREE",
    name: "Free",
    priceCents: 0,
    seats: 3,
    features: ["Up to 3 members", "Unlimited projects", "Kanban & tasks"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceCents: 2900,
    seats: 25,
    features: ["Up to 25 members", "Priority support", "Advanced roles"],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    priceCents: 9900,
    seats: 200,
    features: ["Up to 200 members", "SSO & audit logs", "Dedicated support"],
  },
});

export const SOCKET_EVENTS = Object.freeze({
  // Rooms
  PROJECT_JOIN: "project:join",
  PROJECT_LEAVE: "project:leave",
  // Presence
  PRESENCE_UPDATE: "presence:update",
  // Tasks
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  // Projects
  PROJECT_UPDATED: "project:updated",
  // Notifications
  NOTIFICATION_NEW: "notification:new",
} as const);

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
} as const);

// Export as default for CommonJS compatibility
export default {
  ROLES,
  PROJECT_ROLES,
  PROJECT_STATUS,
  TASK_STATUS,
  BOARD_COLUMNS,
  PRIORITY,
  PRIORITY_ORDER,
  NOTIFICATION_TYPES,
  NOTIFICATION_PREF_KEYS,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  PLAN_CATALOG,
  SOCKET_EVENTS,
  PAGINATION,
};
