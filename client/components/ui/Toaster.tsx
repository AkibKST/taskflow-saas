"use client";
import { FC } from "react";
import { useToastStore, Toast, ToastType } from "@/store/toastStore";

const typeStyles: Record<ToastType, string> = {
  info: "bg-gray-800 text-white",
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-yellow-500 text-white",
};

export const Toaster: FC = () => {
  const { toasts, dismiss } = useToastStore();

  const handleDismiss = (id: number): void => {
    dismiss(id);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast: Toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs cursor-pointer ${
            typeStyles[toast.type] ?? typeStyles.info
          }`}
          onClick={() => handleDismiss(toast.id)}
        >
          <span className="flex-1">{toast.message}</span>
          <button className="opacity-70 hover:opacity-100 text-lg leading-none">
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};
