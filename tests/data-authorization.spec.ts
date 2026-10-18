import {createClient} from "@supabase/supabase-js";
import {expect,test} from "@playwright/test";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
async function petRows(email:string,password:string,petId:string) {
  if(!url||!key)throw new Error("Supabase test environment is not configured");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:authError}=await client.auth.signInWithPassword({email,password});if(authError)throw authError;
  const {data,error}=await client.from("pets").select("id").eq("id",petId);if(error)throw error;
  return data;
}

test("an owner can read their own pet through RLS",async()=>{
  const email=process.env.E2E_OWNER_EMAIL,password=process.env.E2E_OWNER_PASSWORD,petId=process.env.E2E_OWNER_PET_ID;
  if (!url||!key||!email||!password||!petId) throw new Error("Configure Supabase and E2E_OWNER_PET_ID for RLS checks.");
  expect(await petRows(email!,password!,petId!)).toHaveLength(1);
});

test("owners and clinic staff without a grant cannot read another owner's pet",async()=>{
  const petId=process.env.E2E_UNGRANTED_PET_ID;
  if (!url||!key||!petId) throw new Error("Configure E2E_UNGRANTED_PET_ID for RLS checks.");
  const credentials=[
    [process.env.E2E_OTHER_OWNER_EMAIL,process.env.E2E_OTHER_OWNER_PASSWORD],
    [process.env.E2E_CLINIC_STAFF_EMAIL,process.env.E2E_CLINIC_STAFF_PASSWORD],
    [process.env.E2E_CLINIC_ADMIN_EMAIL,process.env.E2E_CLINIC_ADMIN_PASSWORD],
  ];
  if (credentials.some(([email,password])=>!email||!password)) throw new Error("Configure other-owner and clinic test accounts.");
  for(const [email,password] of credentials) expect(await petRows(email!,password!,petId!)).toHaveLength(0);
});

test("platform admin data access is limited to its admin policy",async()=>{
  const email=process.env.E2E_PLATFORM_ADMIN_EMAIL,password=process.env.E2E_PLATFORM_ADMIN_PASSWORD,petId=process.env.E2E_UNGRANTED_PET_ID;
  if (!url||!key||!email||!password||!petId) throw new Error("Configure a platform admin test user and E2E_UNGRANTED_PET_ID.");
  expect(await petRows(email!,password!,petId!)).toHaveLength(1);
});
