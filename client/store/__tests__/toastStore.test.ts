import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useToastStore } from "../toastStore";

const state = () => useToastStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  // Dismiss anything left over from a previous test (also clears its timer)
  state().toasts.forEach((t) => state().dismiss(t.id));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toast store", () => {
  it("shows a toast and auto-dismisses after the default 4s", () => {
    state().show("saved", "success");
    expect(state().toasts).toHaveLength(1);
    expect(state().toasts[0]).toMatchObject({ message: "saved", type: "success" });

    vi.advanceTimersByTime(3999);
    expect(state().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(state().toasts).toHaveLength(0);
  });

  it("toasts with an action get the longer 6s window", () => {
    state().show("Task deleted", "info", {
      action: { label: "Undo", onAction: () => {} },
    });

    vi.advanceTimersByTime(4000);
    expect(state().toasts).toHaveLength(1); // still visible
    vi.advanceTimersByTime(2000);
    expect(state().toasts).toHaveLength(0);
  });

  it("dismiss removes immediately", () => {
    const id = state().show("bye");
    state().dismiss(id);
    expect(state().toasts).toHaveLength(0);
  });

  it("pause stops auto-dismiss; resume re-arms it", () => {
    const id = state().show("hover me");

    state().pause(id);
    vi.advanceTimersByTime(60_000);
    expect(state().toasts).toHaveLength(1); // survived way past its duration

    state().resume(id);
    vi.advanceTimersByTime(2000); // resume uses a short grace period
    expect(state().toasts).toHaveLength(0);
  });

  it("resume on an already-running or unknown toast is a no-op", () => {
    const id = state().show("normal");
    state().resume(id); // timer already running — must not double-arm
    state().resume(9999); // unknown id — must not throw
    vi.advanceTimersByTime(4000);
    expect(state().toasts).toHaveLength(0);
  });
});
