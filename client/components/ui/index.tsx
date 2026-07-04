/**
 * Shared, reusable UI primitives built on the centralized style tokens
 * in `@/lib/ui`. These keep the dashboard (and the rest of the app) visually
 * consistent with the login / register theme.
 *
 * This barrel is the single import point for the component library:
 * Button, Field/Select/Textarea, Modal, Avatar, Card, Badge, StatCard,
 * SectionHeader, EmptyState.
 */
import { ReactNode } from "react";
import { card, cx, iconBadge, sectionLabel } from "@/lib/ui";

export { default as Button } from "./Button";
export { buttonClasses } from "@/lib/ui";
export { default as Field, Select, Textarea } from "./Field";
export { default as Modal } from "./Modal";
export { default as Avatar, initials } from "./Avatar";
export { default as Logo } from "./Logo";

/* ----------------------------- Card ----------------------------- */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(card, className)}>{children}</div>;
}

/* ------------------------- Section header ------------------------ */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

/* --------------------------- Badge pill -------------------------- */
export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------- Icon badge -------------------------- */
export function IconBadge({ children }: { children: ReactNode }) {
  return <span className={iconBadge}>{children}</span>;
}

/* ---------------------------- Stat card -------------------------- */
export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="flex items-center gap-4 !p-5">
      <IconBadge>{icon}</IconBadge>
      <div className="min-w-0">
        <p className={sectionLabel}>{label}</p>
        <p className="truncate text-2xl font-bold text-gray-900">{value}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </Card>
  );
}

/* ------------------------- Empty placeholder -------------------- */
export function EmptyState({
  emoji = "📭",
  title,
  hint,
}: {
  emoji?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="py-12 text-center">
      <p aria-hidden="true" className="mb-2 text-4xl">{emoji}</p>
      <p className="font-medium text-gray-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
