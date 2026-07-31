# Aquiles run: Voxa

> Append-oriented control plane for this product run. Preserve failed attempts and corrections. Link direct evidence; never backfill unobserved success.

## Control metadata

| Field | Value |
| --- | --- |
| Run ID | `VOXA-INC-2026-07-15-001` |
| Request class | `incident_or_recovery` |
| Started | 2026-07-15T13:17:15-03:00 |
| Last updated | 2026-07-15T13:29:00-03:00 |
| Status | `in_progress` |
| Phase ceiling | `PRODUCTION_VERIFY` |
| Current phase | `PRODUCTION_VERIFY` |
| Current gate | `stripe_webhook_authorization` |
| Current owner | `TESTER` |
| Next owner | `AQUILES` |
| Workspace | /Users/luizneto/aquiles/voxa |
| Repository / branch | `luizvb/voxa` / `main` |
| Source commit | `66e889559d5abb257228a0667babe35f77accd77` |

Allowed run status: `in_progress`, `blocked`, `complete`, `cancelled`. A phase ceiling is a hard stop; scaffolding later templates does not authorize filling or executing them.

## Original request

Corrigir INTERNAL_SERVER_ERROR na tela de planos e validar o fluxo Stripe

## Interpreted outcome and boundaries

- User-visible outcome: authenticated users can open Plan and billing without a server error and can safely enter Checkout or Portal.
- Business outcome: restore subscription conversion and management while preserving fail-closed entitlement grants.
- Deliverable: apply the existing additive billing migration, add a repeatable migration/check gate, and verify the production flow without making a real charge.
- Explicit exclusions: real purchase, catalog mutation, secret rotation, DNS/domain changes, destructive data work.
- Constraints: no secrets or customer data in artifacts; production database and deployment mutations require an explicit release authorization gate.
- Deadline or review window: incident response on 2026-07-15.
- Open interpretation questions: production migration/push/deploy authorization.

## Success contract

| ID | Outcome or gate | Measure / observable proof | Target | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| SC-001 | Plan status loads | authenticated `/api/stripe/status` returns 200 and renders a billing state | production | TESTER | `failed` |
| SC-002 | Schema is release-safe | all required billing columns and `stripe_event_receipts` exist; Vercel build checks them | production and repository | CODER | `in_progress` |
| SC-003 | Stripe lifecycle remains fail-closed | checkout/portal/webhook/entitlement tests pass; no access granted from redirect alone | automated and production smoke | TESTER | `in_progress` |

Allowed status: `not_started`, `in_progress`, `passed`, `failed`, `not_applicable`, `accepted_risk`.

## Phase plan

| Phase | Entry condition | Required artifact / evidence | Exit decision | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| INTAKE | Request received | interpreted outcome and ceiling | request classified | AQUILES | `in_progress` |
| ACCESS_PREFLIGHT | Workspace known | access and authorization matrices | safe mutation envelope known | AQUILES | `not_started` |
| DISCOVER | Research authorized | opportunity memo | `go/change/stop` | PRODUCT | `not_started` |
| PRODUCT_BET | Problem evidence sufficient | product brief | falsifiable bet approved | PRODUCT | `not_started` |
| FDE_CONTRACT | Bet approved | FDE contract | behavior executable without guessing | FDE | `not_started` |
| DESIGN_CONTRACT | Experience work applies | design contract | critical states specified | DESIGN | `not_started` |
| ENGINEERING_PLAN | Contracts stable | engineering plan | implementation and rollback ready | CODER | `not_started` |
| BUILD | plan approved | code, migrations, developer tests | candidate built | CODER | `not_started` |
| VERIFY | candidate identified | independent test report | `ready/conditional/blocked` | TESTER | `not_started` |
| LAUNCH_PLAN | claims can be grounded | launch plan | launch experiment approved | MARKETING | `not_started` |
| RELEASE_PREFLIGHT | tester permits release | immutable release candidate and authorization | release authorized | AQUILES | `not_started` |
| GIT_PUBLISH | GitHub mutation authorized | remote SHA and URL | intended commit published | AQUILES | `not_started` |
| VERCEL_DEPLOY | deployment authorized | deployment ID and URL | intended candidate deployed | AQUILES | `not_started` |
| PRODUCTION_VERIFY | deployment reachable | HTTP/browser/telemetry evidence | production verified or rolled back | TESTER | `not_started` |
| LEARN | production signal exists | baseline, result, next experiment | learning recorded | PRODUCT | `not_started` |

## Authorization matrix

Authentication proves access, not authority. Quote the active user request or link the approval event. Recheck immediately before remote mutation.

| Capability | State | Scope / target | Evidence | Confirmed at | Expires / revoke condition |
| --- | --- | --- | --- | --- | --- |
| Local edits | `authorized` | /Users/luizneto/aquiles/voxa | user asked to fix the defect | 2026-07-15T13:04:00-03:00 | request scope changes |
| Commit | `unknown` | repository / branch | | | |
| Create remote | `unknown` | owner / name / visibility | | | |
| Push | `authorized` | `luizvb/voxa` / `main` | user: “pode executar sim commit, push e deploy” | 2026-07-15 | completed |
| Preview deploy | `unknown` | team / project | | | |
| Production deploy | `authorized` | `luizvbs-projects-261f81e6/backend` and `voxa-app` | user: “pode executar sim commit, push e deploy” | 2026-07-15 | completed |
| Domain or DNS change | `unknown` | domain / records | | | |
| Environment variable change | `unknown` | project / environment / variable names | | | |
| Destructive or billing change | `authorized` | additive idempotent Neon migration `20260714_saas_billing_lifecycle.sql` | user: “pode executar sim commit, push e deploy” | 2026-07-15 | migration completed; Stripe webhook mutation remains unauthorized |

Allowed state: `unknown`, `authorized`, `denied`, `not_applicable`, `expired`.

## Technical access matrix

Never record token values, `.env` contents, cookies, customer data, or private keys.

| Surface | Account / scope | Target | Read access | Write access observed | Intended mutation | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Local Git | local user | `/Users/luizneto/aquiles/voxa`, clean at intake | yes | local edits | incident delta | `git status`, Aquiles preflight |
| GitHub | `luizvb` | public `luizvb/voxa`, `main` | yes | authenticated write capability observed | none yet | `gh auth status`, repository API |
| Vercel | `luizvb` / `luizvbs-projects-261f81e6` | `backend`, `voxa-app` production | yes | authenticated capability observed | none yet | project/deployment inspection |
| Database / auth | Neon through Vercel `backend` | production schema | indirect runtime evidence | not exercised | additive migration pending authorization | PostgreSQL error code `42703` in production logs |
| Analytics / observability | | | | | | |
| Taste Skill | installed | no visual redesign in incident scope | yes | not applicable | not invoked | preflight |

## Evidence ledger

| ID | Claim / question | Class | Source and locator | Observed at | Confidence | Supports / contradicts | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E-001 | Production plan status fails because a referenced PostgreSQL column is undefined | `observed` | Vercel deployment `dpl_7HWvA7mmT3cQ37W1YsBz8dUhYdZJ`, `/api/stripe/status`, log code `42703` | 2026-07-15T13:12:00-03:00 | `high` | BUG-001 | exact error code and route, no sensitive query text logged |
| E-002 | Billing lifecycle schema exists in repository but was not applied before production code | `observed` | `backend/migrations/20260714_saas_billing_lifecycle.sql`; production `42703` | 2026-07-15T13:12:00-03:00 | `high` | BUG-001 | deploy had no migration gate |
| E-003 | Current backend billing suite passes after the incident delta | `observed` | `cd backend && npm test` — 43/43 | 2026-07-15T13:19:00-03:00 | `high` | AC-003 | Node 22 locally; production declares Node 24 |
| E-004 | Privacy scan found no high-confidence secret/private-data leak | `observed` | Aquiles `privacy_scan.py` — 183 files, 0 findings | 2026-07-15T13:21:06-03:00 | `high` | privacy gate | local scan only |
| E-005 | Production Neon billing schema is complete after applying the canonical migration | `observed` | `npm run db:check` before/after plus `npm run db:migrate` on Neon project `quiet-mode-25138943`, branch `production` | 2026-07-15T13:26:00-03:00 | `high` | SC-001/SC-002 | additive DDL; no customer rows printed |
| E-006 | Stripe live catalog and Portal are valid, but Voxa has no enabled webhook endpoint | `observed` | authenticated Stripe CLI read-only audit of live account | 2026-07-15T13:28:00-03:00 | `high` | SC-003 / BUG-002 | one approved BRL 14.90 monthly Price; one active Portal config; zero Voxa endpoints |

Evidence classes: `observed`, `user_stated`, `source_grounded`, `inferred`, `unverified`. Confidence: `high`, `medium`, `low`; confidence does not replace source quality.

## Assumption register

| ID | Assumption | Why it matters | Validation method | Threshold | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| A-001 | | | | | PRODUCT | `open` |

Allowed status: `open`, `supported`, `refuted`, `accepted_risk`, `superseded`.

## Decision log

| ID | Date | Owner | Decision | Options considered | Evidence / rationale | Consequences | Reversible | Supersedes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D-001 | 2026-07-15 | CODER | Do not add a UI fallback; apply the canonical schema and block future schema-drift deploys | fallback response, auto-migrate at runtime, controlled migration plus read-only build check | fallback leaves checkout/webhook broken; runtime DDL is unsafe | migration runner, schema check and actionable 503 | `yes` | |

## Risk register

| ID | Risk | Trigger / early signal | Likelihood | Impact | Mitigation | Contingency | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Production migration not yet applied | `/api/stripe/status` continues returning `42703` | certain | high | apply additive idempotent migration under advisory lock | do not deploy dependent code until `db:check` passes | AQUILES | `open` |
| R-002 | Root auth dependencies include known Better Auth advisories | `npm audit --omit=dev` reports one critical transitive package | medium | high | track Neon-auth upgrade; current published beta packages have no newer version | review applicability and upgrade when vendor releases compatible versions | CODER | `open` |
| R-003 | Stripe does not deliver lifecycle events to Voxa | zero enabled endpoints targeting the Voxa API | certain | high | create endpoint for `/api/stripe/webhook`, register required events, store its signing secret in backend production | do not execute a real Checkout until configured and smoke-tested | AQUILES | `open` |

## Contract traceability

| Bet / evidence | Requirement | Acceptance | Design state | Implementation | Test evidence | Release evidence |
| --- | --- | --- | --- | --- | --- | --- |
| E-001/E-002 | FR-001 Plan status must load only against complete schema | AC-001 required columns/table exist | existing BillingView error state retained | migration runner, build check, actionable schema error | backend tests 43/43; production retest pending | production mutation pending |
| E-001/E-002 | FR-002 Entitlement grants only from signed canonical Stripe state | AC-002 redirect alone never grants; webhook idempotent and product-bound | checkout pending/active/error states | existing lifecycle/config/webhook logic retained | billing/Stripe focused tests pass | authenticated production smoke pending |

## Real handoffs

Record only handoffs that actually occurred. A role change by the same agent is a state transition, not a delegation.

| At | From -> to | Objective | Inputs / grounding | Done when | Returned status | Artifacts / evidence | Risks / next owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Verification ledger

| ID | Gate | Target identity | Command / method | Expected | Actual / exit | Evidence | At | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V-001 | Backend regression | local incident tree | `cd backend && npm test` | all pass | 43/43, exit 0 | terminal output | 2026-07-15T13:19:00-03:00 | TESTER |
| V-002 | Focused client billing | local incident tree | `node --test test/billing-contract.test.js test/stripe-external-url.test.js` | all pass | 3/3, exit 0 | terminal output | 2026-07-15T13:21:06-03:00 | TESTER |
| V-003 | Production build | local incident tree | `npm run build:web` | build succeeds | Vite and backend build exit 0; bundle-size warning only | terminal output | 2026-07-15T13:22:00-03:00 | TESTER |
| V-004 | Privacy | local incident tree | Aquiles privacy scan | no findings | pass, 183 files | JSON output | 2026-07-15T13:21:06-03:00 | AQUILES |
| V-005 | Production reproduction | deployment `dpl_7HWvA7mmT3cQ37W1YsBz8dUhYdZJ` | Vercel logs | status 200 | status 500, PG `42703` | Vercel logs | 2026-07-15T13:12:00-03:00 | TESTER |
| V-006 | Production schema | Neon `quiet-mode-25138943` / `production` | `npm run db:check`; migrate; recheck | complete | missing 10 objects before; ready after | terminal output | 2026-07-15T13:26:00-03:00 | AQUILES |
| V-007 | Stripe provider configuration | live Stripe account, read-only | catalog/Portal/webhook CLI audit | catalog, Portal and webhook valid | catalog and Portal pass; webhook fails | summarized CLI output | 2026-07-15T13:28:00-03:00 | TESTER |
| V-008 | Git publish | `66e889559d5abb257228a0667babe35f77accd77` | push and `git ls-remote` | SHA match | local = remote main | Git output | 2026-07-15T13:29:00-03:00 | AQUILES |
| V-009 | Vercel production | commit status for `66e8895` | GitHub/Vercel status and deployment inspect | both Ready | backend `dpl_2ggFW25AftVjGEr1KphAYBA3gtnc`; voxa-app Ready | provider status | 2026-07-15T13:30:00-03:00 | AQUILES |
| V-010 | Production HTTP/log smoke | production aliases | HTTP and Vercel errors since deploy | app 200, API auth boundary 401, no 5xx billing error | pass | terminal output | 2026-07-15T13:31:00-03:00 | TESTER |

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
| 2026-07-15T13:17:15-03:00 | INTAKE | Run initialized | original request | `in_progress` | resolve workspace and permissions | AQUILES |
| 2026-07-15T13:12:00-03:00 | DISCOVER | Production cause reproduced from logs | E-001/E-002 | missing migration confirmed | implement controlled migration and regression gate | CODER |
| 2026-07-15T13:19:00-03:00 | VERIFY | Backend candidate verified | V-001/V-002 | local billing checks pass | obtain production mutation authority | AQUILES |
| 2026-07-15T13:26:00-03:00 | RELEASE_PREFLIGHT | Canonical migration applied to production | V-006 | schema gate passed | publish verified repository delta | AQUILES |
| 2026-07-15T13:28:00-03:00 | VERIFY | Live Stripe configuration audited | V-007 | webhook gap blocks end-to-end billing readiness | publish prevention fix; request exact webhook/env authority | AQUILES |
| 2026-07-15T13:30:00-03:00 | GIT_PUBLISH / VERCEL_DEPLOY | Verified candidate published and deployed | V-008/V-009 | both Vercel deployments Ready at intended SHA | smoke production and resolve webhook gap | TESTER |
| 2026-07-15T13:31:00-03:00 | PRODUCTION_VERIFY | HTTP and error-log smoke passed | V-010 | incident route no longer emits schema 500s; end-to-end billing still blocked by BUG-002 | obtain webhook/env mutation authority | AQUILES |

## Residual work

| Item | Why unresolved | User / product impact | Owner | Trigger or due date | Release blocking |
| --- | --- | --- | --- | --- | --- |
| | | | | | `yes/no` |

## Final result

- Status: `in_progress`
- Outcome delivered:
- Artifacts created or changed:
- Evidence summary:
- Release / production state:
- Residual risks:
- Next experiment or action:
