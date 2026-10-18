import {expect,test} from "@playwright/test";
import {canAccessRole,homeForRole,parseRole,roleFromClaims} from "@/lib/auth/roles";

test("roles are read only from a valid role claim",()=>{
  expect(roleFromClaims({app_metadata:{role:"clinic_admin"}})).toBe("clinic_admin");
  expect(roleFromClaims({app_metadata:{role:"platform_admin"}})).toBe("platform_admin");
  expect(roleFromClaims({app_metadata:{role:"owner"}})).toBe("owner");
  expect(roleFromClaims({app_metadata:{role:"untrusted"}})).toBeNull();
  expect(parseRole("clinic_staff")).toBe("clinic_staff");
});

test("each role is limited to its own route context",()=>{
  const groups={owner:["owner"],clinic:["clinic_staff","clinic_admin"],admin:["platform_admin"]} as const;
  const expected:Record<string,string[]>={owner:["owner"],clinic_staff:["clinic"],clinic_admin:["clinic"],platform_admin:["admin"]};
  for(const role of ["owner","clinic_staff","clinic_admin","platform_admin"] as const) {
    for(const [context,allowed] of Object.entries(groups)) expect(canAccessRole(role,allowed)).toBe(expected[role].includes(context));
    expect(homeForRole(role)).toBe(role==="owner"?"/owner":role==="platform_admin"?"/admin":"/clinic");
  }
});

test("unauthed visitors are redirected away from every protected context",async({page})=>{
  for(const path of ["/vi/owner","/vi/clinic","/vi/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/vi\/sign-in\?/);
  }
});
