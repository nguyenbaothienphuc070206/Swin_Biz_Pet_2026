import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = ["/vi", "/en", "/vi/clinics", "/en/clinics", "/vi/sign-in", "/vi/sign-up", "/vi/clinic-apply", "/vi/demo"];
for (const route of publicRoutes) {
  test(`WCAG 2.1 AA: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }))).toEqual([]);
  });
}
