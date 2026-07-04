"use client";
import { FC } from "react";
import { useToastStore, Toast, ToastType } from "@/store/toastStore";

// All variants keep text contrast ≥ 4.5:1 — warning is dark-on-amber, not
// white-on-yellow.
const typeStyles: Record<ToastType, string> = {
  info: "bg-gray-800 text-white",
  success: "bg-green-700 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-amber-400 text-amber-950",
};

export const Toaster: FC = () => {
  const { toasts, dismiss, pause, resume } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast: Toast) => (
        <div
          key={toast.id}
          role="status"
          onMouseEnter={() => pause(toast.id)}
          onMouseLeave={() => resume(toast.id)}
          className={`flex max-w-xs items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${
            typeStyles[toast.type] ?? typeStyles.info
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onAction();
                dismiss(toast.id);
              }}
              className="shrink-0 rounded-full px-2 py-0.5 text-sm font-bold underline decoration-2 underline-offset-2 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-current"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-lg leading-none opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};
