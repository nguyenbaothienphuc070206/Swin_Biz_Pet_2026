export type OfflineClinicEntryState = "queued" | "conflict" | "failed";

export function clinicEntryFailureState(status: number | null): OfflineClinicEntryState {
  if (status === null || status >= 500) return "queued";
  if (status === 409 || status === 403) return "conflict";
  return "failed";
}

export function shouldRetryClinicEntry(status: number | null) {
  return status === null || status >= 500;
}
