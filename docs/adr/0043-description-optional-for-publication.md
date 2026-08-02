# 0043. A description is no longer a publication requirement

Date: 2026-08-02 · Status: Accepted · Amends: 0031

## Context

ADR 0031 gated publication on six readiness facts, one of which was a
non-empty storefront description. The storefront info form has always
marked the description as optional, so the field was "optional to save,
mandatory to go live" — a rule vendors only discovered at the end of
onboarding. A storefront without a description is still presentable: the
customer page hides the description section when it is empty and the
social-card metadata falls back to a generated description.

## Decision

- **Drop `description` from `StorefrontPublication`'s readiness check.**
  `missing` is now `[title, cover, catalogue, schedule, url]`. Title, cover,
  ≥1 dish, ≥1 schedule and an assigned subdomain remain required.

- **Remove the supporting queries that existed only for the gate**:
  `Storefront.hasDescription()` and `StorefrontDescription.hasContent()`
  (added by ADR 0031 precisely because the VO allows empty). The aggregate
  no longer stores the description at all — no behaviour reads it.

- **The vendor dashboard keeps description as a non-gating nudge, and phone
  joins it.** The storefront setup step is done once name + photo are set;
  unset optional fields surface as `Optionnel(s) : …` in the step detail
  rather than blocking the Publier button. This keeps the dashboard's
  mirror of readiness aligned with the domain gate.

## Consequences

- A storefront can now be published, and remain published, with no
  description and no phone — "description is never required" holds across
  the whole lifecycle instead of only outside the publish instant.
- The customer frontend already handles the empty case (conditional
  section, metadata fallback); no changes needed there.
- ADR 0031's readiness table and ADR 0032's `missing` list are amended
  accordingly; the readiness-as-domain-service shape is unchanged.
