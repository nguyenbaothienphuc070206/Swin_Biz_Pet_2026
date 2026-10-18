import { z } from "zod";

export const carePlanDraftSchema = z.object({
  introduction: z.string().trim().min(1).max(500),
  items: z.array(z.object({ taskId: z.string().uuid(), explanation: z.string().trim().min(1).max(300), order: z.number().int().nonnegative() })).max(40),
}).strict();

export const sosSummarySchema = z.object({
  summary: z.string().trim().min(1).max(700),
  facts: z.array(z.string().trim().min(1).max(180)).max(8),
  questionsForVet: z.array(z.string().trim().min(1).max(180)).max(5),
}).strict();

export const recordExplanationSchema = z.object({
  explanation: z.string().trim().min(1).max(700),
  sourceRecordIds: z.array(z.string().uuid()).max(10),
}).strict();

const forbidden = /\b(diagnos(?:e|is|ed|ing)?|prescrib(?:e|ed|ing|tion)|dosage|dose\s+(?:of|is)|medication\s+to\s+give)\b|chẩn đoán|kê đơn|liều dùng|liều thuốc|điều trị bằng thuốc/i;

export function hasForbiddenMedicalInstruction(value: unknown): boolean {
  if (typeof value === "string") return forbidden.test(value);
  if (Array.isArray(value)) return value.some(hasForbiddenMedicalInstruction);
  if (value && typeof value === "object") return Object.values(value).some(hasForbiddenMedicalInstruction);
  return false;
}

export function validateCarePlanDraft<T extends { items: Array<{ taskId: string; order: number }> }>(draft: T, baseline: Array<{ id: string; order: number }>) {
  const expected = new Set(baseline.map((item) => item.id));
  const received = new Set(draft.items.map((item) => item.taskId));
  if (expected.size !== received.size || [...expected].some((id) => !received.has(id))) return false;
  if (hasForbiddenMedicalInstruction(draft)) return false;
  return draft.items.every((item) => {
    const baselineItem = baseline.find((candidate) => candidate.id === item.taskId);
    return baselineItem && item.order >= 0 && item.order <= baseline.length - 1;
  });
}
