/**
 * Centered card shell for the secondary auth pages (forgot / reset password,
 * verify email): logo on top, one white card, optional icon chip. Keeps the
 * whole auth flow visually one family with AuthShell.
 */
import { ReactNode } from "react";
import { Logo } from "@/components/ui";
import { cx, iconBadge, pageBg } from "@/lib/ui";

interface AuthCardProps {
  title: string;
  subtitle?: ReactNode;
  /** Small stroke icon rendered in a gradient chip above the title. */
  icon?: ReactNode;
  children: ReactNode;
}

export default function AuthCard({ title, subtitle, icon, children }: AuthCardProps) {
  return (
    <div className={cx("flex min-h-screen flex-col items-center justify-center px-4 py-12", pageBg)}>
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-100 sm:p-10">
        <div className="text-center">
          {icon && (
            <span className={cx(iconBadge, "mx-auto mb-4 !h-12 !w-12")}>{icon}</span>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
