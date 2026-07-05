import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTasks } from "../useTasks";
import { useTaskStore, Task } from "@/store/taskStore";
import { useToastStore } from "@/store/toastStore";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: vi.fn(), off: vi.fn() }),
}));

const mockedApi = vi.mocked(api);

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  status: "TODO",
  priority: "MEDIUM",
  ...extra,
});

// The api helper resolves to the server envelope: { data: <payload> }
const envelope = <T,>(data: T) => ({ data }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  useTaskStore.setState({
    tasks: [],
    total: 0,
    pendingMutationIds: new Set(),
    isMutating: false,
  });
  useToastStore.setState({ toasts: [] });
  // Default initial fetch: empty board
  mockedApi.get.mockResolvedValue(envelope({ tasks: [], total: 0 }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTasks", () => {
  it("fetches tasks for the project on mount", async () => {
    mockedApi.get.mockResolvedValueOnce(
      envelope({ tasks: [task("a"), task("b")], total: 2 })
    );

    const { result } = renderHook(() => useTasks("p1"));

    await waitFor(() => expect(result.current.tasks).toHaveLength(2));
    expect(mockedApi.get).toHaveBeenCalledWith("/projects/p1/tasks");
    expect(result.current.total).toBe(2);
  });

  it("createTask shows the task immediately and swaps in the server copy", async () => {
    mockedApi.post.mockResolvedValueOnce(envelope(task("real-1", { title: "New" })));

    const { result } = renderHook(() => useTasks("p1"));
    // Let the mount fetch settle first, as it would before any user input
    await act(async () => {});

    await act(async () => {
      await result.current.createTask({ title: "New", status: "TODO" });
    });

    expect(mockedApi.post).toHaveBeenCalledWith("/projects/p1/tasks", {
      title: "New",
      status: "TODO",
    });
    expect(result.current.tasks.map((t) => t.id)).toEqual(["real-1"]);
    expect(result.current.tasks[0]._isOptimistic).toBeUndefined();
  });

  it("createTask rolls back and toasts when the API fails", async () => {
    mockedApi.post.mockRejectedValueOnce(new Error("Server exploded"));

    const { result } = renderHook(() => useTasks("p1"));

    await act(async () => {
      await result.current.createTask({ title: "Doomed" });
    });

    expect(result.current.tasks).toHaveLength(0);
    expect(useToastStore.getState().toasts).toMatchObject([
      { type: "error", message: "Server exploded" },
    ]);
  });

  it("updateTask rolls back to the snapshot when the API fails", async () => {
    mockedApi.get.mockResolvedValueOnce(
      envelope({ tasks: [task("a", { status: "TODO" })], total: 1 })
    );
    mockedApi.patch.mockRejectedValueOnce(new Error("nope"));

    const { result } = renderHook(() => useTasks("p1"));
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    await act(async () => {
      await result.current.updateTask("a", { status: "DONE" });
    });

    expect(result.current.tasks[0].status).toBe("TODO");
    expect(result.current.isMutating).toBe(false);
    expect(useToastStore.getState().toasts[0]).toMatchObject({ type: "error" });
  });

  it("deleteTask defers the API call for the undo window, then deletes", async () => {
    vi.useFakeTimers();
    mockedApi.get.mockResolvedValueOnce(envelope({ tasks: [task("a")], total: 1 }));
    mockedApi.delete.mockResolvedValueOnce(envelope(null));

    const { result } = renderHook(() => useTasks("p1"));
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(result.current.tasks).toHaveLength(1);

    await act(async () => {
      await result.current.deleteTask("a");
    });

    // Gone locally, but nothing sent yet — the undo window is open
    expect(result.current.tasks).toHaveLength(0);
    expect(mockedApi.delete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockedApi.delete).toHaveBeenCalledWith("/projects/p1/tasks/a");
  });

  it("undo restores the task and cancels the API call", async () => {
    vi.useFakeTimers();
    mockedApi.get.mockResolvedValueOnce(envelope({ tasks: [task("a")], total: 1 }));

    const { result } = renderHook(() => useTasks("p1"));
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    await act(async () => {
      await result.current.deleteTask("a");
    });

    const undoToast = useToastStore.getState().toasts[0];
    expect(undoToast.action?.label).toBe("Undo");
    act(() => {
      undoToast.action!.onAction();
    });

    expect(result.current.tasks.map((t) => t.id)).toEqual(["a"]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mockedApi.delete).not.toHaveBeenCalled();
  });

  it("reorderTasks applies optimistically and re-fetches on failure", async () => {
    mockedApi.get.mockResolvedValueOnce(
      envelope({ tasks: [task("a", { order: 0 }), task("b", { order: 1 })], total: 2 })
    );

    const { result } = renderHook(() => useTasks("p1"));
    await waitFor(() => expect(result.current.tasks).toHaveLength(2));

    // Failure path: server rejects, hook must restore consistency by re-fetching
    mockedApi.patch.mockRejectedValueOnce(new Error("conflict"));
    mockedApi.get.mockResolvedValueOnce(
      envelope({ tasks: [task("a", { order: 0 }), task("b", { order: 1 })], total: 2 })
    );

    await act(async () => {
      await result.current.reorderTasks([
        { id: "a", order: 1, status: "DONE" },
        { id: "b", order: 0 },
      ]);
    });

    expect(mockedApi.patch).toHaveBeenCalledWith("/projects/p1/tasks/reorder", {
      updates: [
        { id: "a", order: 1, status: "DONE" },
        { id: "b", order: 0 },
      ],
    });
    // Board restored from the re-fetch, not left half-reordered
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.tasks.find((t) => t.id === "a")?.order).toBe(0);
    expect(useToastStore.getState().toasts[0]).toMatchObject({ type: "error" });
  });
});
