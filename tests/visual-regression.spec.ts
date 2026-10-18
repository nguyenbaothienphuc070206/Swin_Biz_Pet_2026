import { expect, test } from "@playwright/test";

for (const route of ["/vi", "/vi/clinics", "/vi/sign-in"]) {
  test(`mobile visual baseline: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page).toHaveScreenshot(`${route.replaceAll("/", "_").replace(/^_/, "")}.png`, {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
}
