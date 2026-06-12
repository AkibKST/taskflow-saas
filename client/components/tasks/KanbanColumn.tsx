"use client";
import { useState, FC, FormEvent, ChangeEvent } from "react";
import { TaskCard } from "./TaskCard";
import { Task } from "@/store/taskStore";

const WIP_LIMIT = 10;

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  onCreateTask: (data: Partial<Task>) => Promise<void>;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

export const KanbanColumn: FC<KanbanColumnProps> = ({
  status,
  tasks,
  onCreateTask,
  onUpdate,
  onDelete,
}) => {
  const [quickTitle, setQuickTitle] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);

  const handleAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
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

      <div className="flex flex-col gap-2 min-h-[120px] bg-gray-100 rounded-xl p-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}

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
