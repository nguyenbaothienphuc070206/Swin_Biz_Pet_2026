import { expect, test } from "@playwright/test";

test("booking and SOS APIs reject malformed requests before reaching protected side effects", async ({ request }) => {
  const booking = await request.post("/api/appointments", { headers: { origin: "http://localhost:3100" }, data: {} });
  expect(booking.status()).toBe(400);
  expect(await booking.json()).toMatchObject({ error: "invalid_booking" });

  const sos = await request.post("/api/sos", { headers: { origin: "http://localhost:3100" }, data: {} });
  expect(sos.status()).toBe(400);
  expect(await sos.json()).toMatchObject({ error: "invalid_sos_request" });
  expect(sos.headers()["x-request-id"]).toBeTruthy();
});

test("health route returns a structured response without user data", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: "ok" });
});
