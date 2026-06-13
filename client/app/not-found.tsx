import Link from "next/link";
import { btnPrimary, cx, pageBg } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className={cx("flex min-h-screen flex-col items-center justify-center px-6 text-center", pageBg)}>
      <p className="text-7xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link href="/" className={cx(btnPrimary, "mt-8 !px-6 !py-3")}>
        Back home
      </Link>
    </div>
  );
}
