import "server-only";
import { z } from "zod";

const RuntimeSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  PAWCARE_AI_PROVIDER: z.enum(["mock", "openai", "anthropic"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  BILLING_SANDBOX_WEBHOOK_SECRET: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.PAWCARE_AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) ctx.addIssue({ code: "custom", path: ["OPENAI_API_KEY"], message: "required when PAWCARE_AI_PROVIDER=openai" });
  if (env.PAWCARE_AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "required when PAWCARE_AI_PROVIDER=anthropic" });
});

export function validateRuntimeEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") return;
  const result = RuntimeSchema.safeParse(env);
  if (result.success) return;
  const missing = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid PawCare production environment: ${missing}`);
}
