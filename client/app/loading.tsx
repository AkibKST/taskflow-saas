/**
 * Route-segment loading UI, shown by Next.js during navigation/suspense so
 * transitions don't leave a blank screen.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
