export const MAX_PRIVATE_SIGNED_URL_SECONDS=300;

export function privateSignedUrlExpiry(requestedSeconds: number) {
  if(!Number.isFinite(requestedSeconds))return 1;
  return Math.max(1,Math.min(MAX_PRIVATE_SIGNED_URL_SECONDS,Math.floor(requestedSeconds)));
}
