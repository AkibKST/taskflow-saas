import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { KanbanColumn } from "../KanbanColumn";
import { Task } from "@/store/taskStore";

// The column's own logic is under test; the card is exercised separately.
vi.mock("../TaskCard", () => ({
  TaskCard: ({ task }: { task: Task }) => <div data-testid="card">{task.title}</div>,
}));

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  status: "IN_PROGRESS",
  priority: "MEDIUM",
  ...extra,
});

const noop = async () => {};

const renderColumn = (tasks: Task[], overrides: Record<string, any> = {}) => {
  const props = {
    status: "IN_PROGRESS",
    tasks,
    projectId: "p1",
    members: [],
    onCreateTask: vi.fn(noop),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  // The column's droppable/sortable hooks need a DndContext provider.
  render(
    <DndContext>
      <KanbanColumn {...props} />
    </DndContext>,
  );
  return props;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("KanbanColumn", () => {
  it("renders the humanized status, count and cards", () => {
    renderColumn([task("a"), task("b")]);

    expect(screen.getByText("IN PROGRESS")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByTestId("card").map((c) => c.textContent)).toEqual([
      "Task a",
      "Task b",
    ]);
  });

  it("flags the column when the WIP guideline is reached", () => {
    renderColumn(Array.from({ length: 10 }, (_, i) => task(`t${i}`)));
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
  });

  it("quick-add creates a task with the trimmed title and column status", async () => {
    const user = userEvent.setup();
    const props = renderColumn([]);

    await user.click(screen.getByText("+ Add task"));
    await user.type(screen.getByLabelText("New task title"), "  Ship it  ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(props.onCreateTask).toHaveBeenCalledWith({
      title: "Ship it",
      status: "IN_PROGRESS",
    });
    // Form closes after a successful add
    expect(screen.queryByLabelText("New task title")).not.toBeInTheDocument();
  });

  it("does not create a task from a blank title", async () => {
    const user = userEvent.setup();
    const props = renderColumn([]);

    await user.click(screen.getByText("+ Add task"));
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(props.onCreateTask).not.toHaveBeenCalled();
  });

  it("renders cards as dnd-kit sortables (touch-capable, not HTML5 DnD)", () => {
    renderColumn([task("a"), task("b")]);

    // dnd-kit marks each sortable wrapper with aria-roledescription="sortable"
    const sortables = document.querySelectorAll('[aria-roledescription="sortable"]');
    expect(sortables.length).toBe(2);
    // The legacy HTML5 attribute is gone
    expect(document.querySelector("[draggable]")).toBeNull();
  });
});
