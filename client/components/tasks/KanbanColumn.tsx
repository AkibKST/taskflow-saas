"use client";
import { useState, FC, ReactNode, SyntheticEvent, ChangeEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";
import { PickerMember } from "./AssigneePicker";
import { Task } from "@/store/taskStore";
import { Button } from "@/components/ui";
import { cx } from "@/lib/ui";
import { columnDroppableId } from "@/lib/kanbanDnd";

/** Soft work-in-progress guideline per column — advisory, never blocking. */
const WIP_LIMIT = 10;

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  projectId: string;
  members: PickerMember[];
  onCreateTask: (data: Partial<Task>) => Promise<void>;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

/** Sortable wrapper — dnd-kit's pointer/touch/keyboard sensors replace HTML5
 * drag & drop, which never fires on touch devices. Dragging is disabled while
 * the card's title is being edited so text selection works. */
const SortableCard: FC<{
  taskId: string;
  status: string;
  index: number;
  disabled: boolean;
  children: ReactNode;
}> = ({ taskId, status, index, disabled, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskId,
    data: { status, index },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cx(
        !disabled && "cursor-grab touch-manipulation active:cursor-grabbing",
        isDragging && "relative z-10 opacity-80",
      )}
    >
      {children}
    </div>
  );
};

export const KanbanColumn: FC<KanbanColumnProps> = ({
  status,
  tasks,
  projectId,
  members,
  onCreateTask,
  onUpdate,
  onDelete,
}) => {
  const [quickTitle, setQuickTitle] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Whole-column drop target: dropping on the column (not a card) appends.
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });

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
        ref={setNodeRef}
        data-column={status}
        className={cx(
          "flex min-h-[120px] flex-col gap-2 rounded-2xl p-2 transition-colors",
          isOver ? "bg-brand-100 ring-2 ring-brand-300" : "bg-gray-100",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, index) => (
            <SortableCard
              key={task.id}
              taskId={task.id}
              status={status}
              index={index}
              disabled={editingId === task.id}
            >
              <TaskCard
                task={task}
                projectId={projectId}
                members={members}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onEditingChange={(editing) => setEditingId(editing ? task.id : null)}
              />
            </SortableCard>
          ))}
        </SortableContext>

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
