"use client";

/**
 * Root error boundary — catches errors thrown in the root layout itself (which
 * `error.tsx` cannot). Must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold">The app crashed</h2>
          <p className="max-w-md text-sm text-gray-500">
            A critical error prevented the page from rendering.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
