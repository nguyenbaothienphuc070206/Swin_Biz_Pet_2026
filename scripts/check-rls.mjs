import {spawnSync} from "node:child_process";

const command=process.platform==="win32"?"supabase.cmd":"supabase";
const result=spawnSync(command,["test","db"],{stdio:"inherit",shell:process.platform==="win32"});
if(result.error){console.error("Supabase CLI is required; install it and run `supabase start` before the RLS completeness test.");process.exit(1)}
process.exit(result.status??1);
