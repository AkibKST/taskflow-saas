import { create } from "zustand";

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  order?: number;
  assignees?: TaskAssignee[];
  _isOptimistic?: boolean;
  _snapshot?: Task;
  _mutationId?: string;
  [key: string]: any;
}

export interface TaskState {
  tasks: Task[];
  total: number;
  // Track pending mutation ids so socket echoes of own mutations can be ignored
  pendingMutationIds: Set<string>;
  isMutating: boolean;

  setTasks: (tasks: Task[], total: number) => void;

  // Optimistic add
  optimisticAdd: (tempTask: Task) => void;
  confirmAdd: (tempId: string, realTask: Task) => void;
  rollbackAdd: (tempId: string) => void;

  // Optimistic update
  optimisticUpdate: (
    taskId: string,
    patch: Partial<Task>,
    mutationId: string
  ) => Task | undefined;
  confirmUpdate: (taskId: string, realTask: Task, mutationId: string) => void;
  rollbackUpdate: (taskId: string, snapshot: Task, mutationId: string) => void;

  // Optimistic delete
  optimisticDelete: (taskId: string) => Task | undefined;
  confirmDelete: () => void;
  rollbackDelete: (snapshot: Task) => void;

  // Real-time sync from socket
  syncCreated: (task: Task) => void;
  syncUpdated: (task: Task) => void;
  syncBatchReorder: (updates: { id: string; order: number; status?: string }[]) => void;
  syncDeleted: (payload: { id: string }) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,
  pendingMutationIds: new Set(),
  isMutating: false,

  setTasks: (tasks, total) => set({ tasks, total }),

  // ── Optimistic add ──────────────────────────────────────────────────────────
  optimisticAdd: (tempTask) =>
    set((s) => ({
      tasks: [...s.tasks, tempTask],
      isMutating: true,
    })),

  confirmAdd: (tempId, realTask) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === tempId ? realTask : t)),
      total: s.total + 1,
      isMutating: false,
    })),

  rollbackAdd: (tempId) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== tempId),
      isMutating: false,
    })),

  // ── Optimistic update ───────────────────────────────────────────────────────
  optimisticUpdate: (taskId, patch, mutationId) => {
    const snapshot = get().tasks.find((t) => t.id === taskId);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, ...patch, _isOptimistic: true, _snapshot: snapshot, _mutationId: mutationId }
          : t
      ),
      pendingMutationIds: new Set([...s.pendingMutationIds, mutationId]),
      isMutating: true,
    }));
    return snapshot;
  },

  confirmUpdate: (taskId, realTask, mutationId) =>
    set((s) => {
      const next = new Set(s.pendingMutationIds);
      next.delete(mutationId);
      return {
        tasks: s.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const { _isOptimistic: _, _snapshot: __, _mutationId: ___, ...rest } = realTask;
          return rest;
        }),
        pendingMutationIds: next,
        isMutating: next.size > 0,
      };
    }),

  rollbackUpdate: (taskId, snapshot, mutationId) =>
    set((s) => {
      const next = new Set(s.pendingMutationIds);
      next.delete(mutationId);
      return {
        tasks: s.tasks.map((t) => (t.id === taskId ? snapshot : t)),
        pendingMutationIds: next,
        isMutating: next.size > 0,
      };
    }),

  // ── Optimistic delete ───────────────────────────────────────────────────────
  optimisticDelete: (taskId) => {
    const snapshot = get().tasks.find((t) => t.id === taskId);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
      total: Math.max(0, s.total - 1),
      isMutating: true,
    }));
    return snapshot;
  },

  confirmDelete: () =>
    set((s) => ({ isMutating: s.pendingMutationIds.size > 0 })),

  rollbackDelete: (snapshot) =>
    set((s) => ({
      tasks: [...s.tasks, snapshot],
      total: s.total + 1,
      isMutating: false,
    })),

  // ── Real-time socket sync ───────────────────────────────────────────────────
  syncCreated: (task) =>
    set((s) => {
      // Skip if already present (own echo confirmed via confirmAdd)
      if (s.tasks.find((t) => t.id === task.id)) return s;
      return { tasks: [...s.tasks, task], total: s.total + 1 };
    }),

  syncUpdated: (task) =>
    set((s) => {
      // If we have a pending local mutation for this task, merge only non-in-flight fields
      // to avoid clobbering optimistic state with a stale server echo
      const local = s.tasks.find((t) => t.id === task.id);
      if (local?._isOptimistic) {
        // Merge: preserve local optimistic fields, apply remote fields that aren't in flight
        return {
          tasks: s.tasks.map((t) =>
            t.id === task.id ? { ...task, ...local, _isOptimistic: true } : t
          ),
        };
      }
      return {
        tasks: s.tasks.map((t) => (t.id === task.id ? task : t)),
      };
    }),

  syncBatchReorder: (updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        const u = updates.find((x) => x.id === t.id);
        if (!u || t._isOptimistic) return t;
        return {
          ...t,
          order: u.order,
          ...(u.status !== undefined && { status: u.status }),
        };
      }),
    })),

  syncDeleted: ({ id }) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      total: Math.max(0, s.total - 1),
    })),
}));

// ─── Function Summary ──────────────────────────────────────────────────────────
// setTasks(tasks, total)              → replaces full task list (initial fetch / refetch)
//
// optimisticAdd(tempTask)             → appends temp task, sets isMutating
// confirmAdd(tempId, realTask)        → swaps temp with real server response
// rollbackAdd(tempId)                 → removes temp task on failure
//
// optimisticUpdate(taskId, patch, mutationId)
//   → applies patch immediately, stores snapshot + mutationId for rollback/echo-filter
// confirmUpdate(taskId, realTask, mutationId)
//   → swaps to server response, clears mutationId from pending set
// rollbackUpdate(taskId, snapshot, mutationId)
//   → restores snapshot on failure, clears mutationId
//
// optimisticDelete(taskId)            → removes task immediately, stores snapshot
// rollbackDelete(snapshot)            → restores task on failure
//
// syncCreated(task)    → socket: add task if not already present (de-dupe own echoes)
// syncUpdated(task)    → socket: merge remotely with local optimistic state (no clobber)
// syncBatchReorder(updates) → socket: apply batch order/status from reorder event
// syncDeleted({id})    → socket: remove task by id
// ──────────────────────────────────────────────────────────────────────────────
