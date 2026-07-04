/**
 * Split-screen shell for the primary auth pages (login, register): brand
 * panel with the gradient + dot pattern on the left, clean white form panel
 * on the right. The panel content (`aside`) differs per page so login and
 * register read as two distinct screens, not the same page twice.
 */
import { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { buttonClasses } from "@/lib/ui";

interface AuthShellProps {
  /** Form heading. */
  title: string;
  subtitle?: ReactNode;
  /** Brand-panel content (headline + highlights / steps). */
  aside: ReactNode;
  /** Form content. */
  children: ReactNode;
  /** Always-visible button to the opposite auth page, shown top-right of the
   * form panel (e.g. "New to TaskFlow?" → Create workspace). */
  switchLink?: { prompt: string; label: string; href: string };
  /** Line under the form, e.g. the switch link to the other auth page. */
  footer?: ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  aside,
  children,
  switchLink,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
        <Logo light className="relative" />
        <div className="relative max-w-md">{aside}</div>
        <p className="relative text-sm text-brand-100">
          © {new Date().getFullYear()} TaskFlow. All rights reserved.
        </p>
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="flex w-full flex-col px-4 py-6 sm:px-8 lg:w-1/2">
        {/* Top bar: logo (mobile only) + switch to the opposite auth page */}
        <div className="flex items-center justify-between gap-4">
          <div className="lg:hidden">
            <Logo />
          </div>
          {switchLink && (
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm text-gray-600 sm:inline">
                {switchLink.prompt}
              </span>
              <Link href={switchLink.href} className={buttonClasses("secondary", "sm")}>
                {switchLink.label}
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && (
              <p className="mt-8 text-center text-sm text-gray-600">{footer}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
