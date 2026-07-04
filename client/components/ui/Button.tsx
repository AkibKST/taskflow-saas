"use client";
import { ButtonHTMLAttributes } from "react";
import { buttonClasses, cx, ButtonSize, ButtonVariant } from "@/lib/ui";

/**
 * The one button. Pill-shaped per the design spec (radius: pill = interactive
 * chip). Every clickable action in the app should render through this
 * component or `buttonClasses` from `@/lib/ui` (for styled `<Link>`s) — no
 * raw `bg-brand-600` buttons in pages.
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, cx(fullWidth && "w-full", className))}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
