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
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="max-w-md text-sm text-gray-500">
        An unexpected error occurred. You can try again, or head back to your
        dashboard.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
