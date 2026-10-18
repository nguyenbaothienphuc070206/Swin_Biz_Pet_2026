import { expect, test, type Page } from "@playwright/test";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in the isolated E2E environment; see docs/testing.md.`);
  return value;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/vi/sign-in");
  const form = page.locator("form").nth(1);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.locator('button[type="submit"]').click();
}

test("email sign-in and sign-out work for a configured test owner", async ({ page }) => {
  await signIn(page, required("E2E_OWNER_EMAIL"), required("E2E_OWNER_PASSWORD"));
  await expect(page).toHaveURL(/\/vi\/owner/);
  await page.goto("/vi/settings");
  await page.locator("form").last().locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/vi\/?$/);
});

test("sign-up exposes email and Google auth paths", async ({ page }) => {
  await page.goto("/vi/sign-up");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

const roleFixtures = [
  { key: "OWNER", home: "owner", denied: ["clinic", "admin"] },
  { key: "CLINIC_STAFF", home: "clinic", denied: ["owner", "admin"] },
  { key: "CLINIC_ADMIN", home: "clinic", denied: ["owner", "admin"] },
  { key: "PLATFORM_ADMIN", home: "admin", denied: ["owner", "clinic"] },
] as const;

for (const fixture of roleFixtures) {
  test(`${fixture.key} cannot enter another role context`, async ({ page }) => {
    const email = required(`E2E_${fixture.key}_EMAIL`);
    const password = required(`E2E_${fixture.key}_PASSWORD`);
    await signIn(page, email, password);
    await expect(page).toHaveURL(new RegExp(`/vi/${fixture.home}`));
    for (const denied of fixture.denied) {
      await page.goto(`/vi/${denied}`);
      await expect(page).toHaveURL(new RegExp(`/vi/${fixture.home}`));
    }
  });
}
