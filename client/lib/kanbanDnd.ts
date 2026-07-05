import type { DragEndEvent } from "@dnd-kit/core";

/** Droppable id for a whole column (dropping here appends to the end). */
export const COLUMN_PREFIX = "column:";
export const columnDroppableId = (status: string): string => `${COLUMN_PREFIX}${status}`;

export interface MoveIntent {
  taskId: string;
  destStatus: string;
  destIndex: number;
}

/**
 * Translate a dnd-kit drag-end event into the board's move contract
 * (taskId, destStatus, destIndex — insert before the card at destIndex).
 * Returns null for no-op drops (nothing under the pointer, dropped on itself).
 */
export function moveIntentFromDragEnd(
  event: DragEndEvent,
  columnCounts: Record<string, number>,
): MoveIntent | null {
  const { active, over } = event;
  if (!over) return null;

  const taskId = String(active.id);
  const overId = String(over.id);

  if (overId.startsWith(COLUMN_PREFIX)) {
    const destStatus = overId.slice(COLUMN_PREFIX.length);
    return { taskId, destStatus, destIndex: columnCounts[destStatus] ?? 0 };
  }

  if (overId === taskId) return null;

  const overData = over.data.current as { status?: string; index?: number } | undefined;
  if (!overData?.status || overData.index === undefined) return null;

  return { taskId, destStatus: overData.status, destIndex: overData.index };
}
