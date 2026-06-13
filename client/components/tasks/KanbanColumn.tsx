"use client";
import { useState, FC, SyntheticEvent, ChangeEvent } from "react";
import { TaskCard } from "./TaskCard";
import { PickerMember } from "./AssigneePicker";
import { Task } from "@/store/taskStore";

const WIP_LIMIT = 10;

const DRAG_KEY = "text/taskId";

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  members: PickerMember[];
  onCreateTask: (data: Partial<Task>) => Promise<void>;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onMoveTask: (taskId: string, destStatus: string, destIndex: number) => void;
}

export const KanbanColumn: FC<KanbanColumnProps> = ({
  status,
  tasks,
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
  const placeholder = (
    <div className="h-0.5 rounded-full bg-brand-500" />
  );

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

  const handleAddClick = (): void => {
    setAdding(true);
  };

  const handleCancelClick = (): void => {
    setAdding(false);
  };

  const atLimit = tasks.length >= WIP_LIMIT;

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {status.replace("_", " ")}
        </h3>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            atLimit ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {tasks.length}{atLimit ? ` / ${WIP_LIMIT}` : ""}
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
        className={`flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors ${
          dragOver ? "bg-brand-100 ring-2 ring-brand-300" : "bg-gray-100"
        }`}
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
          <form onSubmit={handleAdd} className="bg-white rounded-lg p-2 shadow-sm">
            <input
              autoFocus
              className="w-full text-sm outline-none border-b pb-1 mb-2"
              placeholder="Task title..."
              value={quickTitle}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="text-xs bg-brand-600 text-white px-3 py-1 rounded-md hover:bg-brand-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={handleCancelClick}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={handleAddClick}
            className="text-xs text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg p-2 text-left transition-colors"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
};
