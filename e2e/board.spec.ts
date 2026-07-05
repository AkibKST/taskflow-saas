import { test, expect } from "@playwright/test";
import { registerWorkspace, createProject, addTask } from "./helpers";

test.describe("project + task lifecycle", () => {
  test("create project, add a task, move it via the accessible menu", async ({ page }) => {
    await registerWorkspace(page);
    await createProject(page, "Board Smoke");

    await addTask(page, "TODO", "Ship landing page");

    // Move to IN PROGRESS through the keyboard/touch-accessible move menu.
    // exact: true matters — the dnd-kit sortable wrapper is also role="button"
    // and its accessible name contains this label as a substring.
    await page
      .locator('[data-column="TODO"]')
      .getByRole("button", { name: "Move task to another column", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "IN PROGRESS" }).click();

    // The move lands in the destination column and is announced politely
    await expect(
      page.locator('[data-column="IN_PROGRESS"]').getByText("Ship landing page"),
    ).toBeVisible();
    await expect(
      page.getByText('"Ship landing page" moved to IN PROGRESS'),
    ).toBeAttached();

    // Persisted server-side, not just optimistic state
    await page.reload();
    await expect(
      page.locator('[data-column="IN_PROGRESS"]').getByText("Ship landing page"),
    ).toBeVisible();
  });
});
