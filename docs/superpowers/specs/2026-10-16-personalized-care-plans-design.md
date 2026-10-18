# Personalized Care Plans design

## Intent

Provide a useful, safe care schedule for each pet across 1, 3, 6, and 12 month horizons. Deterministic, vet-reviewed rules define the baseline. AI may help explain and order the same allowed tasks. A veterinarian reviews and approves each version before it is treated as verified guidance.

## Goals

- Generate a deterministic safe baseline using species, breed where a reviewed rule requires it, age, current weight, and existing veterinarian-recorded conditions.
- Cover allowed categories: vaccination, deworming, weight checks, dental care, and diet categories. The rules engine cannot add a diagnosis, medication, dose, or prescription.
- Seed small, clearly fictional demo rules with `is_demo=true` and disabled for production.
- Send only the rule baseline and approved source facts to the shared server-only AI module. AI drafts explanations, wording, and ordering within the baseline's immutable constraints.
- Require clinic vet review, edit, and explicit approval. Track author, reviewer, timestamps, source inputs, rule-set version, prompt/model/run id, and change history.
- Owners can track tasks, reminders, completion, progress, and clear vet-visit flags. Approved plans are labeled “Vet-verified”; drafts are labeled “Draft”.
- Re-plan on new veterinarian-recorded diagnosis/condition, a rule-configured material weight change, and birthday/age milestones defined by reviewed tables.
- Extend the shared AI evaluation suite with at least 40 care-plan cases, including Vietnamese slang/typos, missing data, injection attempts, and prohibited medical content.

## Non-goals

- Diagnosis, prescribing, medication names/dosages, treatment recommendations, or changing rule-determined due dates/urgency using AI.
- An automatically approved or owner-visible-as-verified plan.
- Replacing an existing approved plan before a veterinarian approves its successor.
- Inventing veterinary guidelines, breed risks, life-stage thresholds, vaccine schedules, diet prescriptions, or weight-change thresholds.
- Treating completion reminders as a substitute for a veterinary visit when the rule flags one.

## Constraints and repository context

- Existing app is a Next.js modular monolith with Supabase, RLS, Zod, and vi/en i18n. Current schema only contains basic pets; medical conditions and weights are not yet modeled.
- Care plan logic belongs in `modules/careplans`; AI calls go through `modules/ai` public interface; clinical review is exposed through the clinic workspace public interface; owner plan timeline is in the owner app.
- The shared AI module is specified separately but not yet implemented/approved. This care-plan slice must depend on its approved public contract and must never create its own provider client or key handling.
- Every table must have RLS, every action validates on the server, and all medical facts are sourced from authenticated pet records or vet-reviewed rules.
- Rule tables require reviewer provenance, version, effective dates, activation state, and demo marker. Do not seed purported real clinical recommendations.
- All seed/demo data is fictional and blocked from production reads. Vietnamese is default and all labels/notifications support English.

## Plan lifecycle

States: `draft_rules`, `ai_draft`, `pending_vet_review`, `approved`, `rejected`, `superseded`, `archived`.

1. Owner or vet requests a 1/3/6/12 month plan for a pet.
2. Server loads pet facts and current approved conditions/weight observations, selects the active reviewed rule-set for species/age/horizon, and creates an immutable baseline snapshot.
3. Deterministic rules output task IDs/categories, time windows, required visit flags, and source rule IDs. Unknown/missing essential data yields a clear missing-information state; AI does not guess.
4. AI receives structured baseline plus the minimum allowed context and returns a schema-validated draft for explanations and ordering. It cannot add/remove task IDs, categories, clinical flags, date windows, diagnoses, medicines, dose fields, or recommendations.
5. On AI failure, retain the deterministic baseline and use reviewed standard copy. Care plan generation remains usable without AI.
6. Vet opens the plan in the clinic workspace, sees source facts, rule IDs/version, AI draft, and required visit flags. Vet can edit wording and allowed task windows/categories only within rules; critical rule tasks/flags cannot be removed or weakened.
7. Vet approves or rejects with an audit event. Approval creates a version snapshot. Any subsequent change creates a new version and invalidates prior approval only when the veterinarian explicitly approves the replacement.
8. Owner view shows the current approved version with “Vet-verified” and approval identity/date. A draft may be exposed only when explicitly shared by clinic and is visibly “Draft”; it cannot be confused with verified guidance or trigger official reminders.

## Rules engine contract

- Input: species, optional breed, date of birth/derived age, latest weight and measurement date, active veterinarian-recorded conditions, current vaccination/deworming records, requested horizon, locale.
- Output: stable task identifiers, allowed category, neutral task label key, start/due window, rationale/source rule identifiers, required vet visit boolean, missing input flags, and rule-set version.
- Rules are deterministic and versioned. Selection precedence, overlapping rules, age calculation, local date/time handling, and missing data behavior are documented and tested.
- Allowed categories are a closed enum. `medication`, `dose`, `diagnosis`, `treatment`, or arbitrary free-form task types cannot be emitted.
- A rule may require “vet visit” or “discuss with your vet”; only a vet-reviewed source can create this flag. If a required reviewed rule is absent, return a safe “needs vet review” state instead of inferring guidance.
- Demo rule rows must be visibly labeled demo in all development surfaces and have an environment guard that prevents activation in production.

## AI boundary and validation

- AI output may contain only: localized plan introduction, explanation text attached to existing task IDs, ordering of existing task IDs subject to rule precedence, and plain-language rationale derived from supplied source facts.
- Zod validates the provider response. A second deterministic validator asserts exact task ID set equality, no changed dates/windows/categories/flags, no unsupported medical factual claims, allowed locale, and bounded text lengths.
- Output safety checks reject diagnosis claims, medicines, dosage instructions, prescriptions, treatment directives, invented factual claims, and text that conflicts with a vet-required visit.
- User/clinic free text remains untrusted data and is never merged into system instructions. No model tools or side effects. Provider, timeout, budget, or validation failure discards the AI response and keeps the baseline.
- Every AI call uses the shared AI module and appears in its privacy-minimized `ai_runs` metadata. Plan records store prompt/rule/model provenance without retaining raw private prompts.

## Owner experience

- Plan home supports 1/3/6/12 month views and a chronological timeline grouped into upcoming, due, completed, and needs-vet-visit sections.
- Tasks show plain-language purpose, due window, status, reminder setting, and source/verification state. Completion is owner-reported and labeled as such; it does not create a clinical record or vaccination event.
- Progress is based on eligible tasks in the selected horizon; overdue and vet-visit flags are always visible and never hidden by a progress percentage.
- Reminders use notification preferences and consent, are localized, deduplicated, and link back to the task. No reminder is sent for a draft unless explicitly configured and clearly marked as a draft reminder.
- When a re-plan trigger occurs, show “updated information needs vet review” and preserve the currently approved version until replacement approval.
- Owner can see version history: current verified version, drafts explicitly shared, approval date/reviewer, and a concise change summary. Do not expose clinic-internal comments or prompt content.

## Clinic review experience

- Pending care plans appear in the clinic workspace review queue. The vet sees source data freshness, active conditions, latest weight, rule-set version, required visit flags, and AI-drafted wording beside the deterministic baseline.
- Vet actions: edit allowed wording/order, approve, or reject/request more information. Keyboard-first workflow and clear audit confirmation.
- A clinic staff member without vet capability cannot approve or promote the plan. Server checks role and clinic scope; RLS also enforces pet access grant and clinic relationship.
- Approval stores immutable content snapshot, reviewer, timestamp, version number, signature/provenance metadata, and content hash. Amendments require another review/approval and preserve prior versions.

## Re-plan triggers

- New veterinarian-recorded condition/diagnosis event: queue a new plan draft using the matching reviewed rules; do not infer or broaden the diagnosis.
- New weight observation: compare against species/life-stage-specific thresholds only when present in reviewed rules. Otherwise mark “weight changed; review may be needed” for vet queue without automated clinical inference.
- Birthday/life-stage milestone: trigger when a rule-set explicitly defines the milestone for species (and optional breed); never invent age bands.
- Re-plan requests are idempotent per pet, source event, and rule-set version. A new draft does not replace the approved version until approved.

## Tests and acceptance criteria

- Rule-table tests cover each category, all four horizons, age/breed/weight/condition matching, missing/stale inputs, overlapping rules/precedence, date boundaries, vet-visit flags, and demo rules blocked in production.
- AI output tests cover valid explanations, unknown task ids, added/removed/reordered forbidden tasks, altered due windows, medication/dose/diagnosis injection, Vietnamese slang/typos, prompt injection, and non-AI fallback.
- Approval workflow tests prove only authorized vets can approve, owner sees only approved plan as Vet-verified, explicitly shared drafts are labeled Draft, approval writes provenance, and replacement preserves prior version until new approval.
- Trigger tests cover condition changes, configured material weight change, birthday milestones, missing thresholds, duplicate events, and idempotent plan generation.
- E2E: generate deterministic baseline, AI draft (or deterministic mock), vet edits and approves in clinic workspace, owner sees Vet-verified plan, completes task, and sees progress/reminder state.
- RLS tests prove another owner/clinic cannot read or mutate a plan and clinic without current access cannot review it.
- Extend `modules/ai/evals/care-plan` (or the approved equivalent path) to at least 40 golden cases. The set must include adversarial cases, Vietnamese slang/typos, incomplete profile data, prohibited treatment/dose requests, and rule/AI disagreement. Apply shared AI CI thresholds; every critical safety case must pass.

## Proposed defaults to review

- Existing approved plan remains active until a replacement plan is approved; new triggers only create a pending draft. (The owner has been asked to confirm this behavior.)
- A draft is visible to the owner only if a clinic explicitly shares it, with “Draft” label and no official reminder campaign; otherwise it stays in clinic review queue.
- Weight changes trigger automatic re-planning only when a vet-reviewed rule defines a threshold; otherwise surface a vet review flag.
- If no matching production-reviewed rules exist, do not create a clinically specific plan. Show missing guidance and route to a veterinarian.
- The 40-case evaluation set is care-plan-specific and also conforms to the shared AI module's agreed safety thresholds once that module design is approved.

## Builder check

Self-review: deterministic rules own clinical content and timing; AI can alter only bounded text/order of existing tasks. Vet approval gates owner verification. Prior approvals remain available until replacement approval. Demo rules are non-production. Rule tables are intentionally not populated with invented veterinary advice; production use is gated on reviewer-supplied rules.
