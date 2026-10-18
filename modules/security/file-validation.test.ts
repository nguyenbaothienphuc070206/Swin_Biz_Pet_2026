import { describe, expect, it } from "vitest";
import { validateFileSignature } from "./file-validation";

describe("private file upload signature validation", () => {
  it("accepts content whose bytes match the declared MIME type", () => {
    expect(validateFileSignature({ mime:"image/png", size:8, bytes:new Uint8Array([137,80,78,71,13,10,26,10]), maxBytes:1024 })).toEqual({valid:true});
  });
  it("rejects MIME spoofing, unsupported types and oversized files", () => {
    expect(validateFileSignature({ mime:"image/png", size:8, bytes:new Uint8Array([37,80,68,70,45]), maxBytes:1024 })).toEqual({valid:false,reason:"signature_mismatch"});
    expect(validateFileSignature({ mime:"text/html", size:8, bytes:new Uint8Array([60,104,116,109]), maxBytes:1024 })).toEqual({valid:false,reason:"unsupported_type"});
    expect(validateFileSignature({ mime:"image/png", size:2048, bytes:new Uint8Array([137,80,78,71,13,10,26,10]), maxBytes:1024 })).toEqual({valid:false,reason:"file_too_large"});
  });
});
