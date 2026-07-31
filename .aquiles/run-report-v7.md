# Aquiles run: Voxa progressive AI report

## Control metadata

| Field | Value |
| --- | --- |
| Run ID | `VOXA-FEATURE-2026-07-31-REPORT-V7` |
| Request class | `feature` |
| Started | 2026-07-31 |
| Status | `in_progress` |
| Current phase | `BUILD` |
| Current owner | `Main / CODER` |
| Workspace | `/Users/luizneto/aquiles/voxa` |

## Objective and authority

- Objective: ship the approved v7 progressive report contract, compact information architecture, inline evidence disclosures, compatible v6 reads, and matching web/Electron PDF exports.
- Authority: the user explicitly requested implementation of the approved plan.
- Local write scope: analysis contract/prompt/sanitizer/evals, report UI/styles/i18n/fixture, both PDF exporters, and related tests.
- Exclusions: database migration, deployment, commit, push, dependencies, and unrelated pronunciation work already present in the tree.

## Success contract

| ID | Observable outcome | Status |
| --- | --- | --- |
| AC-001 | New analyses use contract `7.0` without `executiveBrief`, `keyPoints`, or `criticalFindings` in `summary` | `in_progress` |
| AC-002 | Saved v6 reports normalize to the v7 presentation without data migration | `in_progress` |
| AC-003 | Initial report shows compact summary and closed detail groups | `in_progress` |
| AC-004 | Evidence expands inline and no screen catalog jump remains | `in_progress` |
| AC-005 | Web and Electron PDFs share the new hierarchy and deduplicated evidence appendix | `in_progress` |
| AC-006 | Focused tests, builds, responsive render, keyboard/focus, and PDF checks pass | `in_progress` |

## Decisions

- Visual thesis: an editorial decision brief first, with evidence and specialist depth available progressively.
- Preserve the existing citation catalog in data; remove it only from the main on-screen reading flow.
- Keep recommendation and transcript commitment semantics separate.
- Normalize at read/render boundaries; do not rewrite stored reports.

## Verification ledger

| ID | Method | Result |
| --- | --- | --- |
| V-001 | Backend focused and full tests | pending |
| V-002 | Root report/export tests | pending |
| V-003 | Frontend and backend builds | pending |
| V-004 | Desktop/mobile rendered fixture and interaction smoke | pending |
| V-005 | Generated PDF inspection | pending |

## Residual risks

- The worktree contains unrelated in-progress pronunciation/filler changes in shared files; implementation must preserve them.
