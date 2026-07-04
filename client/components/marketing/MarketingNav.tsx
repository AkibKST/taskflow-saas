"use client";
/**
 * Shared marketing header — one nav for `/`, /features, /pricing, /about and
 * /contact so the link set can't drift between pages. Client component only
 * because the CTA adapts to auth state; the pages that render it stay
 * server-rendered.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Logo, buttonClasses } from "@/components/ui";
import { cx } from "@/lib/ui";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthed = hasHydrated && !!user;

  return (
    <header className="border-b border-white/60 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cx(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === l.href
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <nav className="flex items-center gap-3">
          {isAuthed ? (
            <Link href="/dashboard" className={buttonClasses("primary", "sm", "!px-5 !py-2")}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "sm", "!px-5 !py-2")}>
                Sign in
              </Link>
              <Link href="/register" className={buttonClasses("primary", "sm", "!px-5 !py-2")}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
