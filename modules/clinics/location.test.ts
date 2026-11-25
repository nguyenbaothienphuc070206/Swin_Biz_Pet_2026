import { describe, expect, it } from "vitest";
import { isValidVietnamClinicPin } from "./location";

describe("clinic SOS pin validation", () => {
  it("accepts points in the approximate Vietnam bounds", () => expect(isValidVietnamClinicPin(10.7769, 106.7009)).toBe(true));
  it("rejects null island, out-of-range and non-finite points", () => {
    expect(isValidVietnamClinicPin(0, 0)).toBe(false);
    expect(isValidVietnamClinicPin(10, 0)).toBe(false);
    expect(isValidVietnamClinicPin(30, 110)).toBe(false);
    expect(isValidVietnamClinicPin(Number.NaN, 106)).toBe(false);
  });
});
