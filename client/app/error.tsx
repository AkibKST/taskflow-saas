"use client";

import { useEffect } from "react";

/**
 * Route-segment error boundary. Without this, an uncaught render error
 * white-screens the whole app; here we show a recoverable fallback instead.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div aria-hidden="true" className="text-4xl">⚠️</div>
      <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="max-w-md text-sm text-gray-600">
        An unexpected error occurred. You can try again, or head back to your
        dashboard.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
