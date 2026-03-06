import { expect, test } from "@playwright/test";

test("dashboard smoke flow", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

  await page.getByLabel("Email").fill(
    process.env.DEFAULT_ADMIN_EMAIL ?? "admin@example.com",
  );
  await page.getByLabel("Password").fill(
    process.env.DEFAULT_ADMIN_PASSWORD ?? "ChangeMe123!",
  );
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/factoring-dashboard$/);
  await expect(page.getByRole("heading", { name: "PandaDoc Factoring Dashboard" })).toBeVisible();
  await expect(page.getByText("PandaDoc Demo Workspace", { exact: true })).toBeVisible();
  await expect(page.getByText("Demo Manufacturing LLC", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Acme Holdings")).toBeVisible();
  await expect(page.getByRole("link", { name: "Withdraw Capital" }).first()).toBeVisible();

  const invoiceRow = page.getByRole("row").filter({ hasText: "Acme Holdings" });
  await invoiceRow.getByRole("link", { name: "Withdraw Capital" }).click();

  await expect(page).toHaveURL(/\/factoring-dashboard\/invoices\/.+\/withdraw$/);
  await expect(page.getByRole("heading", { name: /Invoice 9001/ })).toBeVisible();
  await page.getByLabel("Wallet address").fill("0x1234567890abcdefabcd");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm withdrawal" }).click();

  await expect(page).toHaveURL(/\/factoring-dashboard\/transactions\/.+$/);
  await expect(page.getByRole("heading", { name: /FACT-/ })).toBeVisible();
  await expect(page.getByText("Audit trail")).toBeVisible();
});
