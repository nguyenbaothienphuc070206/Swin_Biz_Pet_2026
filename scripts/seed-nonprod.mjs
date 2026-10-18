import { spawnSync } from "node:child_process";

const environment = process.env.PAWCARE_DEPLOY_ENV;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const allowedRefs = new Set((process.env.PAWCARE_NONPROD_PROJECT_REFS ?? "").split(",").map((value) => value.trim()).filter(Boolean));

if (!new Set(["local", "preview", "staging"]).has(environment ?? "")) {
  console.error("Refusing to seed: set PAWCARE_DEPLOY_ENV to local, preview, or staging. Production is never allowed.");
  process.exit(1);
}
if (environment !== "local" && (!projectRef || !allowedRefs.has(projectRef))) {
  console.error("Refusing to seed remote database: SUPABASE_PROJECT_REF must exactly match PAWCARE_NONPROD_PROJECT_REFS.");
  process.exit(1);
}

const commands = environment === "local"
  ? [["db", "reset", "--local", "--no-seed"], ["db", "push", "--local", "--include-seed"]]
  : [["db", "push", "--linked", "--include-seed"]];

for (const args of commands) {
  const result = spawnSync("supabase", args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
