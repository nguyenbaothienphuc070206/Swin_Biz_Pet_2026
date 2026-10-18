const SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": bytes => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": bytes => bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value),
  "image/webp": bytes => bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP",
  "application/pdf": bytes => bytes.length >= 5 && String.fromCharCode(...bytes.slice(0,5)) === "%PDF-",
};

export function validateFileSignature(input: { mime: string; size: number; bytes: Uint8Array; maxBytes: number }): { valid: true } | { valid: false; reason: "unsupported_type" | "file_too_large" | "signature_mismatch" } {
  const signature = SIGNATURES[input.mime];
  if (!signature) return { valid:false, reason:"unsupported_type" };
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > input.maxBytes) return { valid:false, reason:"file_too_large" };
  if (!signature(input.bytes)) return { valid:false, reason:"signature_mismatch" };
  return { valid:true };
}

export async function validateBrowserFile(file: File, maxBytes: number) {
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  return validateFileSignature({mime:file.type,size:file.size,bytes,maxBytes});
}
