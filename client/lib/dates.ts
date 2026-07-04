/** Due-date presentation shared by the board card, list view and my-tasks. */

export interface DueDateInfo {
  /** Short human label — "Today", "Tomorrow", "Yesterday" or "Mar 12". */
  label: string;
  /** Past due and the task isn't done — render with the urgency treatment. */
  overdue: boolean;
  /** Due today or tomorrow (and not overdue). */
  dueSoon: boolean;
}

export function dueDateInfo(
  dueDate: string | Date,
  opts: { done?: boolean } = {},
): DueDateInfo {
  const due = new Date(dueDate);
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(due) - startOf(new Date())) / 86_400_000);

  let label: string;
  if (diffDays === 0) label = "Today";
  else if (diffDays === 1) label = "Tomorrow";
  else if (diffDays === -1) label = "Yesterday";
  else
    label = due.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(due.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
    });

  const overdue = diffDays < 0 && !opts.done;
  return { label, overdue, dueSoon: !overdue && diffDays >= 0 && diffDays <= 1 };
}
