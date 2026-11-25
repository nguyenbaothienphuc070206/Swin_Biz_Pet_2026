import { createHmac, randomBytes } from "node:crypto";

function secret() {
  const value = process.env.SOS_HASH_SECRET;
  if (!value || value.length < 32) throw new Error("sos_hash_secret_missing");
  return value;
}

export function hashSosValue(value: string): string {
  return createHmac("sha256", secret()).update(value.trim()).digest("hex");
}

export function createGuestSosToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSosValue(token) };
}
