import {describe,expect,it} from "vitest";
import {clinicEntryFailureState,shouldRetryClinicEntry} from "./outbox";

describe("offline clinic entry conflict policy",()=>{
  it("retries network and transient server failures",()=>{
    expect(shouldRetryClinicEntry(null)).toBe(true);
    expect(shouldRetryClinicEntry(503)).toBe(true);
    expect(clinicEntryFailureState(null)).toBe("queued");
  });
  it("retains authorization and slot conflicts for human resolution",()=>{
    expect(shouldRetryClinicEntry(409)).toBe(false);
    expect(clinicEntryFailureState(409)).toBe("conflict");
    expect(clinicEntryFailureState(403)).toBe("conflict");
    expect(clinicEntryFailureState(400)).toBe("failed");
  });
});
