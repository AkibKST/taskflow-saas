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
  assignees?: TaskAssignee[];
  _isOptimistic?: boolean;
  _snapshot?: Task;
  [key: string]: any;
}

export interface TaskState {
  tasks: Task[];
  total: number;
  setTasks: (tasks: Task[], total: number) => void;
  optimisticAdd: (tempTask: Task) => void;
  confirmAdd: (tempId: string, realTask: Task) => void;
  rollbackAdd: (tempId: string) => void;
  optimisticUpdate: (taskId: string, patch: Partial<Task>) => Task | undefined;
  confirmUpdate: (taskId: string, realTask: Task) => void;
  rollbackUpdate: (taskId: string, snapshot: Task) => void;
  optimisticDelete: (taskId: string) => Task | undefined;
  rollbackDelete: (snapshot: Task) => void;
  syncCreated: (task: Task) => void;
  syncUpdated: (task: Task) => void;
  syncDeleted: (task: { id: string }) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  total: 0,

  setTasks: (tasks: Task[], total: number) => set({ tasks, total }),

  // Optimistic add
  optimisticAdd: (tempTask: Task) =>
    set((s) => ({ tasks: [...s.tasks, tempTask] })),

  // Confirm optimistic add with real data
  confirmAdd: (tempId: string, realTask: Task) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === tempId ? realTask : t)),
      total: s.total + 1,
    })),

  // Roll back failed optimistic add
  rollbackAdd: (tempId: string) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== tempId) })),

  // Optimistic update — stores a snapshot for rollback
  optimisticUpdate: (taskId: string, patch: Partial<Task>) => {
    const snapshot = get().tasks.find((t) => t.id === taskId);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, ...patch, _isOptimistic: true, _snapshot: snapshot } : t
      ),
    }));
    return snapshot;
  },

  confirmUpdate: (taskId: string, realTask: Task) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const { _isOptimistic, _snapshot, ...rest } = realTask;
        return rest;
      }),
    })),

  rollbackUpdate: (taskId: string, snapshot: Task) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? snapshot : t)),
    })),

  // Optimistic delete
  optimisticDelete: (taskId: string) => {
    const snapshot = get().tasks.find((t) => t.id === taskId);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== taskId),
      total: Math.max(0, s.total - 1),
    }));
    return snapshot;
  },

  rollbackDelete: (snapshot: Task) =>
    set((s) => ({
      tasks: [...s.tasks, snapshot],
      total: s.total + 1,
    })),

  // Real-time sync from socket
  syncCreated: (task: Task) =>
    set((s) => {
      if (s.tasks.find((t) => t.id === task.id)) return s;
      return { tasks: [...s.tasks, task], total: s.total + 1 };
    }),

  syncUpdated: (task: Task) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === task.id ? task : t)),
    })),

  syncDeleted: ({ id }: { id: string }) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      total: Math.max(0, s.total - 1),
    })),
}));
