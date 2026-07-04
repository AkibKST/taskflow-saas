"use client";
import { useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { useTaskStore, Task } from "@/store/taskStore";
import { showToast } from "@/store/toastStore";

const BATCH_REORDER_EVENT = "task:updated";

/** How long "Undo" stays available after deleting a task. */
const UNDO_WINDOW_MS = 5000;

interface ReorderUpdate {
  id: string;
  status?: string;
  order: number;
}

interface UseTasksReturn {
  tasks: Task[];
  total: number;
  isMutating: boolean;
  createTask: (data: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  reorderTasks: (updates: ReorderUpdate[]) => Promise<void>;
}

export const useTasks = (projectId: string): UseTasksReturn => {
  const {
    tasks,
    total,
    isMutating,
    pendingMutationIds,
    setTasks,
    optimisticAdd,
    confirmAdd,
    rollbackAdd,
    optimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    optimisticDelete,
    confirmDelete,
    rollbackDelete,
    syncCreated,
    syncUpdated,
    syncBatchReorder,
    syncDeleted,
  } = useTaskStore();

  // Initial fetch
  useEffect(() => {
    if (!projectId) return;
    api
      .get<{ tasks: Task[]; total: number }>(`/projects/${projectId}/tasks`)
      .then((res) => {
        if (res) setTasks(res.data.tasks, res.data.total);
      });
  }, [projectId, setTasks]);

  // Real-time sync — filter out echoes of our own mutations
  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();

    const handleCreated = (task: Task) => {
      // Own creates are confirmed via confirmAdd; skip external if already present
      syncCreated(task);
    };

    const handleUpdated = (payload: any) => {
      // Batch reorder event — use dedicated handler
      if (payload?._batchReorder && Array.isArray(payload.updates)) {
        syncBatchReorder(payload.updates);
        return;
      }
      // Skip if this is the echo of a mutation we're still tracking
      if (payload?._mutationId && pendingMutationIds.has(payload._mutationId)) return;
      syncUpdated(payload as Task);
    };

    const handleDeleted = (payload: { id: string }) => syncDeleted(payload);

    socket.on(SOCKET_EVENTS.TASK_CREATED, handleCreated);
    socket.on(BATCH_REORDER_EVENT, handleUpdated);
    socket.on(SOCKET_EVENTS.TASK_DELETED, handleDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.TASK_CREATED, handleCreated);
      socket.off(BATCH_REORDER_EVENT, handleUpdated);
      socket.off(SOCKET_EVENTS.TASK_DELETED, handleDeleted);
    };
  }, [projectId, pendingMutationIds, syncCreated, syncUpdated, syncBatchReorder, syncDeleted]);

  const createTask = useCallback(
    async (data: Partial<Task>) => {
      const tempId = `temp-${Date.now()}`;
      const tempTask: Task = { id: tempId, ...data, _isOptimistic: true } as Task;
      optimisticAdd(tempTask);
      try {
        const res = await api.post<Task>(`/projects/${projectId}/tasks`, data);
        if (res) confirmAdd(tempId, res.data);
      } catch (err: any) {
        rollbackAdd(tempId);
        showToast(err.message || "Failed to create task", "error");
      }
    },
    [projectId, optimisticAdd, confirmAdd, rollbackAdd]
  );

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<Task>) => {
      const mutationId = `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const snapshot = optimisticUpdate(taskId, patch, mutationId);
      try {
        const res = await api.patch<Task>(
          `/projects/${projectId}/tasks/${taskId}`,
          patch
        );
        if (res) confirmUpdate(taskId, res.data, mutationId);
      } catch (err: any) {
        if (snapshot) rollbackUpdate(taskId, snapshot, mutationId);
        showToast(err.message || "Failed to update task", "error");
      }
    },
    [projectId, optimisticUpdate, confirmUpdate, rollbackUpdate]
  );

  // Delete with an undo window: the card disappears immediately, but the API
  // call is deferred a few seconds so "Undo" on the toast can restore it
  // without a network round-trip. Mistakes are recoverable, not fatal.
  const deleteTask = useCallback(
    async (taskId: string) => {
      const snapshot = optimisticDelete(taskId);
      if (!snapshot) return;
      confirmDelete(); // local-only so far — nothing is actually saving yet

      let undone = false;
      const timer = setTimeout(async () => {
        if (undone) return;
        try {
          await api.delete(`/projects/${projectId}/tasks/${taskId}`);
        } catch (err: any) {
          rollbackDelete(snapshot);
          showToast(err.message || "Failed to delete task", "error");
        }
      }, UNDO_WINDOW_MS);

      showToast("Task deleted", "info", {
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Undo",
          onAction: () => {
            undone = true;
            clearTimeout(timer);
            rollbackDelete(snapshot);
          },
        },
      });
    },
    [projectId, optimisticDelete, confirmDelete, rollbackDelete]
  );

  // Single batch endpoint — replaces N parallel PATCH calls for drag-and-drop reorder
  const reorderTasks = useCallback(
    async (updates: ReorderUpdate[]) => {
      if (updates.length === 0) return;
      // Apply optimistically — update each task locally without individual snapshots
      updates.forEach(({ id, status, order }) => {
        const mutationId = `reorder-${id}-${Date.now()}`;
        optimisticUpdate(id, { order, ...(status !== undefined && { status }) }, mutationId);
      });
      try {
        await api.patch(`/projects/${projectId}/tasks/reorder`, { updates });
      } catch (err: any) {
        // On failure, re-fetch to restore consistent state
        const res = await api.get<{ tasks: Task[]; total: number }>(
          `/projects/${projectId}/tasks`
        );
        if (res) setTasks(res.data.tasks, res.data.total);
        showToast(err.message || "Reorder failed — board has been refreshed", "error");
      }
    },
    [projectId, optimisticUpdate, setTasks]
  );

  return { tasks, total, isMutating, createTask, updateTask, deleteTask, reorderTasks };
};

// ─── Function Summary ──────────────────────────────────────────────────────────
// useTasks(projectId)
//   → custom hook that fetches, syncs, and mutates tasks for a project.
//     Returns: tasks[], total, isMutating, createTask, updateTask, deleteTask, reorderTasks
//
// createTask(data)             → optimistic add; POST /tasks; rollback on error
// updateTask(taskId, patch)    → optimistic update with mutationId; PATCH /tasks/:id
// deleteTask(taskId)           → optimistic delete + undo toast; deferred DELETE /tasks/:id
// reorderTasks(updates)        → batch PATCH /tasks/reorder; re-fetches on failure
//
// Socket listeners:
//   task:created  → syncCreated (de-dupes own echoes)
//   task:updated  → syncUpdated (handles _batchReorder payload; skips own mutationId)
//   task:deleted  → syncDeleted
// ──────────────────────────────────────────────────────────────────────────────
