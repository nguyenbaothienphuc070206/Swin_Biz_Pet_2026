import {describe,expect,it} from "vitest";
import {effectivePlan,entitlementMatrix,canAccess,proratedCharge,cancelAtPeriodEnd} from "./entitlements";

describe("central entitlements",()=>{
  it("never paywalls baseline SOS or clinic dispatch",()=>{
    for(const plan of ["free","plus","premium"] as const){expect(entitlementMatrix[plan].basicSos).toBe(true);expect(entitlementMatrix[plan].clinicDispatch).toBe(true);}
  });
  it("grants only the configured paid features",()=>{
    expect(canAccess(null,"carePlans",0)).toBe(false);expect(canAccess({plan:"plus",status:"active",periodEndsAt:100},"carePlans",0)).toBe(true);expect(canAccess({plan:"plus",status:"active",periodEndsAt:100},"priorityVideoTriage",0)).toBe(false);expect(canAccess({plan:"premium",status:"active",periodEndsAt:100},"priorityVideoTriage",0)).toBe(true);
  });
  it("falls back to Free after grace, but honors cancellation through period end",()=>{
    expect(effectivePlan({plan:"premium",status:"past_due",periodEndsAt:100,graceEndsAt:200},199)).toBe("premium");
    expect(effectivePlan({plan:"premium",status:"past_due",periodEndsAt:100,graceEndsAt:200},200)).toBe("free");
    expect(effectivePlan({plan:"plus",status:"cancelled",periodEndsAt:200},199)).toBe("plus");
    expect(effectivePlan({plan:"plus",status:"cancelled",periodEndsAt:200},200)).toBe("free");
    expect(effectivePlan({plan:"premium",pendingPlan:"plus",status:"active",periodEndsAt:200},200)).toBe("plus");
  });
});

describe("subscription lifecycle math",()=>{
  it("prorates upgrades and credits unused time on downgrade",()=>{
    expect(proratedCharge({oldMonthlyVnd:100_000,newMonthlyVnd:200_000,periodDays:30,remainingDays:15})).toBe(50_000);
    expect(proratedCharge({oldMonthlyVnd:200_000,newMonthlyVnd:100_000,periodDays:30,remainingDays:15})).toBe(0);
  });
  it("cancels at cycle end without removing current entitlement",()=>{
    expect(cancelAtPeriodEnd({plan:"plus",status:"active",periodEndsAt:200},150)).toEqual({plan:"plus",status:"cancelled",periodEndsAt:200});
  });
});
