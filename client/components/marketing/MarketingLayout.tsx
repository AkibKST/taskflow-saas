/**
 * Shared shell for every marketing page (`/`, /features, /pricing, /about,
 * /contact): the slate-gradient backdrop, the shared nav and the footer —
 * defined once so chrome can't drift page-to-page. Server component; only the
 * nav (auth-aware CTA) hydrates on the client.
 */
import { ReactNode } from "react";
import Link from "next/link";
import MarketingNav from "./MarketingNav";
import { cx, pageBg } from "@/lib/ui";

const FOOTER_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cx("flex min-h-screen flex-col", pageBg)}>
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-white/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center">
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1" aria-label="Footer">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-gray-600 transition-colors hover:text-gray-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TaskFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
