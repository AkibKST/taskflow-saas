import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    onMoveTask: vi.fn(),
    ...overrides,
  };
  render(<KanbanColumn {...props} />);
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

  it("dropping on the column appends the task to the end", () => {
    const props = renderColumn([task("a"), task("b")]);

    // The droppable surface is the container that holds the add-task button
    const dropZone = screen.getByText("+ Add task").parentElement!;
    fireEvent.drop(dropZone, {
      dataTransfer: { getData: (key: string) => (key === "text/taskId" ? "dragged" : "") },
    });

    expect(props.onMoveTask).toHaveBeenCalledWith("dragged", "IN_PROGRESS", 2);
  });

  it("dropping on a card inserts before that card", () => {
    const props = renderColumn([task("a"), task("b")]);

    const secondCardWrapper = screen.getAllByTestId("card")[1].parentElement!;
    fireEvent.drop(secondCardWrapper, {
      dataTransfer: { getData: (key: string) => (key === "text/taskId" ? "dragged" : "") },
    });

    expect(props.onMoveTask).toHaveBeenCalledWith("dragged", "IN_PROGRESS", 1);
  });

  it("ignores drops with no task id payload", () => {
    const props = renderColumn([]);
    const dropZone = screen.getByText("+ Add task").parentElement!;
    fireEvent.drop(dropZone, { dataTransfer: { getData: () => "" } });
    expect(props.onMoveTask).not.toHaveBeenCalled();
  });
});
