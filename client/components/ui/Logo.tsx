import Link from "next/link";

export default function Logo({
  light = false,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 font-bold tracking-tight ${light ? "text-white" : "text-gray-900"} ${className}`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ${light ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-brand-600 text-white"}`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12.5 10 17.5 19 6.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-xl">TaskFlow</span>
    </Link>
  );
}
