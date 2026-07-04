"use client";
import { useState, FC, SyntheticEvent, ChangeEvent } from "react";
import { TaskCard } from "./TaskCard";
import { PickerMember } from "./AssigneePicker";
import { Task } from "@/store/taskStore";
import { Button } from "@/components/ui";
import { cx } from "@/lib/ui";

/** Soft work-in-progress guideline per column — advisory, never blocking. */
const WIP_LIMIT = 10;

const DRAG_KEY = "text/taskId";

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  projectId: string;
  members: PickerMember[];
  onCreateTask: (data: Partial<Task>) => Promise<void>;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onMoveTask: (taskId: string, destStatus: string, destIndex: number) => void;
}

export const KanbanColumn: FC<KanbanColumnProps> = ({
  status,
  tasks,
  projectId,
  members,
  onCreateTask,
  onUpdate,
  onDelete,
  onMoveTask,
}) => {
  const [quickTitle, setQuickTitle] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const clearDrag = (): void => {
    setDragOver(false);
    setDropIndex(null);
  };

  const handleCardDragStart = (e: React.DragEvent, taskId: string): void => {
    e.dataTransfer.setData(DRAG_KEY, taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Drop on a specific card → insert before it.
  const handleCardDrop = (e: React.DragEvent, index: number): void => {
    e.preventDefault();
    e.stopPropagation();
    clearDrag();
    const taskId = e.dataTransfer.getData(DRAG_KEY);
    if (taskId) onMoveTask(taskId, status, index);
  };

  // Drop on the column (not a card) → append to the end.
  const handleColumnDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    clearDrag();
    const taskId = e.dataTransfer.getData(DRAG_KEY);
    if (taskId) onMoveTask(taskId, status, tasks.length);
  };

  const allowDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Thin insertion line showing where the card will land.
  const placeholder = <div className="h-0.5 rounded-full bg-brand-500" />;

  const handleAdd = async (e: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await onCreateTask({ title: quickTitle.trim(), status });
    setQuickTitle("");
    setAdding(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setQuickTitle(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Escape") setAdding(false);
  };

  const atLimit = tasks.length >= WIP_LIMIT;

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          {status.replace("_", " ")}
        </h3>
        <span
          title={
            atLimit
              ? `This column has reached its work-in-progress guideline of ${WIP_LIMIT} tasks — consider finishing some before adding more.`
              : undefined
          }
          className={cx(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            atLimit ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600",
          )}
        >
          {tasks.length}
          {atLimit ? ` / ${WIP_LIMIT}` : ""}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          allowDrop(e);
          setDragOver(true);
          setDropIndex(tasks.length);
        }}
        onDragLeave={(e) => {
          // Only clear when the pointer actually leaves the column.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) clearDrag();
        }}
        onDrop={handleColumnDrop}
        className={cx(
          "flex min-h-[120px] flex-col gap-2 rounded-2xl p-2 transition-colors",
          dragOver ? "bg-brand-100 ring-2 ring-brand-300" : "bg-gray-100",
        )}
      >
        {tasks.map((task, index) => (
          <div key={task.id} className="flex flex-col gap-2">
            {dropIndex === index && placeholder}
            <div
              draggable={editingId !== task.id}
              onDragStart={(e) => handleCardDragStart(e, task.id)}
              onDragOver={(e) => {
                allowDrop(e);
                e.stopPropagation();
                setDropIndex(index);
              }}
              onDrop={(e) => handleCardDrop(e, index)}
              className={editingId === task.id ? "" : "cursor-grab active:cursor-grabbing"}
            >
              <TaskCard
                task={task}
                projectId={projectId}
                members={members}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onEditingChange={(editing) => setEditingId(editing ? task.id : null)}
              />
            </div>
          </div>
        ))}
        {dropIndex === tasks.length && placeholder}

        {adding ? (
          <form onSubmit={handleAdd} className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-200/70">
            <input
              autoFocus
              aria-label="New task title"
              className="mb-2 w-full border-b border-gray-300 pb-1 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500"
              placeholder="Task title..."
              value={quickTitle}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-xl p-2 text-left text-xs font-medium text-gray-500 outline-none transition-colors hover:bg-white/60 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
};
