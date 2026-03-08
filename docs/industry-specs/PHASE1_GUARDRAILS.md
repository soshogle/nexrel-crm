# Phase 1 Guardrails (Must Hold)

These guardrails are mandatory for all upcoming phases.

## 1) Data Preservation Contract

- No destructive operations on existing customer records.
- No deletion/replacement of existing AI employee rows, workflow rows, or user settings.
- Only additive and idempotent updates are allowed.
- Existing IDs must remain stable (agent IDs, workflow IDs, task IDs).
- Existing user-visible state must remain readable by current code paths.
- If a migration is needed later, it must support rollback and dry-run mode first.

## 2) UI/UX Freeze Contract

- No visual redesign of existing pages.
- No layout or navigation changes for currently shipped tabs/pages.
- No behavior changes to existing button flows unless required for correctness.
- Industry-specific improvements must be content/config driven first.

## 3) Real Estate Isolation Contract

- Keep `REAL_ESTATE` as-is.
- Do not route `REAL_ESTATE` into the generic industry config/registry path.
- Keep existing RE workflows, RE team, and RE tooling untouched.
- Any refactor must explicitly preserve RE special handling.

## 4) Orthodontist Special Contract

- Orthodontist remains a unique industry experience (pages and tools).
- Preserve mock data behavior for users that already have orthodontist mock data enabled/populated.
- Do not delete, rename, or invalidate existing orthodontist mock data records.
- Any orthodontist tool changes must be backward-compatible with current mock-data users.

## 5) Rollout Safety Contract

- Phase changes must be incremental and testable in isolation.
- Feature-flag or fallback strategy required when changing runtime behavior.
- If validation fails, system must fall back to existing behavior without data loss.

## Validation Checklist (Run Each Phase)

- Existing users can still load dashboards and tabs.
- Existing AI employees still resolve and run.
- Existing workflows still load and execute.
- RE users remain on RE paths.
- Orthodontist users with mock data still see and use their existing data.
