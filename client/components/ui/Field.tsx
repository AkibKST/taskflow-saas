"use client";
import { InputHTMLAttributes, forwardRef, useId } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
          {hint && <span className="text-xs text-gray-400">{hint}</span>}
        </div>
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Field.displayName = "Field";

export default Field;
