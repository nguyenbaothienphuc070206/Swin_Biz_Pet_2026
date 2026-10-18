# Targeted recommendations and affiliate design

## Intent

Help owners discover a small set of relevant, safe pet products and local spa/shop businesses. Recommendations are personalized from structured pet/product attributes, with safety exclusions taking precedence over relevance, sponsorship, and premium placement.

## Goals

- Fictional demo product catalog with structured species, life stage, ingredients, allergens, and dietary suitability tags. Every demo row is explicitly flagged and cannot appear as real production inventory.
- Recommendation pipeline first applies hard safety filters based on the pet's recorded conditions/allergies and reviewed product metadata, then scores relevance among eligible items.
- Each organic recommendation displays a plain-language “Why this” explanation based on explicit matching attributes.
- Sponsored product placements are unmistakably labeled, separately identified from organic results, and pass the same hard safety filter before display.
- Affiliate outbound links are tracked through a redirect endpoint; clicks write a privacy-minimized event and a sandbox attribution/commission ledger. Every affiliate link displays a disclosure adjacent to the action.
- Focused spa/shop directory supports clearly labeled premium placements and a public page explaining organic ranking and paid placement rules.
- No basket, checkout, generic marketplace, or medical advice is introduced.
- Tests cover safety filtering, explanation generation, and proof that sponsored products never bypass the filters.

## Non-goals

- Diagnosis, therapeutic product selection, prescription/dose recommendations, or a claim that PawCare endorses a product's medical efficacy.
- A general ecommerce marketplace, checkout, shipping, inventory, or payment processing.
- Sponsored/premium placements changing organic relevance scores or bypassing safety rules.
- Real affiliate payments or commission settlement in demo/sandbox mode.
- Treating absent product data as proof of safety.

## Constraints and current repository context

- Existing schema contains no catalog, affiliate click, spa/shop listing, or placement tables. Add versioned migrations, RLS, typed database definitions, and module boundaries before wiring screens.
- Use modular monolith domains: `commerce` owns catalog/recommendation/affiliate; `clinics` or a public local-directory module owns spa/shop listings and placement; no cross-module private imports.
- Every table has RLS; server actions/routes use Zod and server-side authorization. Public visitors only see published public listing/product fields, not owner click identities or commission records.
- Product and service demo fixtures must carry `is_demo=true`; demo fixtures are isolated to dev/evaluation and are never mixed into production query paths.
- No third-party catalog, affiliate network, payment provider, or data source is selected. Adapter interfaces and sandbox ledger remain local until a vendor is explicitly approved.
- Vietnamese is default, English is available, all strings localized, and recommendations explain data matches without making health/treatment claims.

## Owner experience

1. Owner chooses a pet or enters from its profile. Recommendations use only the minimum structured attributes needed and do not send private medical notes to affiliate partners.
2. Apply hard safety exclusions before any ranking or sponsorship selection:
   - Exclude any item whose explicit allergen/ingredient conflicts with a recorded pet allergy.
   - Exclude items explicitly marked unsuitable for a recorded condition by a reviewed safety rule (for example, a diabetic condition and a product marked unsuitable for that condition).
   - Exclude items with missing, conflicting, or unreviewed ingredient/allergen/suitability data when relevant to a known allergy or condition.
   - Unknown condition/product compatibility is not presented as safe. If no safe products remain, explain that and recommend asking the veterinarian rather than weakening filters.
3. Score only the remaining eligible organic items using documented tag matching, species/life-stage match, owner preference, availability freshness, and transparent tie-breaks. Do not include commission or sponsorship in organic relevance score.
4. Display “Why this” from the exact matched attributes (e.g. “matches your selected life stage” or “made for cats”). Each explanation is generated from deterministic structured data, not AI free text. Avoid wording like “treats”, “prevents”, “vet recommended” unless supported and explicitly approved.
5. Sponsored product area is separate from organic results and labeled “Sponsored”. Sponsorship only chooses among already-safe eligible items; it cannot change filter outcome or imply medical suitability.
6. Affiliate click opens a disclosure adjacent to the link before navigation. Click action routes through a server redirect that records the click event, then redirects to the configured destination. No raw condition/allergy payload or pet identifier is passed to affiliate URL.

## Safety and relevance model

- Product safety metadata is structured and provenance-aware: ingredient list, allergen tags, species, life-stage, dietary suitability tags, condition exclusions, reviewer/source, review state, and last-reviewed date.
- Condition compatibility rules require qualified review and versioning. Do not seed real medical contraindications from assistant-created content. Fictional demo products/rules are synthetic, disabled outside demo, and visibly labeled.
- Product publication requires required safety metadata and review status. Missing/expired relevant metadata fails closed for affected pets.
- Filter function is pure/deterministic and runs before ranking, sponsor selection, cached results, and rendering. Query parameters and client-supplied sponsor flags cannot bypass it.
- Every returned recommendation includes eligibility trace (`eligible`, matched tags, filtered reason categories) for internal audit/tests. Owner sees a concise reason, not hidden safety internals.
- A product that is safe but has low relevance may rank lower; an unsafe or unknown product never ranks at all.

## Affiliate links and sandbox attribution

- Store destination URLs in a server-controlled allowlisted link table, linked to product and affiliate program id. Validate scheme/host and reject open redirects.
- Outbound route accepts opaque link id, writes a click event with timestamp, product/link, locale, coarse campaign/source, and a pseudonymous/consented attribution key where required, then redirects only to the stored approved destination.
- Click logs must not include allergy, condition, medical record, exact location, or raw user text. Prefer short-lived first-party attribution token; honor consent/opt-out rules applicable to analytics/affiliate attribution.
- Sandbox ledger records fictional click/conversion events and calculated commission with `is_sandbox=true`. It cannot generate payment instructions, external payouts, or be confused with payable production ledger entries.
- Commission reporting exposes only authorized platform users and is clearly labeled sandbox until a real affiliate agreement/provider is approved.
- Affiliate disclosure appears next to every outbound product link and in localized landing/context copy. Do not rely on footer-only disclosure.

## Spa and shop directory / premium placement

- This is a curated local directory for pet spas and pet shops, not a product checkout marketplace.
- Public listing includes business type, location/service area, services, hours, languages, contact/directions, verified/publication state, and sponsored/premium status where applicable.
- Organic directory ordering uses documented match/distance/service fit and stable deterministic tie-breaks; paid premium placement is shown in a distinct section or clearly marked card position.
- Paid placement never masquerades as organic ranking. Public “How listings are ranked” page explains organic signals and exactly how premium placement appears.
- Premium placement configuration, duration, payer, approval, and display impressions are auditable. No ad is shown as a health or veterinary endorsement.
- Fictional spa/shop seed rows carry `is_demo=true` and a visible demo marker in demo mode.

## Data and privacy

- Product catalog, safety metadata, recommendation impression, affiliate links, click logs, sandbox attribution ledger, spa/shop listings, and premium placements are separate entities with least-privilege access.
- Owner profile pages never expose raw affiliate click log data. Platform finance/admin reporting does not expose medical conditions or allergies.
- Recommendation service may read pet attributes under owner authorization; it returns only eligible product ids and explanation tags. It does not persist a copy of the full medical record.
- Apply retention limits and consent for click attribution; anonymize/delete identifiers when no longer needed while preserving aggregate sandbox reporting.
- Add legal open questions for affiliate disclosures, click attribution/cookies, recommendation claims, product safety representation, sponsored placement, and business listing verification.

## UX and accessibility

- Calm editorial product cards with concise attribute chips, separate Sponsored badge, visible affiliate disclosure, and short “Why this” explanation.
- If safety data is incomplete, show a clear safe-empty state and route to vet discussion; never fill the space with sponsored unsafe results.
- Directory separates local spa/shop search from product recommendations; no cart icon or marketplace checkout affordance.
- All labels, disclosures, and reasons are Vietnamese-first with English translation; accessible focus/keyboard support and mobile layout.
- Loading/empty/error states and broken affiliate-link recovery are included. Failed redirect logging does not silently send a user to an unverified destination.

## Tests and acceptance criteria

- Unit tests prove allergy ingredient conflict excludes product, condition exclusion excludes product, incomplete/conflicting relevant metadata fails closed, irrelevant missing metadata does not invent a medical claim, and eligible products survive.
- “Why this” test asserts explanation derives only from actual structured matches and cannot claim a treatment/health benefit.
- Sponsored bypass test generates sponsored candidates across safe/unsafe/missing-metadata cases and asserts the safety filter runs first and all excluded candidates remain excluded.
- Property/table tests prove ordering of filters is invariant to sponsor rank, commission amount, and client-provided flags.
- Affiliate redirect tests cover allowlisted destinations, invalid/open redirect attempts, disclosure rendering, click event minimization, and sandbox flagging/no payout.
- Directory tests prove premium placements are clearly labeled/separated and cannot silently rewrite organic score; public ranking page matches configured scoring.
- RLS tests cover public published read, owner data isolation, affiliate admin/finance reporting restrictions, and demo rows excluded in production mode.
- E2E covers pet-specific recommendation, “Why this”, adjacent affiliate disclosure, sponsored eligible result, product excluded by allergy/condition, and spa/shop ranking explanation.

## Proposed defaults to review

- Unknown or conflicting safety metadata excludes an item whenever the pet has a relevant recorded allergy/condition; no “probably safe” caveat path.
- A recorded allergy/condition is only as current as its owner/vet record; if the data source is stale or access is unavailable, do not make health-suitability claims and prefer the safe-empty explanation.
- Organic relevance never uses affiliate commission; sponsored inventory is separately labeled and filtered for safety first.
- Premium spa/shop listing appears in a distinct labeled “Premium placement” area and does not alter organic order.
- All click attribution and commission ledger rows remain sandbox until a real partner contract and approved integration exist.

## Builder check

Self-review: safety filtering is a hard, deterministic precondition across organic and sponsored candidates. Explanations are data-derived and non-medical. Affiliate tracking stores no pet health attributes and uses allowlisted redirects. Directory premium placement is visible and transparent. Unknown clinical suitability fails closed; no product safety advice or commission rates are invented.
