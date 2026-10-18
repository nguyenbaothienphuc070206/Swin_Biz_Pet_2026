import {describe,expect,it} from "vitest";
import {MAX_PRIVATE_SIGNED_URL_SECONDS,privateSignedUrlExpiry} from "./signed-url";

describe("private signed URL expiry",()=>{
  it("caps links at five minutes and rejects invalid lifetimes",()=>{
    expect(privateSignedUrlExpiry(60)).toBe(60);
    expect(privateSignedUrlExpiry(9999)).toBe(MAX_PRIVATE_SIGNED_URL_SECONDS);
    expect(privateSignedUrlExpiry(0)).toBe(1);
    expect(privateSignedUrlExpiry(Number.NaN)).toBe(1);
  });
});
