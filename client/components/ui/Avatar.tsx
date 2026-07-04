/**
 * The one avatar. Deterministic per-user color (hash of the stable id → one of
 * eight hues) and two-letter initials, so "Anna", "Adam" and "Aisha" are
 * visually distinct. Type floor: 11px minimum, even at the smallest size.
 */
import { cx } from "@/lib/ui";

const HUES = [
  "bg-gradient-to-br from-brand-500 to-brand-700",
  "bg-gradient-to-br from-sky-500 to-sky-700",
  "bg-gradient-to-br from-emerald-500 to-emerald-700",
  "bg-gradient-to-br from-amber-500 to-amber-700",
  "bg-gradient-to-br from-rose-500 to-rose-700",
  "bg-gradient-to-br from-violet-500 to-violet-700",
  "bg-gradient-to-br from-teal-500 to-teal-700",
  "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700",
];

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizes: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[11px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-xl",
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  /** Stable id used for the color hash. Falls back to `name`. */
  id?: string;
  size?: AvatarSize;
  className?: string;
  title?: string;
}

export default function Avatar({ name, id, size = "md", className, title }: AvatarProps) {
  const hue = HUES[hash(id || name || "?") % HUES.length];
  return (
    <span
      title={title ?? name}
      className={cx(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        sizes[size],
        hue,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
