import { expect, test } from "@playwright/test";

test("owner submits a lost pet, confirms a match suggestion, and resolves the report", async ({ page }) => {
  const email=process.env.E2E_OWNER_EMAIL,password=process.env.E2E_OWNER_PASSWORD;
  const petId=process.env.E2E_OWNER_PET_ID,matchId=process.env.E2E_COMMUNITY_MATCH_REPORT_ID;
  if (!email||!password||!petId||!matchId) throw new Error("Configure owner auth, pet id and an open nearby found report fixture.");
  await page.goto("/vi/sign-in");
  await page.locator("input[name=email]").fill(email!);
  await page.locator("input[name=password]").fill(password!);
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/vi\/owner/);
  await page.goto("/vi/owner/community");
  const form=page.locator("form").first();
  await form.locator("select[name=kind]").selectOption("lost");
  await form.locator("select[name=species]").selectOption("dog");
  await form.locator("input[name=breed]").fill("demo dog");
  await form.locator("input[name=colors]").fill("black, white");
  await form.locator("input[name=petId]").fill(petId!);
  await form.locator("textarea[name=description]").fill("Fictional E2E lost pet report");
  await form.locator("input[name=latitude]").fill(process.env.E2E_COMMUNITY_LATITUDE??"10.7769");
  await form.locator("input[name=longitude]").fill(process.env.E2E_COMMUNITY_LONGITUDE??"106.7009");
  await form.locator("button[type=submit]").click();
  const reportsResponse=await page.request.get("/api/community/lost-found");
  expect(reportsResponse.ok()).toBeTruthy();
  const reports=(await reportsResponse.json()).reports as Array<{id:string;status:string}>;
  const report=reports[0];expect(report).toBeTruthy();
  const matchesResponse=await page.request.get(`/api/community/lost-found/${report.id}/matches`);
  expect(matchesResponse.ok()).toBeTruthy();
  const matches=(await matchesResponse.json()).matches as Array<{id:string}>;
  expect(matches.some(match=>match.id===matchId)).toBeTruthy();
  const matchRow=page.getByTestId(`community-match-${matchId}`);
  await expect(matchRow).toBeVisible();
  await matchRow.getByRole("button").click();
  await expect.poll(async()=>{
    const response=await page.request.get("/api/community/lost-found");
    const own=(await response.json()).reports as Array<{id:string;status:string}>;
    return own.find(item=>item.id===report.id)?.status;
  }).toBe("resolved");
});
