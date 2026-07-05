import { test, expect } from "@playwright/test";
import { registerWorkspace, createProject, addTask } from "./helpers";

test.describe("kanban drag & drop", () => {
  test("pointer-drags a card from TODO to IN PROGRESS", async ({ page }) => {
    await registerWorkspace(page);
    await createProject(page, "Drag Smoke");
    await addTask(page, "TODO", "Drag me");

    // Grab the card by its title text: dnd-kit sensors intentionally ignore
    // pointer-downs on interactive elements (buttons/inputs inside the card),
    // and the card's geometric center lands on its action buttons.
    const grabPoint = page.getByText("Drag me", { exact: true });
    const dest = page.locator('[data-column="IN_PROGRESS"]');

    const from = await grabPoint.boundingBox();
    const to = await dest.boundingBox();
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();

    // dnd-kit MouseSensor activates after 5px of movement, and its activation +
    // collision detection run on animation frames — generous pauses between
    // gesture phases keep the sensor in step (shorter ones drop the gesture).
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(from!.x + from!.width / 2 + 20, from!.y + from!.height / 2 + 20, {
      steps: 6,
    });
    await page.waitForTimeout(400);
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 12 });
    await page.waitForTimeout(400);
    await page.mouse.up();

    await expect(dest.getByText("Drag me")).toBeVisible();

    // Survives a reload — the batch reorder reached the server
    await page.reload();
    await expect(
      page.locator('[data-column="IN_PROGRESS"]').getByText("Drag me"),
    ).toBeVisible();
  });
});
