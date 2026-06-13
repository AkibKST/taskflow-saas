"use client";
import { useEffect, useState, SyntheticEvent, ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BOARD_COLUMNS, TASK_STATUS, PRIORITY } from "@taskflow/shared";
import { api } from "@/lib/api";
import { useProjectStore, Project } from "@/store/projectStore";
import { useSocket } from "@/hooks/useSocket";
import { useTasks } from "@/hooks/useTasks";
import { Task } from "@/store/taskStore";
import { KanbanColumn } from "@/components/tasks/KanbanColumn";

interface CreateForm {
  title: string;
  status: string;
  priority: string;
}

interface TasksByStatus {
  [key: string]: Task[];
}

export default function TasksPage() {
  const { projectId } = useParams();
  const { currentProject, setCurrentProject, onlineUserIds } = useProjectStore();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    title: "",
    status: TASK_STATUS.TODO,
    priority: PRIORITY.MEDIUM,
  });

  useSocket(projectId as string);
  const { tasks, total, createTask, updateTask, deleteTask } = useTasks(projectId as string);

  useEffect(() => {
    api.get<Project>(`/projects/${projectId}`).then((res) => {
      if (res) setCurrentProject(res.data);
    });
  }, [projectId, setCurrentProject]);

  const tasksByStatus: TasksByStatus = [...BOARD_COLUMNS].reduce((acc, col) => {
    acc[col] = tasks.filter((t) => t.status === col);
    return acc;
  }, {} as TasksByStatus);

  const handleCreateModal = async (e: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await createTask(createForm);
    setShowCreateModal(false);
    setCreateForm({ title: "", status: TASK_STATUS.TODO, priority: PRIORITY.MEDIUM });
  };

  const handleViewToggle = (): void => {
    setView(view === "kanban" ? "list" : "kanban");
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.target;
    setCreateForm({ ...createForm, title: value });
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>, field: string): void => {
    const { value } = e.target;
    setCreateForm({ ...createForm, [field]: value });
  };

  const handleDeleteTask = (taskId: string): void => {
    deleteTask(taskId);
  };

  const stats = {
    total,
    done: tasks.filter((t) => t.status === TASK_STATUS.DONE).length,
    inProgress: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length,
    blocked: tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link href="/projects" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Projects
        </Link>
        <h1 className="font-semibold text-gray-900">{currentProject?.name ?? "…"}</h1>
        <div className="ml-auto flex items-center gap-3">
          {onlineUserIds.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {onlineUserIds.length} online
            </div>
          )}
          <button
            onClick={handleViewToggle}
            className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            {view === "kanban" ? "List" : "Board"} view
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
          >
            + New task
          </button>
          <Link
            href={`/projects/${projectId}/settings`}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Project settings"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Stats bar */}
      <div className="bg-white border-b px-6 py-2 flex gap-6 text-xs text-gray-500">
        <span>
          <strong className="text-gray-900">{stats.total}</strong> total
        </span>
        <span>
          <strong className="text-green-600">{stats.done}</strong> done
        </span>
        <span>
          <strong className="text-brand-600">{stats.inProgress}</strong> in progress
        </span>
        {stats.blocked > 0 && (
          <span>
            <strong className="text-red-500">{stats.blocked}</strong> blocked
          </span>
        )}
      </div>

      {/* Board / List */}
      <main className="p-6">
        {view === "kanban" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...BOARD_COLUMNS].map((col) => (
              <KanbanColumn
                key={col}
                status={col}
                tasks={tasksByStatus[col] ?? []}
                onCreateTask={createTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {tasks.length === 0 && (
              <p className="text-center text-gray-400 py-12">No tasks yet</p>
            )}
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-4 ${
                  task._isOptimistic ? "opacity-60" : ""
                }`}
              >
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">
                  {task.status.replace("_", " ")}
                </span>
                <span className="flex-1 text-sm font-medium">{task.title}</span>
                <span className="text-xs text-gray-400">{task.priority}</span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-300 hover:text-red-500 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New task</h2>
            <form onSubmit={handleCreateModal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  autoFocus
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  value={createForm.title}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    value={createForm.status}
                    onChange={(e) => handleSelectChange(e, "status")}
                  >
                    {Object.values(TASK_STATUS).map((s) => (
                      <option key={s} value={s}>
                        {String(s).replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    value={createForm.priority}
                    onChange={(e) => handleSelectChange(e, "priority")}
                  >
                    {Object.values(PRIORITY).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
