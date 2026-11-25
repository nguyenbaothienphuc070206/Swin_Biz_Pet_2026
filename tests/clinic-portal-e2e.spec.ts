import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signInAsClinic(page: Page) {
  await page.goto("/vi/sign-in?cleared=1");
  await expect(page.getByText(/Đăng nhập nhanh 1 chạm/)).toHaveCount(0);
  await expect(page.getByText(/Đã xóa toàn bộ phiên đăng nhập/)).toHaveCount(0);
  await expect(page.getByText(/Xóa dữ liệu phiên & đặt lại/)).toHaveCount(0);
  await expect(page.getByText(/Dành cho Chủ nuôi thú cưng/)).toHaveCount(0);
  await expect(page.getByText(/Dành cho Phòng khám & Cơ sở y tế/)).toHaveCount(0);

  await page.getByRole("button", { name: "Cơ sở y tế" }).click();
  await page.locator('input[name="email"]').fill("clinic@pawcare.vn");
  await page.locator('input[name="password"]').fill("Pawcare@2026");
  await page.getByRole("button", { name: "Đăng nhập Cơ sở y tế", exact: true }).click();
  await expect(page).toHaveURL(/\/vi\/clinic/);
}

test("clinic portal desktop routes render zero SVG icons, zero user links, and pass WCAG 2.1 AA", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("sha256-5WoVk6D3lQJxiQl/AsumbrzsCXmMlttiEIWxrxYPImE=")) {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAsClinic(page);

  const routesToVerify = [
    "/vi/clinic",
    "/vi/clinic/appointments",
    "/vi/clinic/records",
    "/vi/clinic/care-plans",
    "/vi/clinic/rescue",
    "/vi/clinic/billing",
    "/vi/clinic/verification",
    "/vi/clinic/sos-settings",
    "/vi/clinic/settings",
  ];

  for (const route of routesToVerify) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(await page.locator(".clinic-theme svg").count(), `Expected 0 <svg> icons on ${route}`).toBe(0);

    const forbiddenLinks = await page
      .locator(
        'a[href*="/owner"], a[href*="/records/verify"], a[href="/vi/settings"], a[href="/en/settings"], a[href^="/vi/settings#"], a[href^="/en/settings#"], a[href*="clinic-profile-setup"]'
      )
      .count();
    expect(forbiddenLinks, `Expected 0 user-portal or profile-setup links on ${route}`).toBe(0);

    const axeResult = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      axeResult.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })),
      `Axe violations on ${route}`
    ).toEqual([]);
  }

  // Visiting /vi/settings or /vi/clinic-profile-setup as an already-registered clinic must redirect to /vi/clinic/settings
  await page.goto("/vi/settings");
  await expect(page).toHaveURL(/\/vi\/clinic\/settings/);
  await expect(page.getByRole("heading", { name: "Cài đặt phòng khám" })).toBeVisible();

  await page.goto("/vi/clinic-profile-setup");
  await expect(page).toHaveURL(/\/vi\/clinic\/settings/);

  // Dark theme accessibility check
  await page.goto("/vi/clinic");
  await page.waitForLoadState("networkidle");
  const themeBtn = page.getByRole("button", { name: /Giao diện: Sáng/ });
  await expect(themeBtn).toBeEnabled();
  await themeBtn.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(250);
  const darkAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    darkAxe.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }))
  ).toEqual([]);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("clinic portal interactive workflows and 360px mobile layout work cleanly", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("sha256-5WoVk6D3lQJxiQl/AsumbrzsCXmMlttiEIWxrxYPImE=")) {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAsClinic(page);

  // Clinic Home SOS intake
  await page.getByRole("button", { name: "Tiếp nhận & Chuẩn bị buồng" }).click();
  await expect(page.getByText("Buồng tiếp nhận #2 đã sẵn sàng")).toBeVisible();

  // Appointments inline decline modal & confirm
  await page.goto("/vi/clinic/appointments");
  await page.getByRole("button", { name: "Từ chối", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).first().click();
  await expect(page.getByText(/Đã xác nhận lịch hẹn/)).toBeVisible();

  // Pet Records tabs + QR modal
  await page.goto("/vi/clinic/records");
  await page.getByRole("button", { name: /Mochi/ }).click();
  await expect(page.getByText("ISO: 981098109876543")).toBeVisible();
  await page.getByRole("button", { name: /Bệnh án lâm sàng/ }).click();
  await expect(page.getByText(/Khám kiểm dịch xuất cảnh/)).toBeVisible();
  await page.getByRole("button", { name: "Mã QR y bạ" }).click();
  await expect(page.locator('img[alt*="QR passport"]')).toBeVisible();
  await page.getByRole("button", { name: "Đóng" }).click();

  // Care Plans template, create flow, and inline clinical detail modal (no owner link)
  await page.goto("/vi/clinic/care-plans");
  await expect(page.locator('a[href*="/owner/care-plans"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Xem chi tiết phác đồ" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Chi tiết phác đồ lâm sàng")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();

  await page.getByRole("button", { name: "+ Tạo phác đồ mới" }).click();
  await page.getByRole("button", { name: "Dùng mẫu viêm da" }).click();
  await page.getByRole("button", { name: "Gửi đề xuất cho chủ nuôi" }).click();
  await expect(page.getByText(/Đã gửi đề xuất kế hoạch chăm sóc/)).toBeVisible();

  // Dedicated Clinic Settings tabs, inline profile editing & persistence
  await page.goto("/vi/clinic/settings");
  await expect(page.getByRole("heading", { name: "Cài đặt phòng khám" })).toBeVisible();
  await page.locator("#clinic-license").fill("CN-TY-HCM-9988");
  await page.locator("#clinic-address").fill("456 Hai Bà Trưng, Quận 1");
  await page.getByRole("tab", { name: "Quy trình khám" }).click();
  await page.getByLabel("Thời lượng mỗi lượt khám mặc định").selectOption("45");
  await page.getByRole("tab", { name: "Điều phối SOS" }).click();
  await page.getByLabel("Tần suất làm mới hàng đợi").selectOption("15");
  await page.getByRole("button", { name: "Lưu cài đặt" }).click();
  await expect(page.getByText("Đã lưu cấu hình vận hành cho quầy lễ tân và bàn khám.")).toBeVisible();
  await page.reload();
  await expect(page.locator("#clinic-license")).toHaveValue("CN-TY-HCM-9988");
  await expect(page.locator("#clinic-address")).toHaveValue("456 Hai Bà Trưng, Quận 1");
  await page.getByRole("tab", { name: "Quy trình khám" }).click();
  await expect(page.getByLabel("Thời lượng mỗi lượt khám mặc định")).toHaveValue("45");

  // 360px mobile layout check
  await page.setViewportSize({ width: 360, height: 780 });
  for (const route of [
    "/vi/clinic",
    "/vi/clinic/appointments",
    "/vi/clinic/records",
    "/vi/clinic/care-plans",
    "/vi/clinic/settings",
  ]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(await page.locator(".clinic-theme svg").count(), `Expected 0 <svg> icons on 360px ${route}`).toBe(0);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow, `Horizontal overflow on 360px ${route}`).toBe(false);
  }

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("clinic profile setup opens only on clinic registration and moves editing into settings afterward", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/vi/sign-up");
  await page.getByRole("button", { name: "Cơ sở y tế" }).click();
  await page.locator('input[name="name"]').fill("Phòng khám Thú y Mới");
  await page.locator('input[name="email"]').fill("newclinic@pawcare.vn");
  await page.locator('input[name="password"]').fill("Pawcare@2026");
  await page.getByRole("button", { name: "Đăng ký Cơ sở y tế", exact: true }).click();

  await expect(page).toHaveURL(/\/vi\/clinic-profile-setup/);
  await page.waitForLoadState("networkidle");
  expect(await page.locator(".clinic-theme svg").count()).toBe(0);

  await page.locator("#clinic-name").fill("Phòng khám Thú y Mới");
  await page.locator("#clinic-license").fill("CN-TEST-2026");
  await page.locator("#clinic-chief-vet").fill("BS. Lê Minh");
  await page.locator("#clinic-address").fill("99 Điện Biên Phủ, Quận 1");
  await page.locator("#clinic-phone").fill("028 3899 9988");
  await page.getByRole("button", { name: "Lưu & Kích hoạt hồ sơ phòng khám" }).click();

  await expect(page).toHaveURL(/\/vi\/clinic\/settings/);
  await expect(page.getByText(/Hồ sơ phòng khám đã được kích hoạt/)).toBeVisible();
  await expect(page.locator("#clinic-license")).toHaveValue("CN-TEST-2026");

  // Re-visiting setup route after completion must redirect to Clinic Settings
  await page.goto("/vi/clinic-profile-setup");
  await expect(page).toHaveURL(/\/vi\/clinic\/settings/);
  await expect(page.locator("#clinic-license")).toHaveValue("CN-TEST-2026");
});
