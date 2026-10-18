import { expect, test } from "@playwright/test";

test("mobile interactive demo exercises passport sharing, booking, SOS and care-plan approval", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/demo");
  await page.getByRole("button", { name: "Open interactive demo" }).click();

  await page.locator('a[href="#passport"]').click();
  await page.getByRole("button", { name: "Create 10-minute clinic share" }).click();
  await expect(page.getByText("Temporary clinic access is active")).toBeVisible();
  await page.getByRole("button", { name: "Revoke access" }).click();
  await expect(page.getByText("Temporary clinic access is active")).toHaveCount(0);

  await page.locator('a[href="#booking"]').click();
  await page.getByRole("button", { name: "Book demo slot" }).first().click();
  await expect(page.getByText("Appointment requested:")).toBeVisible();
  await page.getByRole("button", { name: "Cancel booking" }).click();

  await page.locator('a[href="#sos"]').click();
  await page.getByRole("button", { name: "Breathing", exact: true }).click();
  await page.getByPlaceholder("Enter district/address manually").fill("District 1 (fictional)");
  await page.getByRole("button", { name: "Send SOS request" }).click();
  await expect(page.getByText("Searching nearby clinics…")).toBeVisible();
  await page.getByRole("button", { name: "Simulate clinic accept" }).click();
  await expect(page.getByText("Clinic accepted")).toBeVisible();

  await page.locator('a[href="#care-plans"]').click();
  await page.getByRole("button", { name: "Generate rules baseline" }).click();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vet approve demo plan" }).click();
  await expect(page.getByText("Vet-verified", { exact: true })).toBeVisible();
});
