# Local main reconciliation and release

Status: `ready_for_release`

Owner: Main coordinating FDE, Coder and Tester

Date: 2026-07-15

## Objective

Reconcile the dirty local `main` with the five billing commits already present on `origin/main`, preserve only valid local-only work, verify the resulting release candidate, and confirm the GitHub-triggered Vercel deployment.

## Observed context

- Local HEAD was `5222c95`; remote HEAD was merge commit `2967954` from PR #1.
- Most locally modified files were byte-identical to the remote billing candidate.
- Local billing lifecycle/configuration and SQL-route variants predated remote fixes and were rejected to avoid regressions.
- The valid local-only delta is the secret-free Stripe environment contract in `.env.example` plus this reconciliation record.
- Production remained on `5222c95` after `2967954` was rate-limited by Vercel.

## Scope and non-goals

- In scope: Git reconciliation, focused configuration/documentation delta, automated tests/builds, push, deployment observation and smoke.
- Out of scope: new Stripe catalog mutations, live charges, destructive database work or secret rotation.

## Requirements and acceptance

- `AC-SYNC-001`: no verified remote billing fix is overwritten by an older local variant.
- `AC-SYNC-002`: valid local-only documentation/configuration is committed; obsolete and duplicate local deltas stay out.
- `AC-SYNC-003`: the final local branch equals the pushed GitHub branch.
- `AC-SYNC-004`: billing/backend tests and production builds pass at the final SHA.
- `AC-SYNC-005`: the Vercel deployment for the final Git SHA is Ready and the production app responds successfully.

## FDE delta decision

- Keep `.env.example` as a secret-free operational contract and keep this current reconciliation plan.
- Do not ship `docs/engineering/netolabs-stripe-link-plan.md` unchanged because its pending/commercial state is obsolete.
- Prefer every remote lifecycle, entitlement, Stripe configuration and SQL route variant; they contain verified fixes absent from the dirty local copies.
- Treat byte-identical local files as already committed, not as a new delta.

## Ordered steps

1. `completed` — audit GitHub PR/checks and Vercel deployments.
2. `completed` — preserve the dirty local state in a recoverable stash.
3. `completed` — reconcile against `origin/main` in a clean release worktree because the vault filesystem blocked Git `mmap` reads.
4. `completed` — retain only `.env.example` and this plan as the new delta.
5. `completed_with_preexisting_gap` — billing tests passed 3/3, backend passed 41/41, extension and web/backend production builds passed. The root suite passed 33/34 after the required extension build; its only failure is the pre-existing `app/session-store.js -> require('./db')` missing-module defect, outside this environment/docs-only delta. Independent Tester status is `ready`, with no P0/P1 and the root gap classified as P2 follow-up.
6. `pending_external` — push the verified commit and confirm Vercel production deployments and HTTP smoke in the run record.

## Verification and rollback

- Verify with scoped Git diff, root and backend tests, web/backend production builds, GitHub checks, Vercel deployment status and HTTP smoke.
- Root-suite risk is explicit rather than waived: `test/session-store.test.js` cannot load the repository's missing `app/db.js`; the final delta does not touch that path.
- Original dirty state remains recoverable in stash object `3e18cb04d00cba524da402da5a66b7fc5b7d1570` until the final release is confirmed.
- If verification fails, do not push; the release worktree can be discarded without affecting the canonical repository or provider state.

## Risks and next owner

- Main risk avoided: local older billing files would undo PostgreSQL and flexible-cancellation fixes already verified remotely.
- Tester independently decides `ready | conditional | blocked`; Main owns push/deploy confirmation.
