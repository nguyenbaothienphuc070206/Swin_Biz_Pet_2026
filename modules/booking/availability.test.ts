import { describe, expect, it } from "vitest";
import { isVetAvailable, isWithinOpeningHours, reserveCapacity } from "./availability";

describe("availability rules", () => {
  const slot = { start: 10_000_000, end: 10_600_000 };
  it("requires the whole slot to fit clinic hours and rejects holiday overlap", () => {
    expect(isWithinOpeningHours(slot, { start: 9_000_000, end: 11_000_000 })).toBe(true);
    expect(isWithinOpeningHours(slot, { start: 10_100_000, end: 11_000_000 })).toBe(false);
    expect(isWithinOpeningHours(slot, { start: 9_000_000, end: 11_000_000 }, [{ start: 10_600_000, end: 11_000_000 }])).toBe(true);
    expect(isWithinOpeningHours(slot, { start: 9_000_000, end: 11_000_000 }, [{ start: 10_500_000, end: 11_000_000 }])).toBe(false);
    expect(isWithinOpeningHours(slot, null)).toBe(false);
  });
  it("applies buffers to shift boundaries and busy appointments", () => {
    expect(isVetAvailable(slot, [{ start: 9_700_000, end: 10_900_000 }], [], 5)).toBe(true);
    expect(isVetAvailable(slot, [{ start: 10_000_000, end: 11_000_000 }], [], 5)).toBe(false);
    expect(isVetAvailable(slot, [{ start: 9_000_000, end: 11_000_000 }], [{ start: 10_800_000, end: 11_000_000 }], 5)).toBe(false);
  });
  it("reserves only while capacity remains without mutating its input", () => {
    const input = { capacity: 2, reserved: 1 };
    expect(reserveCapacity(input)).toEqual({ capacity: 2, reserved: 2 });
    expect(input.reserved).toBe(1);
    expect(reserveCapacity({ capacity: 1, reserved: 1 })).toBeNull();
  });
});
