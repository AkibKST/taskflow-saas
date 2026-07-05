import { test, expect } from "@playwright/test";
import { registerWorkspace } from "./helpers";

test.describe("auth lifecycle", () => {
  test("register → dashboard → log out → log back in", async ({ page }) => {
    const user = await registerWorkspace(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Log out via the user menu
    await page.locator('button[aria-haspopup="menu"]').first().click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.waitForURL("**/login");

    // Log back in with the same credentials
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard");
  });

  test("wrong password is rejected", async ({ page }) => {
    const user = await registerWorkspace(page);

    await page.locator('button[aria-haspopup="menu"]').first().click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.waitForURL("**/login");

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("WrongPass1");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Stays on the login page and surfaces an error
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/email or password you entered is incorrect/i),
    ).toBeVisible();
  });
});
