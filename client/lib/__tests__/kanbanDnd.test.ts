import { describe, it, expect } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import { moveIntentFromDragEnd, columnDroppableId } from "../kanbanDnd";

/** Minimal DragEndEvent shape — only the fields the helper reads. */
const dragEnd = (
  activeId: string,
  over: { id: string; data?: { status?: string; index?: number } } | null,
): DragEndEvent =>
  ({
    active: { id: activeId },
    over: over ? { id: over.id, data: { current: over.data } } : null,
  }) as unknown as DragEndEvent;

const counts = { TODO: 3, IN_PROGRESS: 1, DONE: 0 };

describe("moveIntentFromDragEnd", () => {
  it("dropping on a column appends to the end of that column", () => {
    const event = dragEnd("t1", { id: columnDroppableId("IN_PROGRESS") });
    expect(moveIntentFromDragEnd(event, counts)).toEqual({
      taskId: "t1",
      destStatus: "IN_PROGRESS",
      destIndex: 1,
    });
  });

  it("dropping on an empty column lands at index 0", () => {
    const event = dragEnd("t1", { id: columnDroppableId("DONE") });
    expect(moveIntentFromDragEnd(event, counts)).toEqual({
      taskId: "t1",
      destStatus: "DONE",
      destIndex: 0,
    });
  });

  it("dropping on a card inserts before that card", () => {
    const event = dragEnd("t1", { id: "t9", data: { status: "TODO", index: 2 } });
    expect(moveIntentFromDragEnd(event, counts)).toEqual({
      taskId: "t1",
      destStatus: "TODO",
      destIndex: 2,
    });
  });

  it("returns null when dropped on itself", () => {
    const event = dragEnd("t1", { id: "t1", data: { status: "TODO", index: 0 } });
    expect(moveIntentFromDragEnd(event, counts)).toBeNull();
  });

  it("returns null when dropped outside any target", () => {
    expect(moveIntentFromDragEnd(dragEnd("t1", null), counts)).toBeNull();
  });

  it("returns null when the over target carries no sortable data", () => {
    const event = dragEnd("t1", { id: "t9" });
    expect(moveIntentFromDragEnd(event, counts)).toBeNull();
  });
});
