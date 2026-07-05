import { Page, expect } from "@playwright/test";

let seq = 0;

/** Unique credentials per call so specs never collide across runs. */
export const freshUser = () => {
  seq += 1;
  const stamp = `${Date.now()}-${seq}`;
  return {
    orgName: `E2E Org ${stamp}`,
    name: `E2E User ${stamp}`,
    email: `e2e-${stamp}@test.local`,
    password: "Password1",
  };
};

/** Register a new workspace through the UI and land on the dashboard. */
export const registerWorkspace = async (page: Page) => {
  const user = freshUser();
  await page.goto("/register");
  await page.getByLabel("Organization name").fill(user.orgName);
  await page.getByLabel("Full name").fill(user.name);
  await page.getByLabel("Work email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL("**/dashboard");
  return user;
};

/** Create a project through the UI and land on its board. */
export const createProject = async (page: Page, name: string) => {
  await page.goto("/projects/new");
  await page.getByPlaceholder("e.g. Website Redesign").fill(name);
  await page.getByRole("button", { name: /create/i }).click();
  await page.waitForURL("**/projects/*/tasks");
};

/** Quick-add a task into the given column (by its data-column status). */
export const addTask = async (page: Page, status: string, title: string) => {
  const column = page.locator(`[data-column="${status}"]`);
  await column.getByRole("button", { name: "+ Add task" }).click();
  await column.getByLabel("New task title").fill(title);
  await column.getByRole("button", { name: "Add", exact: true }).click();
  await expect(column.getByText(title)).toBeVisible();
};
