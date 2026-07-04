"use client";
import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  forwardRef,
  useId,
} from "react";
import { control, cx, fieldErrorText } from "@/lib/ui";

/**
 * The one labeled form-control family: `Field` (input), `Select`, `Textarea`.
 * All render the shared `control` token (rounded-xl bordered field with a
 * visible focus ring) plus a proper `<label>`, optional hint and inline error
 * wired up with `aria-invalid` / `aria-describedby`.
 */

function LabelRow({
  inputId,
  label,
  hint,
}: {
  inputId: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className={fieldErrorText}>
      {error}
    </p>
  );
}

/* ------------------------------ Field ------------------------------ */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Adornment rendered inside the input on the right (e.g. a show-password toggle). */
  trailing?: ReactNode;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, trailing, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div>
        <LabelRow inputId={inputId} label={label} hint={hint} />
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errorId : undefined}
            className={cx(
              control,
              trailing ? "pr-11" : undefined,
              error && "border-red-300 focus:border-red-400 focus:ring-red-500/15",
              className,
            )}
            {...props}
          />
          {trailing && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-3">
              {trailing}
            </span>
          )}
        </div>
        <ErrorText id={errorId} error={error} />
      </div>
    );
  },
);
Field.displayName = "Field";

export default Field;

/* ------------------------------ Select ----------------------------- */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, id, className = "", children, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div>
        <LabelRow inputId={inputId} label={label} hint={hint} />
        <select
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(control, "cursor-pointer", error && "border-red-300", className)}
          {...props}
        >
          {children}
        </select>
        <ErrorText id={errorId} error={error} />
      </div>
    );
  },
);
Select.displayName = "Select";

/* ----------------------------- Textarea ---------------------------- */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div>
        <LabelRow inputId={inputId} label={label} hint={hint} />
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx(control, "min-h-[80px] resize-y", error && "border-red-300", className)}
          {...props}
        />
        <ErrorText id={errorId} error={error} />
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
