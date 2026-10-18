import "server-only";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AnthropicProvider, OpenAiProvider, type AiProvider } from "./providers";
import { hasForbiddenMedicalInstruction } from "./safety";
import { safeRedactedInput } from "./privacy";

type CallArgs<T> = {
  feature: "care_plan" | "sos_summary" | "record_explanation";
  promptVersion: string;
  system: string;
  input: unknown;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  fallback: T;
};

const circuit = new Map<string, { failures: number; openedAt: number }>();
const THRESHOLD = 3;
const COOLDOWN_MS = 30_000;

export function mockProvider(): AiProvider {
  return {
    name: "mock",
    async generate(request) {
      const data = request.input as Record<string, unknown>;
      if (Array.isArray(data.baselineTasks)) {
        const tasks = data.baselineTasks as Array<{ id: string; order?: number; taskKey?: string }>;
        return { json: { introduction: "Draft based on supplied rules.", items: tasks.map((task, index) => ({ taskId: task.id, explanation: task.taskKey ?? "Review this planned task.", order: task.order ?? index })) }, model: "pawcare-deterministic-mock" };
      }
      if (Array.isArray(data.sourceRecordIds)) return { json: { explanation: "This explanation restates the supplied health record.", sourceRecordIds: data.sourceRecordIds }, model: "pawcare-deterministic-mock" };
      const text = String(data.summary ?? data.text ?? "");
      return { json: { summary: text.slice(0, 280) || JSON.stringify(data.symptoms ?? "Intake received."), facts: [], questionsForVet: [] }, model: "pawcare-deterministic-mock" };
    },
  };
}

function providerFromEnv(): AiProvider {
  if (process.env.PAWCARE_AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY) return new OpenAiProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL ?? "gpt-4o-mini");
  if (process.env.PAWCARE_AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY) return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5");
  return mockProvider();
}

export async function runAi<T>(args: CallArgs<T>): Promise<{ value: T; outcome: "success" | "fallback"; runId?: string }> {
  const started = Date.now();
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let userId: string | null = null;
  try {
    if (isSupabaseConfigured()) {
      supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      if (!userId) return { value: args.fallback, outcome: "fallback" };
      const { data: allowed, error } = await supabase.rpc("reserve_ai_daily_budget", { p_max_calls: 20 });
      if (error || allowed !== true) {
        await logRun(supabase, userId, args, "budget", "none", started, "budget_denied").catch(() => null);
        return { value: args.fallback, outcome: "fallback" };
      }
    }
    const provider = providerFromEnv();
    if (!supabase && provider.name !== "mock") return { value: args.fallback, outcome: "fallback" };
    const state = circuit.get(provider.name) ?? { failures: 0, openedAt: 0 };
    if (provider.name !== "mock" && state.failures >= THRESHOLD && Date.now() - state.openedAt < COOLDOWN_MS) return { value: args.fallback, outcome: "fallback" };
    let value: T | null = null;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let model = "mock";
    for (let attempt = 0; attempt < (provider.name === "mock" ? 1 : 2); attempt++) {
      try {
        const response = await provider.generate({ system: args.system, input: args.input, jsonSchema: args.jsonSchema, model: "configured", signal: AbortSignal.timeout(8_000) });
        value = args.schema.parse(response.json);
        if (hasForbiddenMedicalInstruction(value)) throw new Error("safety_rejected");
        inputTokens = response.inputTokens; outputTokens = response.outputTokens; model = response.model;
        circuit.set(provider.name, { failures: 0, openedAt: 0 });
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : "provider_error";
        if (message === "safety_rejected" || attempt > 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 150));
      }
    }
    if (value === null) throw new Error("empty_result");
    const runId = await logRun(supabase, userId, args, provider.name, model, started, "success", value, inputTokens, outputTokens);
    return { value, outcome: "success", runId: runId ?? undefined };
  } catch (failure) {
    const safetyBlocked = failure instanceof Error && failure.message === "safety_rejected";
    const provider = providerFromEnv();
    const prior = circuit.get(provider.name) ?? { failures: 0, openedAt: 0 };
    circuit.set(provider.name, { failures: prior.failures + 1, openedAt: prior.failures + 1 >= THRESHOLD ? Date.now() : prior.openedAt });
    await logRun(supabase, userId, args, provider.name, "unknown", started, safetyBlocked ? "blocked" : "fallback", undefined, undefined, undefined, safetyBlocked ? "safety_rejected" : "provider_failure").catch(() => null);
    return { value: args.fallback, outcome: "fallback" };
  }
}

async function logRun<T>(supabase: Awaited<ReturnType<typeof createClient>> | null, userId: string | null, args: CallArgs<T>, provider: string, model: string, started: number, outcome: string, value?: unknown, inputTokens?: number, outputTokens?: number, errorCode?: string) {
  if (!supabase || !userId) return null;
  const outputHash = value === undefined ? null : (await import("node:crypto")).createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const { data, error } = await supabase.from("ai_runs").insert({
    user_id: userId, feature: args.feature, provider, model, prompt_version: args.promptVersion,
    redacted_input: safeRedactedInput(args.input), output_hash: outputHash, latency_ms: Date.now() - started,
    input_tokens: inputTokens ?? null, output_tokens: outputTokens ?? null, outcome, error_code:errorCode??null,
    is_demo: provider === "mock" || process.env.NODE_ENV === "test",
  }).select("id").maybeSingle();
  if (error) throw new Error("ai_audit_failed");
  return data?.id ?? null;
}
