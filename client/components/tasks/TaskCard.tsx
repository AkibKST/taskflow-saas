"use client";
import { useEffect, useRef, useState, FC } from "react";
import Link from "next/link";
import { PRIORITY, PRIORITY_ORDER, Priority, TASK_STATUS } from "@taskflow/shared";
import { Task } from "@/store/taskStore";
import { cx, priorityBadge } from "@/lib/ui";
import { dueDateInfo } from "@/lib/dates";
import { AssigneePicker, PickerMember } from "./AssigneePicker";

interface TaskCardProps {
  task: Task;
  projectId: string;
  members: PickerMember[];
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onEditingChange?: (editing: boolean) => void;
}

/** Icon-button treatment for the card's action row — always visible (no
 * hover-only affordances: touch and keyboard users need them too). */
const actionBtn =
  "rounded-full p-1 text-gray-500 outline-none transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-brand-500";

export const TaskCard: FC<TaskCardProps> = ({ task, projectId, members, onUpdate, onDelete, onEditingChange }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [moveOpen, setMoveOpen] = useState(false);
  const moveRef = useRef<HTMLDivElement>(null);

  // Close the move menu on outside click.
  useEffect(() => {
    if (!moveOpen) return;
    const handler = (e: MouseEvent) => {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) setMoveOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moveOpen]);

  const setEditingState = (value: boolean): void => {
    setEditing(value);
    onEditingChange?.(value);
  };

  const cyclePriority = (): void => {
    const idx = PRIORITY_ORDER.indexOf(task.priority as Priority);
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    onUpdate(task.id, { priority: next });
  };

  const handleTitleBlur = (): void => {
    setEditingState(false);
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() });
    } else {
      setTitle(task.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") handleTitleBlur();
    if (e.key === "Escape") {
      setTitle(task.title);
      setEditingState(false);
    }
  };

  const handleMoveTo = (status: string): void => {
    setMoveOpen(false);
    if (status !== task.status) onUpdate(task.id, { status });
  };

  const due = task.dueDate
    ? dueDateInfo(task.dueDate, { done: task.status === TASK_STATUS.DONE })
    : null;

  return (
    <div
      className={cx(
        "group relative rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200/70",
        task._isOptimistic && "opacity-70",
      )}
    >
      {task._isOptimistic && (
        <div className="shimmer pointer-events-none absolute inset-0 rounded-xl opacity-30" />
      )}

      {/* Title row — pencil gives a single-click/keyboard edit path
          (double-click still works). */}
      {editing ? (
        <input
          autoFocus
          aria-label="Task title"
          className="w-full border-b border-brand-300 pb-1 text-sm font-medium outline-none focus:border-brand-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p
            className="min-w-0 flex-1 text-sm font-medium text-gray-900"
            onDoubleClick={() => setEditingState(true)}
          >
            {task.title}
          </p>
          <button
            onClick={() => setEditingState(true)}
            aria-label="Edit task title"
            className={cx(actionBtn, "-mr-1 -mt-0.5 shrink-0")}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          onClick={cyclePriority}
          title="Change priority"
          className={cx(
            "rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
            priorityBadge[task.priority] ?? priorityBadge[PRIORITY.MEDIUM],
          )}
        >
          {task.priority}
        </button>

        {due && (
          <span
            className={cx(
              "inline-flex items-center gap-1 text-xs",
              due.overdue ? "font-semibold text-rose-600" : "text-gray-500",
            )}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {due.overdue ? `Overdue · ${due.label}` : due.label}
          </span>
        )}

        <span className="ml-auto flex items-center">
          {/* Move menu — the pointer-free path for changing columns
              (HTML5 drag & drop never fires on touch or keyboard). */}
          <div className="relative" ref={moveRef}>
            <button
              onClick={() => setMoveOpen((v) => !v)}
              aria-label="Move task to another column"
              aria-haspopup="menu"
              aria-expanded={moveOpen}
              className={actionBtn}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
              </svg>
            </button>
            {moveOpen && (
              <div
                role="menu"
                aria-label="Move to column"
                className="absolute right-0 z-30 mt-1 w-44 rounded-2xl border border-gray-100 bg-white p-1 shadow-lg"
              >
                <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Move to
                </p>
                {Object.values(TASK_STATUS).map((s) => (
                  <button
                    key={s}
                    role="menuitem"
                    disabled={s === task.status}
                    onClick={() => handleMoveTo(s)}
                    className={cx(
                      "block w-full rounded-lg px-3 py-1.5 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500",
                      s === task.status
                        ? "cursor-default font-semibold text-brand-700"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/projects/${projectId}/tasks/${task.id}`}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            aria-label="Open task details"
            className={actionBtn}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </Link>

          <button
            onClick={() => onDelete(task.id)}
            aria-label="Delete task (undo available)"
            className={cx(actionBtn, "hover:bg-rose-50 hover:text-rose-600")}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </span>
      </div>

      <div className="mt-2">
        <AssigneePicker
          compact
          members={members}
          selected={(task.assignees ?? []).map((a) => a.id)}
          onChange={(ids) => onUpdate(task.id, { assigneeIds: ids } as Partial<Task>)}
        />
      </div>
    </div>
  );
};
