"use client";
import { useState, FC } from "react";
import { PRIORITY, PRIORITY_ORDER, Priority } from "@taskflow/shared";
import { Task } from "@/store/taskStore";

const priorityColors: Record<string, string> = {
  [PRIORITY.LOW]: "bg-gray-100 text-gray-600",
  [PRIORITY.MEDIUM]: "bg-blue-100 text-blue-700",
  [PRIORITY.HIGH]: "bg-orange-100 text-orange-700",
  [PRIORITY.URGENT]: "bg-red-100 text-red-700",
};

interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

export const TaskCard: FC<TaskCardProps> = ({ task, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const cyclePriority = (): void => {
    const idx = PRIORITY_ORDER.indexOf(task.priority as Priority);
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    onUpdate(task.id, { priority: next });
  };

  const handleTitleBlur = (): void => {
    setEditing(false);
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() });
    } else {
      setTitle(task.title);
    }
  };

  const handleDoubleClick = (): void => {
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") handleTitleBlur();
  };

  const handleDeleteClick = (): void => {
    onDelete(task.id);
  };

  return (
    <div
      className={`relative bg-white rounded-lg border p-3 shadow-sm group ${task._isOptimistic ? "opacity-70" : ""}`}
    >
      {task._isOptimistic && (
        <div className="absolute inset-0 rounded-lg shimmer opacity-30 pointer-events-none" />
      )}

      {editing ? (
        <input
          autoFocus
          className="w-full text-sm font-medium border-b outline-none pb-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <p
          className="text-sm font-medium cursor-pointer hover:text-brand-600"
          onDoubleClick={handleDoubleClick}
        >
          {task.title}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <button
          onClick={cyclePriority}
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            priorityColors[task.priority] ?? priorityColors[PRIORITY.MEDIUM]
          }`}
        >
          {task.priority}
        </button>

        {task.dueDate && (
          <span className="text-xs text-gray-400">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}

        <button
          onClick={handleDeleteClick}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
        >
          &times;
        </button>
      </div>

      {task.assignees?.length! > 0 && (
        <div className="flex gap-1 mt-2">
          {task.assignees!.slice(0, 3).map((a) => (
            <span
              key={a.id}
              title={a.name}
              className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center"
            >
              {a.name?.[0]?.toUpperCase()}
            </span>
          ))}
          {task.assignees!.length > 3 && (
            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center">
              +{task.assignees!.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
