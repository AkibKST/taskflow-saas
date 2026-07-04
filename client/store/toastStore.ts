import { create } from "zustand";

export type ToastType = "info" | "success" | "error" | "warning";

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

export interface ToastOptions {
  /** Auto-dismiss delay in ms. Defaults to 4000 (6000 when an action is present). */
  duration?: number;
  /** Optional action button (e.g. "Undo"). Runs, then dismisses the toast. */
  action?: ToastAction;
}

export interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: ToastType, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  /** Pause auto-dismiss (pointer over the toast). */
  pause: (id: number) => void;
  /** Resume auto-dismiss after a pause. */
  resume: (id: number) => void;
}

let _id = 0;

// Auto-dismiss timers live outside the store so pause/resume can manage them.
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const durations = new Map<number, number>();

const startTimer = (id: number, ms: number, dismiss: (id: number) => void) => {
  timers.set(
    id,
    setTimeout(() => dismiss(id), ms),
  );
};

export const useToastStore = create<ToastState>((set) => {
  const dismiss = (id: number) => {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    durations.delete(id);
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  };

  return {
    toasts: [],
    show: (message, type = "info", options = {}) => {
      const id = ++_id;
      const duration = options.duration ?? (options.action ? 6000 : 4000);
      set((s) => ({
        toasts: [...s.toasts, { id, message, type, action: options.action }],
      }));
      durations.set(id, duration);
      startTimer(id, duration, dismiss);
      return id;
    },
    dismiss,
    pause: (id) => {
      const t = timers.get(id);
      if (t) {
        clearTimeout(t);
        timers.delete(id);
      }
    },
    resume: (id) => {
      if (timers.has(id) || !durations.has(id)) return;
      // Restart with a short grace period rather than tracking elapsed time.
      startTimer(id, Math.min(durations.get(id) ?? 2000, 2000), dismiss);
    },
  };
});

export const showToast = (
  message: string,
  type?: ToastType,
  options?: ToastOptions,
) => useToastStore.getState().show(message, type, options);
