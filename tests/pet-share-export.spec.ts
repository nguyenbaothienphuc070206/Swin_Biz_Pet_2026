import { expect, test } from "@playwright/test";

test.describe("Pet Health Record Share & Export Flow", () => {
  test("public verification endpoint returns verified record with rabies status", async ({ request }) => {
    const res = await request.post("/api/passport/verify/demo-competition-token", {
      headers: { "content-type": "application/json" },
      data: {},
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.projection).toBeTruthy();
    expect(data.projection.pet.name).toBe("Mochi");
    expect(data.projection.rabiesStatus).toBeTruthy();
    expect(data.projection.rabiesStatus.isValid).toBe(true);
  });

  test("collar rabies verification mode minimizes data and conceals owner PII", async ({ request }) => {
    const res = await request.post("/api/passport/verify/demo-collar-rabies-token", {
      headers: { "content-type": "application/json" },
      data: {},
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.projection.provenance.shareType).toBe("rabies_verification");
    expect(data.projection.rabiesStatus.isValid).toBe(true);
    // Data minimization check: no owner contact or medications leaked to public
    expect(data.projection.ownerContact).toBeUndefined();
    expect(data.projection.medications).toBeUndefined();
  });

  test("passport PDF export endpoint delivers application/pdf with valid magic header", async ({ request }) => {
    const res = await request.get("/api/demo/passport.pdf?locale=vi");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toContain("attachment");

    const bodyBuffer = await res.body();
    const pdfMagic = bodyBuffer.subarray(0, 5).toString("utf-8");
    expect(pdfMagic).toBe("%PDF-");
  });
});

