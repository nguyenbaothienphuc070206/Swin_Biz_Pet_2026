import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const phase = process.argv[2] ?? "before";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const out = `docs/ux-audit/${phase}`;
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
page.setDefaultTimeout(8000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(`${baseUrl}/vi`, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: `${out}/owner-first-visit.png`, fullPage: true });
await page.goto(`${baseUrl}/vi/demo`, { waitUntil: "domcontentloaded" });
await page.getByRole("button").first().click();
await page.locator("#passport").waitFor({ state: "visible" });
for (const [id, name] of [["passport", "owner-passport"], ["sos", "owner-sos-2am"], ["booking", "owner-booking"], ["clinic", "vet-and-clinic-admin"]]) {
  const section = page.locator(`#${id}`);
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await page.locator("#passport button").nth(0).click();
await page.screenshot({ path: `${out}/owner-passport-shared.png` });
await page.locator("#passport button").nth(1).click();
const vaccineFields = page.locator("#passport input[required]");
for (const [index, value] of [[0,"Vắc xin demo"],[1,"DEMO-VAX-CAT-01"],[2,"1 liều"],[3,"LOT-DEMO-01"]]) await vaccineFields.nth(index).fill(value);
await vaccineFields.nth(4).fill("2026-10-18");
await page.locator("#passport form button").click();
await page.screenshot({ path: `${out}/owner-first-vaccination-logged.png` });
await page.getByRole("button", { name: /Đặt giờ demo/ }).first().click();
await page.screenshot({ path: `${out}/owner-booking-confirmed.png` });
await page.getByRole("button", { name: /Hủy lịch/ }).click();
await page.getByRole("button", { name: "Khó thở" }).click();
await page.locator("#sos input").first().fill("Quận 1 (demo)");
await page.getByRole("button", { name: /Gửi yêu cầu SOS/ }).click();
await page.screenshot({ path: `${out}/owner-sos-searching.png` });
await page.getByRole("button", { name: /Mô phỏng clinic nhận ca/ }).click();
await page.screenshot({ path: `${out}/owner-sos-accepted.png` });
for (const [path, name] of [["/vi/sign-up", "owner-onboarding-entry"], ["/vi/admin/community", "moderator-gate"], ["/vi/clinic/patients", "vet-gate"]]) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
await page.goto(`${baseUrl}/vi/demo`, { waitUntil: "domcontentloaded" });
await page.getByRole("button").first().click();
await page.locator("#sos").waitFor({ state: "visible" });
await page.evaluate(() => document.documentElement.classList.add("dark"));
for (const [id, name] of [["passport", "owner-passport-dark"], ["sos", "owner-sos-dark-reduced-motion"], ["booking", "owner-booking-dark"], ["clinic", "vet-clinic-dark"]]) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/${name}.png` });
}

console.log(JSON.stringify({ phase, errors, screenshots: await (await import("node:fs/promises")).readdir(out) }));
await browser.close();
