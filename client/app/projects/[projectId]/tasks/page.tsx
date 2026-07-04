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
import { AssigneePicker, PickerMember } from "@/components/tasks/AssigneePicker";
import AppHeader from "@/components/layout/AppHeader";
import { Badge, Button, Field, Modal, Select } from "@/components/ui";
import { control, cx, focusRing, priorityBadge } from "@/lib/ui";
import { dueDateInfo } from "@/lib/dates";

interface CreateForm {
  title: string;
  status: string;
  priority: string;
  assigneeIds: string[];
}

interface ProjectWithMembers {
  id: string;
  members?: { userId: string; user: { id: string; name: string; email: string } }[];
}

interface TasksByStatus {
  [key: string]: Task[];
}

export default function TasksPage() {
  const { projectId } = useParams();
  const { currentProject, setCurrentProject, onlineUserIds } = useProjectStore();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [members, setMembers] = useState<PickerMember[]>([]);
  // Screen-reader announcement of board moves (aria-live region below).
  const [announcement, setAnnouncement] = useState<string>("");
  const [createForm, setCreateForm] = useState<CreateForm>({
    title: "",
    status: TASK_STATUS.TODO,
    priority: PRIORITY.MEDIUM,
    assigneeIds: [],
  });

  useSocket(projectId as string);
  const { tasks, total, isMutating, createTask, updateTask, deleteTask, reorderTasks } = useTasks(projectId as string);

  useEffect(() => {
    api.get<Project>(`/projects/${projectId}`).then((res) => {
      if (res) setCurrentProject(res.data);
    });
    // Project members populate the assignee picker. getProject omits members,
    // so source them from the list endpoint (which includes them).
    api.get<ProjectWithMembers[]>("/projects").then((res) => {
      const found = res.data.find((p) => p.id === projectId);
      setMembers(
        (found?.members ?? []).map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
        })),
      );
    });
  }, [projectId, setCurrentProject]);

  const tasksByStatus: TasksByStatus = [...BOARD_COLUMNS].reduce((acc, col) => {
    acc[col] = tasks
      .filter((t) => t.status === col)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return acc;
  }, {} as TasksByStatus);

  const announceMove = (title: string, destStatus: string): void => {
    setAnnouncement(`"${title}" moved to ${destStatus.replace("_", " ")}`);
  };

  const handleCreateModal = async (e: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await createTask(createForm);
    setShowCreateModal(false);
    setCreateForm({ title: "", status: TASK_STATUS.TODO, priority: PRIORITY.MEDIUM, assigneeIds: [] });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.target;
    setCreateForm({ ...createForm, title: value });
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>, field: string): void => {
    const { value } = e.target;
    setCreateForm({ ...createForm, [field]: value });
  };

  // Status changes (from the card's move menu or the list view's select) get
  // announced for screen readers; everything else passes straight through.
  const handleUpdateTask = (taskId: string, patch: Partial<Task>): void => {
    if (patch.status) {
      const t = tasks.find((x) => x.id === taskId);
      if (t) announceMove(t.title, patch.status);
    }
    updateTask(taskId, patch);
  };

  // Drag & drop: move a task into `destStatus` at position `destIndex`,
  // renumber that column, then submit all changes as a single batch request.
  const handleMoveTask = (taskId: string, destStatus: string, destIndex: number): void => {
    const moved = tasks.find((t) => t.id === taskId);
    if (!moved) return;

    const full = tasks
      .filter((t) => t.status === destStatus)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const without = full.filter((t) => t.id !== taskId);

    let insertAt: number;
    if (destIndex >= full.length) {
      insertAt = without.length;
    } else {
      const targetId = full[destIndex].id;
      if (targetId === taskId) return;
      const i = without.findIndex((t) => t.id === targetId);
      insertAt = i < 0 ? without.length : i;
    }

    const next = [...without];
    next.splice(insertAt, 0, moved);

    // Collect only the tasks that actually changed (avoid unnecessary writes)
    const changed: { id: string; status?: string; order: number }[] = [];
    next.forEach((t, idx) => {
      const statusChanged = t.id === taskId && moved.status !== destStatus;
      const orderChanged = (t.order ?? 0) !== idx;
      if (statusChanged || orderChanged) {
        changed.push({
          id: t.id,
          order: idx,
          ...(statusChanged && { status: destStatus }),
        });
      }
    });

    if (changed.length > 0) {
      announceMove(moved.title, destStatus);
      reorderTasks(changed);
    }
  };

  const stats = {
    total,
    done: tasks.filter((t) => t.status === TASK_STATUS.DONE).length,
    inProgress: tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length,
    blocked: tasks.filter((t) => t.status === TASK_STATUS.BLOCKED).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      {/* Announce card moves to assistive tech (drag & drop is silent). */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Project toolbar */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
        <Link
          href={`/projects/${projectId}`}
          className={cx("rounded-full text-sm text-gray-500 transition-colors hover:text-gray-700", focusRing)}
        >
          ← Overview
        </Link>
        <h1 className="font-semibold text-gray-900">{currentProject?.name ?? "…"}</h1>
        <div className="ml-auto flex items-center gap-3">
          {isMutating && (
            <span className="animate-pulse text-xs text-gray-500">Saving…</span>
          )}
          {onlineUserIds.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {onlineUserIds.length} online
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setView(view === "kanban" ? "list" : "kanban")}
          >
            {view === "kanban" ? "List" : "Board"} view
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            + New task
          </Button>
          <Link
            href={`/projects/${projectId}/settings`}
            className={cx("rounded-full p-1 text-gray-500 transition-colors hover:text-gray-700", focusRing)}
            aria-label="Project settings"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-6 border-b border-gray-200 bg-white px-6 py-2 text-xs text-gray-600">
        <span>
          <strong className="text-gray-900">{stats.total}</strong> total
        </span>
        <span>
          <strong className="text-green-700">{stats.done}</strong> done
        </span>
        <span>
          <strong className="text-brand-600">{stats.inProgress}</strong> in progress
        </span>
        {stats.blocked > 0 && (
          <span>
            <strong className="text-rose-600">{stats.blocked}</strong> blocked
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
                projectId={projectId as string}
                members={members}
                onMoveTask={handleMoveTask}
                onCreateTask={createTask}
                onUpdate={handleUpdateTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-2">
            {tasks.length === 0 && (
              <p className="py-12 text-center text-gray-500">No tasks yet</p>
            )}
            {tasks.map((task) => {
              const due = task.dueDate
                ? dueDateInfo(task.dueDate, { done: task.status === TASK_STATUS.DONE })
                : null;
              return (
                <div
                  key={task.id}
                  className={cx(
                    "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/70",
                    task._isOptimistic && "opacity-60",
                  )}
                >
                  <select
                    aria-label={`Status of "${task.title}"`}
                    value={task.status}
                    onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                    className={cx(
                      control,
                      "w-36 shrink-0 cursor-pointer !px-2 !py-1 text-xs font-medium",
                    )}
                  >
                    {Object.values(TASK_STATUS).map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>

                  <Link
                    href={`/projects/${projectId}/tasks/${task.id}`}
                    className={cx(
                      "min-w-0 flex-1 rounded-full text-sm font-medium text-gray-900 hover:text-brand-600",
                      focusRing,
                    )}
                  >
                    <span className="block truncate">{task.title}</span>
                  </Link>

                  {due && (
                    <span
                      className={cx(
                        "text-xs",
                        due.overdue ? "font-semibold text-rose-600" : "text-gray-500",
                      )}
                    >
                      {due.overdue ? `Overdue · ${due.label}` : due.label}
                    </span>
                  )}

                  <Badge className={priorityBadge[task.priority] ?? priorityBadge.MEDIUM}>
                    {task.priority}
                  </Badge>

                  <AssigneePicker
                    compact
                    members={members}
                    selected={(task.assignees ?? []).map((a) => a.id)}
                    onChange={(ids) => updateTask(task.id, { assigneeIds: ids } as Partial<Task>)}
                  />

                  <button
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete "${task.title}" (undo available)`}
                    className={cx(
                      "rounded-full p-1 text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600",
                      focusRing,
                    )}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New task"
      >
        <form onSubmit={handleCreateModal} className="space-y-4">
          <Field
            label="Title"
            autoFocus
            required
            value={createForm.title}
            onChange={handleInputChange}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={createForm.status}
              onChange={(e) => handleSelectChange(e, "status")}
            >
              {Object.values(TASK_STATUS).map((s) => (
                <option key={s} value={s}>
                  {String(s).replace("_", " ")}
                </option>
              ))}
            </Select>
            <Select
              label="Priority"
              value={createForm.priority}
              onChange={(e) => handleSelectChange(e, "priority")}
            >
              {Object.values(PRIORITY).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Assignees</p>
            <AssigneePicker
              members={members}
              selected={createForm.assigneeIds}
              onChange={(ids) => setCreateForm({ ...createForm, assigneeIds: ids })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
