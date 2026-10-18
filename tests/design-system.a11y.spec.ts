import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("design system has no WCAG 2.1 A/AA axe violations in light or dark theme", async ({ page }) => {
  await page.goto("/design-system");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const light = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summarize = (violations: typeof light.violations) => violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.map((node) => ({ target: node.target, message: node.any[0]?.message, data: node.any[0]?.data })),
  }));
  expect(light.violations, JSON.stringify(summarize(light.violations), null, 2)).toEqual([]);

  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
  const dark = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dark.violations, JSON.stringify(summarize(dark.violations), null, 2)).toEqual([]);
});

test("design system is accessible and fits a 360px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/design-system");
  const layout = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(layout.document).toBeLessThanOrEqual(layout.viewport);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) })), null, 2)).toEqual([]);
});

test("dialog and sheet stay accessible when open", async ({ page }) => {
  await page.goto("/design-system");
  await page.getByRole("button", { name: /dialog/i }).first().click();
  const dialog = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dialog.violations, JSON.stringify(dialog.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) })), null, 2)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /sheet/i }).first().click();
  const sheet = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(sheet.violations, JSON.stringify(sheet.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) })), null, 2)).toEqual([]);
});
