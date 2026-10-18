# Shared AI module design

## Intent

Provide one server-only AI gateway for PawCare so every feature gets the same provider isolation, validation, safety controls, budgets, logs, and non-AI fallback. Rules remain authoritative; AI may draft or explain; a vet verifies anything medical before it becomes official.

## Goals

- A shared `modules/ai` boundary used by every AI-facing feature; no provider SDK or credentials in browser code.
- A provider adapter contract, two real provider implementations, and a deterministic mock for tests/demo.
- Zod-validated inputs and structured outputs, versioned prompt templates stored in the repository, timeout/retry/circuit breaker, per-user and per-day budgets, and safe caching only where inputs/outputs permit it.
- Every attempt writes a privacy-minimized `ai_runs` record: feature/template version, provider/model, redacted input representation or its safe summary, latency, reported usage/cost when available, outcome, and fallback status.
- Treat all owner/clinic supplied text as untrusted data. Keep it in a distinct data payload, never concatenate it into system/developer instructions, never enable tools, and never perform side effects based on model output.
- Output schemas and post-generation filters reject diagnosis claims, dosage instructions, prescription language, and unsupported treatment recommendations. Any error or rejected output returns the feature's non-AI fallback.
- A CI evaluation harness with at least 40 versioned golden cases per shipped AI feature, including adversarial prompt injection, Vietnamese slang, misspellings, and ambiguous inputs. Quality/safety thresholds are explicit and failing thresholds fail CI.

## Scope and feature inventory (proposed v1)

The repository currently has no shipped AI screens or AI database schema; product docs identify vet-verified AI care plans as the main AI module. Proposed v1 evaluation features are:

1. **Care plan draft**: transform structured, owner-provided care goals and vet-approved facts into a non-diagnostic draft for vet review. AI cannot create a prescription or change rule-computed schedule/urgency.
2. **Medical-record explanation**: explain an existing record in plain Vietnamese/English without adding facts, diagnosis, dose, or treatment advice.
3. **SOS fact summary for clinic staff**: compress owner-entered symptoms/context into a factual summary for a vet. Rules determine routing and urgency; AI must not triage, prioritize, or advise treatment.

All outputs are clearly labeled as AI drafts, linked to their provenance, and cannot be shown as official medical advice until a vet reviews them. If a feature is not enabled in a given environment, its regular non-AI path remains available.

## Non-goals

- Autonomous diagnosis, prescription, dosage selection, treatment, urgency setting, clinic selection, or message sending.
- Model-generated SQL, tool/function calls, browsing, external actions, or autonomous agent loops.
- Using user/pet data for model training or cross-user personalization.
- Caching personal medical prompts or generated medical content across users.
- Replacing deterministic care rules, clinician judgment, or the fallback UI.

## Constraints and proposed implementation choices

- Follow Next.js App Router and modular monolith conventions; feature modules call the public AI module interface only.
- Proposed real providers: OpenAI and Anthropic behind isolated adapters. These are new external vendors and require owner approval before adding SDKs, credentials, or calls. Mock mode must work without secrets or network access.
- Provider model IDs are environment-configured and pinned per environment; do not hard-code assumed current model names or prices. Verify official API docs before implementation and record exact supported structured-output behavior in `docs/integrations.md`.
- The adapter receives a fixed request envelope (template id/version, validated feature input, output JSON schema, timeout, request id) and returns normalized structured output plus usage metadata. Provider errors normalize to a small internal error union.
- Use Zod as the source for both input/output validation; provider JSON/structured output is still parsed and validated locally.
- The circuit breaker is isolated per provider/model and resets only after a bounded cooldown and successful probe. Retry only transient network/rate/server failures, with bounded attempts and jitter; do not retry safety rejection or validation failures.
- Budgets use an atomic daily usage reservation keyed by user and UTC date, with an optional global daily ceiling. Reserve estimated units before the call, reconcile provider usage afterward, and fail closed to fallback if budget reservation fails.
- Cache is disabled for pet, owner, clinic, SOS, or free-text medical content. Cache may be enabled only for explicitly reviewed, non-personal deterministic reference explanations; keys include template version, model, locale, and normalized input hash, with short TTL.
- Prompt templates are immutable versioned files with locale and feature schemas; changes require corresponding golden-set/eval updates. User text is serialized into a separate untrusted-data field and explicitly quoted as data in the template.
- `ai_runs` stores no raw prompt. Store scrubbed/minimized input fields or categorical features sufficient for audit, scrubbed output only when safe, and a content hash for traceability. No name, email, phone, address, pet name, microchip, document, or raw SOS narrative is retained. Restrict read access to platform-admin/audit roles; owner-facing UI may show their own run metadata without prompt text.
- Output policy is schema-first. Feature schemas permit only appropriate fields (e.g. summary, cited source record IDs, questions for vet, draft suggestions); no free-form action field. A deterministic Vietnamese/English safety scanner blocks disallowed claims; uncertainty or scanner errors reject output.
- No provider tools are registered. Provider response text is never interpreted as an instruction to call another system.

## Safety and fallback behavior

1. Caller authorizes user and feature, validates input, strips/limits untrusted text, and computes a redacted audit envelope.
2. Apply daily budget and rate limits. If denied, return the feature's normal non-AI behavior and log the budget outcome.
3. Load the pinned template. Send trusted instructions separately from serialized untrusted data; output contract forbids medical directives.
4. Call adapter with timeout and bounded retry. Do not pass tools or side-effect capabilities.
5. Parse and validate structured output with Zod; run the deterministic policy filter and feature-specific provenance checks.
6. On timeout, provider failure, malformed output, injection indicator, forbidden claim, or audit-write failure, discard the generated output and use the non-AI path. Never show partial unsafe text.
7. Persist outcome/latency/model/usage with minimal redacted metadata. If logging fails, fail closed to fallback.
8. Mark successful medical output as `draft_pending_vet_review`; only an authorized vet can promote it to reviewed/official status, with a review audit event.

## CI evaluation design

- Keep at least 40 golden cases per enabled feature under `modules/ai/evals/<feature>/`; each case has stable id, locale, input class, expected safety labels, expected source grounding, and adversarial flag.
- Run deterministic unit and contract checks on every PR. Run provider-backed quality evaluation against the pinned staging model in CI using dedicated secrets; missing credentials or unavailable evaluation run is a CI failure for AI module/prompt changes, not a silent skip.
- Evaluation output is schema-validated. Human-authored rubric labels are versioned and reviewable; scoring is deterministic where possible and uses a constrained judge only for semantic criteria, with judge result retained in CI artifacts only.
- Proposed initial gates (must be ratified in `docs/ai-evals.md`): 100% valid schema; 100% no forbidden diagnosis/dosage/prescription claims; 100% adversarial cases ignored as instructions with no tool/side effect; >=95% factual/source grounding; >=90% task relevance and correct locale; 0 critical safety regressions. Any safety regression fails CI regardless of aggregate score.
- Pin model identifiers and evaluation-set version in CI; compare against the last approved baseline and require manual review for material regressions. Do not put personal production data in eval fixtures.
- Minimum set size is 40 per feature, but quality is measured by stratified scenarios rather than passing one aggregate rate; all critical adversarial/safety cases must pass.

## Tests and acceptance criteria

- Unit tests: each adapter normalization, deterministic mock outputs, timeout/retry, circuit breaker, budget race, cache exclusion for sensitive inputs, Zod rejection, output safety filter, template version selection, fallback on every failure class, and redaction fixtures.
- Security tests assert provider adapter cannot be imported by client bundles; no provider key reaches client; no tools/side effects are invoked; injected user/clinic strings remain data and cannot override system policy.
- Database tests assert `ai_runs` RLS, sensitive field minimization, budget reservation atomicity, and immutable audit metadata where required.
- CI evaluates >=40 golden cases per enabled feature and fails build on any safety threshold breach or quality score under the documented threshold.
- Feature integration tests prove careplan/record explanation/SOS summary use the shared AI module and still render a useful non-AI fallback with provider disabled.
- Vet review workflow records reviewer, timestamp, source run id, and accepted/edited/rejected outcome; unreviewed draft cannot be represented as approved care guidance.

## Open calls for approval

- Provider vendor approval: proposed OpenAI and Anthropic adapters. No SDK/dependency or live calls until approved and official docs are verified.
- Feature set: proposed care plan draft, medical-record explanation, and factual SOS summary; SOS urgency/routing remain rules-only.
- CI cost and secrets: provider-backed evaluations on every AI/prompt PR require dedicated staging credentials and incur provider usage. The request implies this gate; confirm whether that operational cost is acceptable.
- Privacy/legal review: confirm whether even scrubbed model input/output summaries and provider processing meet the organization's retention and data-transfer requirements; keep related legal questions in `docs/legal-open-questions.md` without answering them.
- Evaluation thresholds above are proposed starting values, not agreed values until approved.

## Builder check

Self-review: one server-only gateway owns provider selection, budgets, caching, validation, safety, and audit. The model has no tools or side effects. Failure always drops to a non-AI path; vet review gates official medical output. CI thresholds are explicit and adversarial cases are mandatory. Vendor choice, feature inventory, and provider-eval cost remain clear approval decisions.
