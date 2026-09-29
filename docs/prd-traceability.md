# PRD Traceability Matrix

**Audit date:** 2026-09-30

| PRD requirement | Feature | Implementation files | API/service | UI | Test | Status | Notes |
|---|---|---|---|---|---|---|---|
| Next.js TypeScript application | App foundation | `src/app`, `tsconfig.json`, `next.config.ts` | Next.js runtime | Dashboard/routes | Build | PASS | Build verified. |
| Environment configuration | Server env checks | `src/lib/env.ts`, `.env.example` | Health route | None | `tests/unit/env.test.ts` | PARTIAL | Local secrets/network are not deployment proof. |
| MongoDB structured state | Mongoose models | `src/models`, `src/lib/mongodb.ts` | Domain services | Partial dashboard | `tests/unit/models.test.ts` | PARTIAL | Trial/Alert/Review entities are incomplete; live Atlas unavailable. |
| Patient-specific Hindsight banks | Bank naming | `src/lib/hindsight.ts`, `src/services/hindsight-memory.ts` | Retain/Recall/Reflect | Memory demo | `tests/unit/hindsight-memory.test.ts` | PARTIAL | Naming tested; live isolation not authenticated. |
| Groq structured extraction | Check-in extraction | `src/services/groq-extractor.ts`, `src/lib/groq.ts` | `/api/checkin` | Check-in UI path | `tests/unit/groq-extractor.test.ts` | PARTIAL | Live/strict JSON Schema behavior unverified; fallback can look authoritative. |
| Deterministic protocol rules | Rule engine | `src/services/protocol-engine.ts` | Check-in/coordinator services | Dashboard evidence | `tests/unit/protocol-engine.test.ts` | PARTIAL | Current events covered; historical/date-window requirements incomplete. |
| End-to-end check-in | Pipeline | `src/services/checkin-pipeline.ts` | `/api/checkin` | Partial | `tests/unit/checkin-pipeline.test.ts` | FAIL | Baseline tests timeout with external config; pending/failure state incomplete. |
| Coordinator feedback | Review service | `src/services/feedback-service.ts` | Review/override routes | Partial | `tests/unit/feedback-service.test.ts` | PARTIAL | Persistence/auth and live Hindsight feedback not fully verified. |
| Protocol ingestion approval | Ingestion service | `src/services/protocol-ingestion.ts` | Protocol routes | Partial | `tests/unit/protocol-ingestion.test.ts` | PARTIAL | PDF parser/upload/provenance gaps. |
| Operations dashboard | Dashboard | `src/app/page.tsx`, `src/components/dashboard` | Health/domain routes | `/` | Limited | FAIL | Major displayed state is hardcoded. |
| Memory comparison | Demo | `src/services/memory-demo.ts`, `src/app/memory-demo/page.tsx` | Hindsight/coordinator services | `/memory-demo` | `tests/unit/memory-demo.test.ts` | PARTIAL | Baseline timeout and fallback/default evidence issue. |
| Coordinator assistant | Agent | `src/services/coordinator-agent.ts` | `/api/agent` | Agent component | Agent tests | PARTIAL | Bounded deterministic routing exists; true Groq tool selection unverified. |
| Synthetic dataset | Benchmark | `src/services/synthetic-dataset.ts` | `/api/benchmark` | Benchmark route | `tests/unit/synthetic-dataset.test.ts` | PARTIAL | Dataset exists; no measured accuracy report. |
| Reliability hardening | Retry/fallback | `src/services/hardening.ts` | Agent integration | Error UX partial | `tests/unit/hardening.test.ts` | PARTIAL | Hardening does not cover every external-service path. |
| Deployment | Vercel | `vercel.json`, `scripts/smoke-prod-check.mjs` | Production routes | Deployed app | Build/smoke | NOT TESTABLE | No public authenticated deployment verified. |
| Final demo/submission | Hero flow | `src/services/hero-patient.ts`, `docs/submission-package.md` | Demo routes | Dashboard/memory demo | `tests/unit/phase15.test.ts` | PARTIAL | Narrative/checklist exists; full real end-to-end hero scenario not verified. |
| Security and privacy | Input validation/isolation | Zod schemas, route handlers | All APIs | N/A | Limited | FAIL | Authentication, authorization, rate limiting, and scope enforcement absent. |
| Hackathon content | Article/video/social | Documentation only | N/A | N/A | N/A | NOT TESTABLE | External deliverables cannot be verified from repository. |
