import { describe, it, expect, beforeEach } from "vitest";
import { useTaskStore, Task } from "../taskStore";

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  status: "TODO",
  priority: "MEDIUM",
  ...extra,
});

const state = () => useTaskStore.getState();

beforeEach(() => {
  useTaskStore.setState({
    tasks: [],
    total: 0,
    pendingMutationIds: new Set(),
    isMutating: false,
  });
});

describe("optimistic add", () => {
  it("adds the temp task and swaps it for the server task on confirm", () => {
    state().optimisticAdd(task("temp-1", { _isOptimistic: true }));
    expect(state().tasks).toHaveLength(1);
    expect(state().isMutating).toBe(true);

    state().confirmAdd("temp-1", task("real-1"));
    expect(state().tasks.map((t) => t.id)).toEqual(["real-1"]);
    expect(state().total).toBe(1);
    expect(state().isMutating).toBe(false);
  });

  it("removes the temp task on rollback without touching total", () => {
    useTaskStore.setState({ tasks: [task("a")], total: 1 });
    state().optimisticAdd(task("temp-1", { _isOptimistic: true }));

    state().rollbackAdd("temp-1");
    expect(state().tasks.map((t) => t.id)).toEqual(["a"]);
    expect(state().total).toBe(1);
    expect(state().isMutating).toBe(false);
  });
});

describe("optimistic update", () => {
  it("applies the patch immediately and returns the pre-patch snapshot", () => {
    useTaskStore.setState({ tasks: [task("a", { status: "TODO" })], total: 1 });

    const snapshot = state().optimisticUpdate("a", { status: "DONE" }, "m1");
    expect(snapshot?.status).toBe("TODO");

    const updated = state().tasks[0];
    expect(updated.status).toBe("DONE");
    expect(updated._isOptimistic).toBe(true);
    expect(state().pendingMutationIds.has("m1")).toBe(true);
    expect(state().isMutating).toBe(true);
  });

  it("confirm swaps in the server task and strips optimistic markers", () => {
    useTaskStore.setState({ tasks: [task("a")], total: 1 });
    state().optimisticUpdate("a", { status: "DONE" }, "m1");

    state().confirmUpdate("a", task("a", { status: "DONE" }), "m1");
    const t = state().tasks[0];
    expect(t.status).toBe("DONE");
    expect(t._isOptimistic).toBeUndefined();
    expect(state().pendingMutationIds.has("m1")).toBe(false);
    expect(state().isMutating).toBe(false);
  });

  it("rollback restores the snapshot", () => {
    useTaskStore.setState({ tasks: [task("a", { status: "TODO" })], total: 1 });
    const snapshot = state().optimisticUpdate("a", { status: "DONE" }, "m1")!;

    state().rollbackUpdate("a", snapshot, "m1");
    expect(state().tasks[0].status).toBe("TODO");
    expect(state().tasks[0]._isOptimistic).toBeUndefined();
    expect(state().isMutating).toBe(false);
  });

  it("isMutating stays true while another mutation is still pending", () => {
    useTaskStore.setState({ tasks: [task("a"), task("b")], total: 2 });
    state().optimisticUpdate("a", { status: "DONE" }, "m1");
    state().optimisticUpdate("b", { status: "DONE" }, "m2");

    state().confirmUpdate("a", task("a", { status: "DONE" }), "m1");
    expect(state().isMutating).toBe(true);

    state().confirmUpdate("b", task("b", { status: "DONE" }), "m2");
    expect(state().isMutating).toBe(false);
  });
});

describe("optimistic delete", () => {
  it("removes immediately and restores on rollback (undo)", () => {
    useTaskStore.setState({ tasks: [task("a"), task("b")], total: 2 });

    const snapshot = state().optimisticDelete("a")!;
    expect(state().tasks.map((t) => t.id)).toEqual(["b"]);
    expect(state().total).toBe(1);

    state().rollbackDelete(snapshot);
    expect(state().tasks.map((t) => t.id).sort()).toEqual(["a", "b"]);
    expect(state().total).toBe(2);
  });

  it("total never goes below zero", () => {
    useTaskStore.setState({ tasks: [task("a")], total: 0 });
    state().optimisticDelete("a");
    expect(state().total).toBe(0);
  });
});

describe("socket sync", () => {
  it("syncCreated de-dupes tasks that already exist (own echo)", () => {
    useTaskStore.setState({ tasks: [task("a")], total: 1 });
    state().syncCreated(task("a"));
    expect(state().tasks).toHaveLength(1);
    expect(state().total).toBe(1);

    state().syncCreated(task("b"));
    expect(state().tasks).toHaveLength(2);
    expect(state().total).toBe(2);
  });

  it("syncUpdated does not clobber a local optimistic change", () => {
    useTaskStore.setState({ tasks: [task("a")], total: 1 });
    state().optimisticUpdate("a", { status: "IN_PROGRESS" }, "m1");

    // A stale echo arrives from the server while the mutation is in flight
    state().syncUpdated(task("a", { status: "TODO", title: "renamed remotely" }));

    const t = state().tasks[0];
    expect(t.status).toBe("IN_PROGRESS"); // local optimistic field preserved
    expect(t._isOptimistic).toBe(true);
  });

  it("syncUpdated applies remote changes to non-optimistic tasks", () => {
    useTaskStore.setState({ tasks: [task("a", { status: "TODO" })], total: 1 });
    state().syncUpdated(task("a", { status: "DONE" }));
    expect(state().tasks[0].status).toBe("DONE");
  });

  it("syncBatchReorder updates order/status but skips in-flight tasks", () => {
    useTaskStore.setState({
      tasks: [task("a", { order: 0 }), task("b", { order: 1, _isOptimistic: true })],
      total: 2,
    });

    state().syncBatchReorder([
      { id: "a", order: 5, status: "DONE" },
      { id: "b", order: 9 },
    ]);

    expect(state().tasks[0].order).toBe(5);
    expect(state().tasks[0].status).toBe("DONE");
    expect(state().tasks[1].order).toBe(1); // optimistic task untouched
  });

  it("syncDeleted removes by id", () => {
    useTaskStore.setState({ tasks: [task("a"), task("b")], total: 2 });
    state().syncDeleted({ id: "a" });
    expect(state().tasks.map((t) => t.id)).toEqual(["b"]);
    expect(state().total).toBe(1);
  });
});
