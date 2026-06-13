interface AlertProps {
  variant?: "error" | "success" | "info";
  children: React.ReactNode;
}

const styles: Record<NonNullable<AlertProps["variant"]>, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-700",
  info: "border-brand-100 bg-brand-50 text-brand-700",
};

export default function Alert({ variant = "error", children }: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}
