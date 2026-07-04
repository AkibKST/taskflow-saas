/**
 * Centralized UI style tokens — the single visual language of TaskFlow.
 *
 * ── Design spec ─────────────────────────────────────────────────────────────
 * Radius scale      pill (`rounded-full`)  → buttons, badges, avatars, chips
 *                   control (`rounded-xl`) → inputs, selects, textareas, menu items
 *                   overlay (`rounded-2xl`)→ modals, dropdowns, popovers
 *                   card (`rounded-3xl`)   → page-level surface cards
 * Elevation scale   flat (ring-1 ring-gray-100) → resting cards
 *                   raised (shadow-sm)          → cards, controls
 *                   floating (shadow-lg/xl)     → dropdowns, modals, toasts
 * Backgrounds       marketing/auth → `pageBg` slate gradient
 *                   app pages      → `bg-gray-50` with white surface cards
 * Text contrast     secondary text is gray-500 MINIMUM on white (WCAG AA);
 *                   gray-400 is reserved for disabled/decorative only.
 * Type floor        11px (`text-[11px]`) — never smaller for readable UI.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Import the token instead of re-typing class strings. For interactive
 * controls prefer the primitives in `@/components/ui` (Button, Field, Select,
 * Modal, Avatar) — they are built on these tokens.
 */

/** App-wide page background — soft slate gradient (marketing/auth backdrop). */
export const pageBg = "bg-gradient-to-br from-slate-100 to-slate-200";

/** The branded indigo gradient used for icon badges / accents. */
export const brandGradient = "bg-gradient-to-br from-brand-500 to-brand-700";

/** Shared focus treatment for every interactive element. */
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

/** Primary call-to-action button (pill gradient — matches "Sign in"). */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-transform motion-safe:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 " +
  focusRing;

/** Subtle / secondary button. */
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 " +
  focusRing;

/** Bordered white button (toolbars, secondary actions on white). */
export const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 " +
  focusRing;

/** Standard white surface card (rounded-3xl + soft shadow). */
export const card = "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100";

/** Standard bordered form control (inputs, selects, textareas). */
export const control =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

/** Inline, per-field validation message shown under an input. */
export const fieldErrorText = "pt-1 text-xs font-medium text-red-600";

/** Circular gradient icon badge (the 9×9 icon chips on the auth forms). */
export const iconBadge =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white";

/** Small uppercase section label. */
export const sectionLabel =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

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

/**
 * Priority → badge color mapping (DB `Priority` enum).
 * The ONLY priority palette — do not re-declare per component.
 */
export const priorityBadge: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
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

/* ------------------------- Button classes ------------------------- */
/* Defined here (not in the client-only Button component) so server
 * components can style <Link>s as buttons too. */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30 transition-transform motion-safe:hover:scale-[1.02]",
  secondary:
    "border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50",
  ghost: "bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200",
  danger:
    "bg-rose-600 text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:ring-rose-500",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
};

/** Class string for rendering a button — used by the Button primitive and by
 * `<Link>`s that need to look like one. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-60",
    focusRing,
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}
