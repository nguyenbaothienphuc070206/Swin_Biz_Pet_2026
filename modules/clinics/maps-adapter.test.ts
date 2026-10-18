import { describe, expect, it } from "vitest";
import { chooseMapProvider } from "./maps-adapter";

describe("maps adapter selection contract", () => {
  it("prefers a configured Google provider, uses MapLibre only in demo, otherwise fails closed", () => {
    expect(chooseMapProvider({ googleKey: "configured", demoMode: true })).toBe("google");
    expect(chooseMapProvider({ demoMode: true })).toBe("maplibre");
    expect(chooseMapProvider({ demoMode: false })).toBeNull();
  });
});
