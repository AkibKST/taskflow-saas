/**
 * Centralized UI style tokens.
 *
 * These are the recurring Tailwind class combinations pulled out of the
 * login / register pages so the whole app shares one visual language
 * (rounded shells, brand-indigo gradients, soft shadows). Import the token
 * instead of re-typing the class string, and the theme stays consistent.
 */

/** App-wide page background — soft slate gradient (login/register backdrop). */
export const pageBg = "bg-gradient-to-br from-slate-100 to-slate-200";

/** The branded indigo gradient used for icon badges / accents. */
export const brandGradient = "bg-gradient-to-br from-brand-500 to-brand-700";

/** Primary call-to-action button (matches the login "Sign in" button). */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60";

/** Subtle / secondary button. */
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200";

/** Standard white surface card (rounded-3xl + soft shadow). */
export const card =
  "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100";

/** Pill input wrapper (the grey rounded field from the auth forms). */
export const inputPill =
  "flex items-center gap-3 rounded-full bg-gray-100 px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500/40";

/** Pill input wrapper in its error state (red ring instead of brand ring). */
export const inputPillError =
  "flex items-center gap-3 rounded-full bg-red-50 px-4 py-3 ring-2 ring-red-300 focus-within:ring-red-400";

/** Inline, per-field validation message shown under an input. */
export const fieldErrorText = "px-4 pt-1 text-xs font-medium text-red-600";

/** Circular gradient icon badge (the 9×9 icon chips on the auth forms). */
export const iconBadge =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white";

/** Small uppercase section label. */
export const sectionLabel =
  "text-xs font-semibold uppercase tracking-wide text-gray-400";

/** Role → badge color mapping (DB `Role` enum). */
export const roleBadge: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-700",
  ADMIN: "bg-rose-100 text-rose-700",
  MANAGER: "bg-brand-100 text-brand-700",
  MEMBER: "bg-emerald-100 text-emerald-700",
  VIEWER: "bg-gray-100 text-gray-600",
};

/** TaskStatus → badge color mapping (DB `TaskStatus` enum). */
export const taskStatusBadge: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-emerald-100 text-emerald-700",
  BLOCKED: "bg-rose-100 text-rose-700",
};

/** Priority → badge color mapping (DB `Priority` enum). */
export const priorityBadge: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-500",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-rose-100 text-rose-700",
};

/** ProjectStatus → badge color mapping (DB `ProjectStatus` enum). */
export const projectStatusBadge: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-brand-100 text-brand-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

/** Combine class names, skipping falsy values. */
export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
