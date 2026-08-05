# Aquiles run: Voxa

> Append-oriented control plane for this product run. Preserve failed attempts and corrections. Link direct evidence; never backfill unobserved success.

## Control metadata

| Field | Value |
| --- | --- |
| Run ID | `VOXA-RELIABILITY-2026-08-05-001` |
| Request class | `incident_and_feature` |
| Started | 2026-08-05T17:49:32-03:00 |
| Last updated | 2026-08-05T18:16:00-03:00 |
| Status | `complete` |
| Phase ceiling | `VERIFY` |
| Current phase | `VERIFY` |
| Current gate | `ready_local_candidate` |
| Current owner | `TESTER` |
| Next owner | `Main` |
| Workspace | /Users/luizneto/aquiles/voxa |
| Repository / branch | `luizvb/voxa` / `main` |
| Source commit | `working_tree_at_intake` |

Allowed run status: `in_progress`, `blocked`, `complete`, `cancelled`. A phase ceiling is a hard stop; scaffolding later templates does not authorize filling or executing them.

## Original request

Preserve recordings locally before upload, support retry after auth/network failure, and import recovered WebM audio

## Interpreted outcome and boundaries

- User-visible outcome: a finished recording is protected locally before cloud work; transient auth/network failures expose a retryable recovery item; users can import a recovered WebM audio file.
- Business outcome: remove the credible data-loss path from long recordings and restore trust in the primary capture journey.
- Deliverable: IndexedDB recovery store, idempotent/resumable upload path, bounded auth retry, recovery UI, manual audio import, validation.
- Explicit exclusions: production deploy, push/commit, background sync after the browser is closed, cross-device local recovery, server-side transcoding.
- Constraints: preserve unrelated dirty worktree changes; do not retain local audio after cloud persistence is confirmed; do not expose auth tokens; reuse the existing Vercel Blob dependency and product UI patterns.
- Deadline or review window: current task.
- Open interpretation questions: none blocking; local drafts remain on the current browser profile until upload success or explicit deletion.

## Success contract

| ID | Outcome or gate | Measure / observable proof | Target | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| SC-001 | Finished audio is durable before auth/upload | IndexedDB write completes before the first session or upload request | web recorder | FDE | `passed` |
| SC-002 | Auth/network failure is recoverable | same draft remains locally and can retry without re-recording | workspace recovery state | TESTER | `passed` |
| SC-003 | Recovered WebM can enter the library | file import uses the same local-first upload pipeline | library import dialog | TESTER | `passed` |
| SC-004 | Retry is idempotent across partial cloud success | persisted Blob URL skips duplicate binary upload and metadata upsert is owner scoped | web/backend contract | TESTER | `passed` |

Allowed status: `not_started`, `in_progress`, `passed`, `failed`, `not_applicable`, `accepted_risk`.

## Phase plan

| Phase | Entry condition | Required artifact / evidence | Exit decision | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| INTAKE | Request received | interpreted outcome and ceiling | request classified | Main | `in_progress` |
| ACCESS_PREFLIGHT | Workspace known | access and authorization matrices | safe mutation envelope known | Main | `not_started` |
| DISCOVER | Research authorized | opportunity memo | `go/change/stop` | PRODUCT | `not_started` |
| PRODUCT_BET | Problem evidence sufficient | product brief | falsifiable bet approved | PRODUCT | `not_started` |
| FDE_CONTRACT | Bet approved | FDE contract | behavior executable without guessing | FDE | `passed` |
| DESIGN_CONTRACT | Experience work applies | design contract | critical states specified | DESIGN | `passed` |
| ENGINEERING_PLAN | Contracts stable | engineering plan | implementation and rollback ready | CODER | `passed` |
| BUILD | plan approved | code, migrations, developer tests | candidate built | CODER | `passed` |
| VERIFY | candidate identified | independent test report | `ready/conditional/blocked` | TESTER | `passed` |
| CONVERSION_REVIEW | candidate changes a user decision moment | independent conversion review | `ready/conditional/blocked` | MARKETING | `not_started` |
| LAUNCH_PLAN | claims can be grounded | launch plan | launch experiment approved | MARKETING | `not_started` |
| RELEASE_PREFLIGHT | tester permits release | immutable release candidate and authorization | release authorized | Main | `not_started` |
| GIT_PUBLISH | GitHub mutation authorized | remote SHA and URL | intended commit published | Main | `not_started` |
| VERCEL_DEPLOY | deployment authorized | deployment ID and URL | intended candidate deployed | Main | `not_started` |
| PRODUCTION_VERIFY | deployment reachable | HTTP/browser/telemetry evidence | production verified or rolled back | TESTER | `not_started` |
| LEARN | production signal exists | baseline, result, next experiment | learning recorded | PRODUCT | `not_started` |

## Authorization matrix

Authentication proves access, not authority. Quote the active user request or link the approval event. Recheck immediately before remote mutation.

| Capability | State | Scope / target | Evidence | Confirmed at | Expires / revoke condition |
| --- | --- | --- | --- | --- | --- |
| Local edits | `authorized` | /Users/luizneto/aquiles/voxa, recording recovery slice | user: “Vê o melhor e aplica aí” | 2026-08-05 | request complete or scope changes |
| Commit | `unknown` | repository / branch | | | |
| Create remote | `unknown` | owner / name / visibility | | | |
| Push | `unknown` | remote / branch | | | |
| Preview deploy | `unknown` | team / project | | | |
| Production deploy | `unknown` | team / project / domain | | | |
| Domain or DNS change | `unknown` | domain / records | | | |
| Environment variable change | `unknown` | project / environment / variable names | | | |
| Destructive or billing change | `unknown` | exact operation | | | |

Allowed state: `unknown`, `authorized`, `denied`, `not_applicable`, `expired`.

## Technical access matrix

Never record token values, `.env` contents, cookies, customer data, or private keys.

| Surface | Account / scope | Target | Read access | Write access observed | Intended mutation | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Local Git | local user | `/Users/luizneto/aquiles/voxa`, dirty with three unrelated files | yes | local edits | isolated recording reliability delta | `git status --short --branch` |
| GitHub | | | | | | |
| Vercel | | | | | | |
| Database / auth | | | | | | |
| Analytics / observability | | | | | | |
| Taste Skill | installed | operational recovery/import UI, no visual redesign | yes | not applicable | not invoked | Aquiles preflight; existing UI patterns are authoritative |

## Evidence ledger

| ID | Claim / question | Class | Source and locator | Observed at | Confidence | Supports / contradicts | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E-001 | A 52-minute recording remained only in React memory after auth timed out before upload | `observed` | production tab console and live blob inspection, 2026-08-05 | 2026-08-05 | `high` | SC-001/SC-002 | 3,068 chunks / 50,426,890 bytes were manually recovered |
| E-002 | `WebPlatform.saveRecording` requests session credentials before starting Vercel Blob upload | `observed` | `src/platform/web-platform.ts` | 2026-08-05 | `high` | SC-001 | current ordering creates the failure window |
| E-003 | Recorder chunks are cleared only on the next recording and are not durable across reload/navigation | `observed` | `src/hooks/useRecorder.ts` | 2026-08-05 | `high` | SC-001/SC-002 | current workaround depends on keeping the tab alive |
| E-004 | Backend supports multipart client upload up to 1 GiB but the UI imports transcripts only | `observed` | `backend/src/controllers/recordings.ts`, `src/components/HistoryView.tsx` | 2026-08-05 | `high` | SC-003 | reuse existing dependency and endpoint |

Evidence classes: `observed`, `user_stated`, `source_grounded`, `inferred`, `unverified`. Confidence: `high`, `medium`, `low`; confidence does not replace source quality.

## Assumption register

| ID | Assumption | Why it matters | Validation method | Threshold | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| A-001 | IndexedDB Blob storage is available in supported Chromium browsers | required for durable local-first behavior | runtime feature detection plus failure state | unsupported/quota failure must block upload and keep an in-memory download path | FDE | `supported` |

Allowed status: `open`, `supported`, `refuted`, `accepted_risk`, `superseded`.

## Decision log

| ID | Date | Owner | Decision | Options considered | Evidence / rationale | Consequences | Reversible | Supersedes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D-001 | 2026-08-05 | FDE | Persist locally before any auth or network dependency | memory-only, automatic download, IndexedDB local-first | browser downloads require user action; IndexedDB preserves the same Blob without external transmission | recovery survives transient auth/network failure and reload | `yes` | |
| D-002 | 2026-08-05 | CODER | Reuse one stable recording ID and persist the uploaded Blob URL before metadata creation | always re-upload, server proxy upload, resumable local draft | avoids duplicate 50 MB uploads after partial success and keeps existing client upload architecture | retry becomes idempotent at application level | `yes` | |

## Risk register

| ID | Risk | Trigger / early signal | Likelihood | Impact | Mitigation | Contingency | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Browser quota/private mode prevents local persistence | IndexedDB write rejects | low | high | fail before cloud work and retain an explicit downloadable in-memory copy | user downloads/imports manually | CODER | `mitigated` |
| R-002 | User accumulates abandoned local drafts | storage usage grows | medium | medium | list size/date, explicit delete, remove automatically after confirmed cloud save | recovery UI cleanup | DESIGN | `mitigated` |
| R-003 | Upload succeeds but metadata request fails | Blob URL exists without library row | low | high | persist Blob URL locally and retry metadata only | owner-scoped idempotent metadata upsert | CODER | `mitigated` |

## Contract traceability

| Bet / evidence | Requirement | Acceptance | Design state | Implementation | Test evidence | Release evidence |
| --- | --- | --- | --- | --- | --- | --- |
| E-001/E-002 | FR-001 local-first save | AC-001 no auth call precedes durable write | workspace local-copy status | recording recovery store + WebPlatform orchestration | V-001/V-002 | not requested |
| E-001/E-003 | FR-002 recover/retry | AC-002 draft survives failure and reload | recovery panel with retry/download/delete | IndexedDB draft + recovery workspace, including unauthenticated reload | V-002/V-005 | not requested |
| E-004 | FR-003 import audio | AC-003 valid WebM enters library through same pipeline | import dialog audio mode | `AudioImportDialog` + platform import pipeline | V-002/V-005 | not requested |

## Real handoffs

Record only handoffs that actually occurred. A role change by the same agent is a state transition, not a delegation.

| At | From -> to | Objective | Inputs / grounding | Done when | Returned status | Artifacts / evidence | Risks / next owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Verification ledger

| ID | Gate | Target identity | Command / method | Expected | Actual / exit | Evidence | At | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V-001 | Build | local working tree | `npm run build:web` | frontend and backend compile | exit 0 | Vite 4581 modules; backend `tsc` | 2026-08-05T18:15:00-03:00 | TESTER |
| V-002 | Frontend regression | local working tree | Node test suite excluding pre-existing missing `app/db` fixture | all runnable tests pass | 79/79 pass | test reporter output | 2026-08-05T18:15:00-03:00 | TESTER |
| V-003 | Backend regression/security | local working tree | `npm --prefix backend test` | all tests pass | 79/79 pass | includes owner-scoped Blob path tests | 2026-08-05T18:15:00-03:00 | TESTER |
| V-004 | Other targets | local working tree | `npm run build:extension`; `npm run test:go` | compile/pass | exit 0 / exit 0 | extension build and Go package tests | 2026-08-05T18:14:00-03:00 | TESTER |
| V-005 | Rendered journey | local Vite candidate | Chrome DOM + screenshots at normal and 390px viewport | recovery and import states usable | passed | localized recovery, native actions, responsive layout | 2026-08-05T18:12:00-03:00 | TESTER |

## Release identity

| Field | Intended | Observed | Evidence |
| --- | --- | --- | --- |
| GitHub account / owner | | | |
| Repository / visibility | | | |
| Branch / remote SHA | | | |
| Tag / release | | | |
| Vercel account / team | | | |
| Project / environment | | | |
| Deployment ID / URL | | | |
| Production domain | | | |
| Rollback candidate | | | |

## State transition log

Append one row for each meaningful state change or correction.

| At | Phase / gate | Event | Evidence | Decision / result | Next action | Next owner |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-05T17:49:32-03:00 | INTAKE | Run initialized | original request | `in_progress` | resolve workspace and permissions | Main |
| 2026-08-05T17:55:00-03:00 | FDE_CONTRACT | Incident evidence and recovery behavior bounded | E-001 through E-004 | local-first, resumable upload and manual import approved | specify UI states and engineering slice | DESIGN |
| 2026-08-05T18:16:00-03:00 | VERIFY | Local candidate compiled, tested and rendered | V-001 through V-005 | `ready_local_candidate`; no release authorization inferred | hand off local changes | Main |

## Residual work

| Item | Why unresolved | User / product impact | Owner | Trigger or due date | Release blocking |
| --- | --- | --- | --- | --- | --- |
| | | | | | `yes/no` |

## Final result

- Status: `complete`
- Outcome delivered: recordings and imported WebM files are protected in IndexedDB before auth/upload; failures remain retryable and downloadable across reloads, including when session restoration is unavailable.
- Artifacts created or changed: recording recovery store, Web/Electron orchestration, auth retry, owner-scoped idempotent Blob handling, recovery/import UI, localization and tests.
- Evidence summary: frontend/backend builds pass; 79 runnable frontend tests, 79 backend tests, Go tests and extension build pass; rendered recovery and import states validated responsively.
- Release / production state: local working tree only; no commit, push or deployment performed.
- Residual risks: browser quota or private-mode denial still requires the explicit in-memory download fallback; local drafts are device/profile-specific.
- Next experiment or action: deploy only after explicit authorization, then verify with a real long recording and induced auth timeout in preview/production.
