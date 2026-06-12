"use client";
import { useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { useTaskStore, Task } from "@/store/taskStore";
import { showToast } from "@/store/toastStore";

interface UseTasksReturn {
  tasks: Task[];
  total: number;
  createTask: (data: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export const useTasks = (projectId: string): UseTasksReturn => {
  const {
    tasks,
    total,
    setTasks,
    optimisticAdd,
    confirmAdd,
    rollbackAdd,
    optimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    optimisticDelete,
    rollbackDelete,
    syncCreated,
    syncUpdated,
    syncDeleted,
  } = useTaskStore();

  // Initial fetch
  useEffect(() => {
    if (!projectId) return;
    api.get<{ tasks: Task[]; total: number }>(`/projects/${projectId}/tasks`).then((res) => {
      if (res) setTasks(res.data.tasks, res.data.total);
    });
  }, [projectId, setTasks]);

  // Real-time sync
  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    socket.on(SOCKET_EVENTS.TASK_CREATED, syncCreated);
    socket.on(SOCKET_EVENTS.TASK_UPDATED, syncUpdated);
    socket.on(SOCKET_EVENTS.TASK_DELETED, syncDeleted);
    return () => {
      socket.off(SOCKET_EVENTS.TASK_CREATED, syncCreated);
      socket.off(SOCKET_EVENTS.TASK_UPDATED, syncUpdated);
      socket.off(SOCKET_EVENTS.TASK_DELETED, syncDeleted);
    };
  }, [projectId, syncCreated, syncUpdated, syncDeleted]);

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
      const snapshot = optimisticUpdate(taskId, patch);
      try {
        const res = await api.patch<Task>(`/projects/${projectId}/tasks/${taskId}`, patch);
        if (res) confirmUpdate(taskId, res.data);
      } catch (err: any) {
        if (snapshot) rollbackUpdate(taskId, snapshot);
        showToast(err.message || "Failed to update task", "error");
      }
    },
    [projectId, optimisticUpdate, confirmUpdate, rollbackUpdate]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const snapshot = optimisticDelete(taskId);
      try {
        await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      } catch (err: any) {
        if (snapshot) rollbackDelete(snapshot);
        showToast(err.message || "Failed to delete task", "error");
      }
    },
    [projectId, optimisticDelete, rollbackDelete]
  );

  return { tasks, total, createTask, updateTask, deleteTask };
};
