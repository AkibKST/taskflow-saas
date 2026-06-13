/**
 * Translates backend error responses into something the UI can render.
 *
 * The API returns errors in this shape (see server globalErrorHandler):
 *   {
 *     success: false,
 *     message: "Zod Error" | "Invalid credentials" | ...,
 *     errorSources: [{ path: "orgName", message: "Org name min 2 chars" }, ...]
 *   }
 *
 * `parseApiError` turns that into:
 *   - `message`     → a single human-friendly headline for the alert banner
 *   - `fieldErrors` → { fieldName: message } for inline, per-input errors
 */

export interface ParsedApiError {
  message: string;
  fieldErrors: Record<string, string>;
}

interface ErrorSource {
  path?: string;
  message?: string;
}

interface ApiErrorData {
  message?: string;
  errorSources?: ErrorSource[];
}

/** Friendly headline for status codes that don't carry field-level detail. */
const statusMessage = (status?: number, fallback?: string): string => {
  switch (status) {
    case 400:
      return fallback || "Please check the form and try again.";
    case 401:
      return "The email or password you entered is incorrect.";
    case 403:
      return "Your account doesn't have access. Please contact support.";
    case 404:
      return "We couldn't find an account with those details.";
    case 409:
      return fallback || "An account with that email already exists.";
    case 429:
      return "Too many attempts. Please wait a moment and try again.";
    default:
      if (status && status >= 500) {
        return "Something went wrong on our end. Please try again shortly.";
      }
      return fallback || "Something went wrong. Please try again.";
  }
};

export const parseApiError = (err: unknown): ParsedApiError => {
  // Network / server unreachable (axios sets no response, throws TypeError-like)
  const status = (err as { status?: number })?.status;
  const data = (err as { data?: ApiErrorData })?.data;
  const rawMessage = (err as { message?: string })?.message;

  if (status === undefined && err) {
    // No HTTP status means the request never reached the server.
    return {
      message:
        "Unable to reach the server. Please check your connection and try again.",
      fieldErrors: {},
    };
  }

  // Collect per-field messages from Zod / validation errorSources.
  const fieldErrors: Record<string, string> = {};
  for (const src of data?.errorSources ?? []) {
    if (src.path && src.message && !fieldErrors[src.path]) {
      fieldErrors[src.path] = src.message;
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  // If the backend just said "Zod Error", prefer a friendlier headline.
  const backendMessage =
    rawMessage && rawMessage !== "Zod Error" ? rawMessage : undefined;

  const message = hasFieldErrors
    ? "Please fix the highlighted fields and try again."
    : statusMessage(status, backendMessage);

  return { message, fieldErrors };
};
