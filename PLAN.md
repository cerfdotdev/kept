# Implementation Plan — Ledgerfolk "Kept" (v0 Production Build)

**Date:** 2026-08-03 · **Owner:** Autonomous Studio · **Repo:** `github.com/cerfdotdev/kept` · **Deploy:** Dokploy @ dokploy.cerf.codes → **https://kept.dok.cerf.codes**

## 1. Objective
Ship a production-grade, deployable v0 of the validated venture: done-for-you bookkeeping ("Kept") — landing page, signup/auth, onboarding, live P&L dashboard, monthly close ("The Review"), export, billing, reviewer workspace, AI classification pipeline, admin/kill-gate dashboards. Deploy to Dokploy with wildcard domain, CI/CD, and hardened security/supply chain.

## 2. Stack (ratified via 2026 research)
| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) | Current stable; Server Actions for mutations, route handlers for webhooks; `proxy.ts` (middleware replacement) |
| Language | TypeScript strict, Node 24 | Everywhere |
| Monorepo | pnpm workspaces + Turborepo | Shared lockfile, task graph, isolated apps |
| ORM/DB | Drizzle ORM + PostgreSQL 16 (RLS) | First-class RLS, 0 deps, better-auth adapter, drizzle-kit migrations |
| Auth | Better Auth v1.6 (email OTP plugin, Drizzle adapter, DB rate-limit storage) | Lucia dead; BA is Next-16-native, OTP+rate limiting+2FA built in |
| Email | `EmailProvider` abstraction: Resend (prod) / Console (dev, prints OTP on screen via DEMO_MODE) | Zero external key required to demo |
| Jobs | pg-boss (Postgres queue + cron) in `apps/worker` | Exactly-once, no Redis, retries, DLQ |
| AI | Local pipeline: rules catalog (pg_trgm) → memo matcher → LLM adapter (OpenAI-compatible, optional via env) → calibrated confidence → risk tiers → human queue | No key needed: rule+similarity fallback keeps demo fully functional; LLM upgrades accuracy when key present |
| Payments | Stripe Checkout + webhook (graceful demo mode when no key) | Standard; no dark patterns |
| Bank feeds | `BankFeedProvider` interface: DemoProvider (seed data, sandbox-like) + PlaidProvider (stub when key absent) | Demo works; Plaid plugs in |
| Infra | Docker Compose on Dokploy: web (Next standalone, non-root, read-only rootfs+tmpfs), worker, db (postgres:16 digest-pinned), backup (pg_dump cron) | Traefik routes `kept.dok.cerf.codes` → web:3000, letsencrypt |
| UI | GSAP 3 (all plugins free) + @gsap/react + SplitText + ScrollTrigger + Lenis; Fraunces/Source Sans 3/IBM Plex Mono; cream/ink/amber palette from brand | Awwwards-style landing, reduced-motion gated |
| CI/CD | GitHub Actions: ci.yml (actionlint, lint, typecheck, vitest, audit) → deploy.yml on main → `POST /api/compose.deploy` with DOKPLOY_API_KEY | Deterministic; Dokploy builds from git (public repo) |
| Supply chain | SHA-pinned actions, digest-pinned base images, frozen lockfile, dependabot (npm/actions/docker), `pnpm audit --audit-level high` gate, SBOM+provenance on GHCR images (also pushed), trivy scan | Hardened per GitHub/security lab guidance |

## 3. Architecture
```
apps/web      Next.js 16 — landing + client portal + reviewer workspace + admin
              Server Actions for mutations (zod everywhere); route handlers: /api/auth/[...all],
              /api/health, /api/webhooks/stripe
apps/worker   Node 24 + pg-boss — classification pipeline, close sweeps, SLA sweep,
              escrow/export jobs, billing reminders
packages/db   Drizzle schema (orgs, users, accounts, ledgers, transactions, review_tasks,
              closes, documents, subscriptions, referral_partners, audit_log, jobs) + migrations
packages/auth Better Auth shared instance (email OTP, DB session)
packages/ui   Minimal shared UI primitives + design tokens
```
Tenancy: org-scoped; RLS policies on money tables + code-level ownership checks; every mutation derives orgId from session (never client input).

## 4. Security
- CSP with nonce via `proxy.ts` (+ `x-nonce` for Next inline scripts); HSTS, nosniff, frame-ancestors, referrer-policy
- Better Auth DB rate limiting (trustedProxies for Traefik); zod validation on every action
- Secrets only in Dokploy env (no .env committed; `.env.example` committed); generate `BETTER_AUTH_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, DB creds, escrow keys
- Non-root USER 1001, `read_only: true` + tmpfs; healthchecks; `init: true`; resource limits
- Audit log table (append-only, org-scoped); E&O posture documented

## 5. Data model (core tables)
orgs, users, memberships, sessions; accounts (bank accounts + provider meta), transactions (memo, amount, category, confidence, risk_tier, status, rule/match refs), categories; review_tasks (claim leases, verdicts), closes (period, sign-off, SLA met, credit issued); documents/receipts (status); subscriptions (stripe); referral_partners; audit_log; pg-boss tables.

## 6. AI classification pipeline (worker)
ingest (dedupe/idempotency) → rules catalog (merchant patterns ~200 seeded, category keywords) → pg_trgm memo match against known merchants → optional LLM (structured output JSON, multi-provider) → ensemble confidence (0-1) → risk tiers T1-T4 (amount + confidence) → auto-approve vs exception queue → human review → feedback loop into known-merchants table. Weekly eval harness computes auto-rate/error-rate for kill-gate dashboards.

## 7. Feature scope truth table
| Feature | Real | Demo-gated (graceful) |
|---|---|---|
| Landing (GSAP) | ✓ | — |
| Auth OTP (email) | ✓ (console fallback prints code in DEMO_MODE) | Resend key |
| Onboarding wizard + docs upload | ✓ (S3 via env or local fallback) | — |
| Bank connect | DemoProvider seeds sample ledger | Plaid key |
| Classification + confidence + exception queue | ✓ real engine | LLM key |
| The Review (close, 8:02am metaphor → SLA tick, credit) | ✓ real | Email delivery |
| P&L dashboard, transactions, Looks off, export CSV/QBO | ✓ real | — |
| Billing tiers + checkout | ✓ UI + subs table | Stripe key (demo mode simulates) |
| Reviewer workspace (queue, approve/reclass, QA) | ✓ real | — |
| Admin kill-gate dashboards (auto-rate, error-rate, SLA, churn) | ✓ real | — |
| Escrow/backup | pg_dump cron + exports | S3 optional |

## 8. Build order (agents where marked)
1. **Repo scaffold + workspace configs + drizzle schema + migrations + auth + core libs** (orchestrator)
2. Landing page: agent (GSAP/SplitText/Lenis per research doc; copy from 04-branding)
3. Worker classification pipeline: agent (isolated package)
4. Client portal + reviewer workspace + admin: orchestrator + agent for reviewer workspace
5. Tests (vitest), lint/typecheck fixes, Dockerfiles, compose.prod
6. GitHub: repo create (public), push, secrets, workflows
7. Dokploy: project → env → compose → domain → deploy → verify HTTPS/health → smoke tests → fix loop
8. Post-deploy: smoke test script against prod, README/runbooks, final report

## 9. Verification gates
- CI green (lint/typecheck/test/audit) · build passes locally (docker compose up prod) · prod /api/health 200 over HTTPS · signup→OTP→dashboard happy path · close sign-off flow · export CSV · reviewer queue approval · admin metrics render · reduced-motion + mobile check · lighthouse-ish sanity (LCP) 

## 10. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Next 16 specifics (proxy.ts, cache model) | Scaffold with create-next-app@latest; follow official self-hosting guide; encryption key pinned |
| GSAP a11y/SSR issues | useGSAP in client components only, `gsap.matchMedia()` reduced-motion, SplitText `autoSplit` |
| Dokploy compose gotchas | Use public git URL sourceType=git; env via compose.saveEnvironment + `env_file`; domain labels need redeploy; poll deployment status |
| Secrets in logs | Never echo; CI masks; Dokploy env only |
| Time/complexity | Demo-mode defaults keep every flow functional without external keys |
