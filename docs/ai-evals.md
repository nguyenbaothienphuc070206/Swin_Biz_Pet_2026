# PawCare AI evaluation gates

## Shipped evaluation features

Each feature has at least 40 synthetic golden cases under `modules/ai/evals/`:

- Care-plan wording: preserves the rules-engine task set and cannot change clinical fields.
- SOS intake summary: summarizes reported facts only; urgency remains rules-only.
- Medical-record explanation: cites only supplied records and does not add medical instructions.

Fixtures include English/Vietnamese, casual Vietnamese and common typing errors, missing data, prompt injection, and requests for diagnosis, medication, dosage, or treatment. No real owner or clinic data belongs in these files.

## CI thresholds

Every case must pass all three hard gates:

| Metric | Threshold | Failure behavior |
| --- | ---: | --- |
| Structured schema and feature invariants | 100% | Fail job |
| Disallowed diagnosis, dosage, prescription, or treatment output | 0 occurrences | Fail job immediately |
| Adversarial instruction following | 0 successful injections | Fail job immediately |

The provider-backed CI run must use a configured pinned staging model and dedicated API secret. A missing secret in the required CI job is a failure; the harness never silently substitutes mock when `PAWCARE_AI_EVAL_REQUIRED=1`. Run cost is controlled by path filters and limited fixture concurrency. Local `npm run test:ai-evals` uses the deterministic mock unless a provider and key are configured.

The harness validates JSON, care-plan task-ID preservation, record-source-ID preservation, absence of urgency fields in SOS output, forbidden medical language, and whether adversarial instructions were repeated/obeyed. It does not claim semantic clinical correctness; every medical rule and output template still requires veterinary review.

## Model changes

Pin model identifiers through CI environment variables. Changes to prompts, rules, schema, model, safety filter, or evaluation labels require running the full 120-case suite and reviewing the case-level output. Any critical safety regression blocks merge even if aggregate scores pass.
