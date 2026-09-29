# PRD Requirement Traceability Matrix

**Product:** Clinical Trial & Patient Protocol Compliance Agent
**Authoritative PRD:** `Clinical_Trial_Hindsight_Compliance_Agent_PRD.md`
**Date:** 2026-09-29

---

| PRD Requirement | Feature Description | Implementation File(s) | API / Service | UI Component | Test File | Verification Status | Notes |
|---|---|---|---|---|---|---|---|
| **FR-001** | Trial management (creation, metadata, protocol version, status) | `src/models/Protocol.ts`, `src/services/synthetic-dataset.ts` | `/api/protocol/rules` | `src/app/page.tsx` | `tests/unit/models.test.ts` | **PASS** | Synthetic trial `CT-2026-X` fully operational. |
| **FR-002** | Protocol upload & rule candidate extraction with coordinator review | `src/services/protocol-ingestion.ts` | `/api/protocol/rules` | `src/app/page.tsx` | `tests/unit/protocol-ingestion.test.ts` | **PASS** | PDF text parsing + structured rule extraction + review gate. |
| **FR-003** | Synthetic patient management with isolated Hindsight bank ID | `src/models/Patient.ts`, `src/lib/hindsight.ts` | Internal Service | `src/app/page.tsx` | `tests/unit/models.test.ts`, `tests/unit/env.test.ts` | **PASS** | Bank ID convention `trial_<trialId>_patient_<patientId>` enforced. |
| **FR-004** | Natural-language check-in ingestion preserving raw text | `src/models/CheckIn.ts`, `src/services/checkin-pipeline.ts` | `/api/checkin` | `src/app/page.tsx`, `src/app/memory-demo/page.tsx` | `tests/unit/checkin-pipeline.test.ts` | **PASS** | Raw text saved in MongoDB before extraction. |
| **FR-005** | Groq structured NLP event extraction with Zod schema validation | `src/lib/schemas/checkin-extraction.ts`, `src/services/groq-extractor.ts` | `/api/checkin` | `src/app/page.tsx` | `tests/unit/groq-extractor.test.ts` | **PASS** | Extracts dose status, delay, symptoms, concomitant meds, distress score. |
| **FR-006** | Longitudinal patient memory retention in Hindsight Cloud | `src/services/hindsight-memory.ts` | Internal Service | `src/app/page.tsx` | `tests/unit/hindsight-memory.test.ts` | **PASS** | Uses `@vectorize-io/hindsight-client` `retain()`. |
| **FR-007** | Memory recall for historical symptoms, adherence, and decisions | `src/services/hindsight-memory.ts` | Internal Service / `/api/agent` | `src/app/page.tsx` | `tests/unit/hindsight-memory.test.ts` | **PASS** | Fact & observation retrieval with score cutoffs. |
| **FR-008** | Memory reflection for longitudinal synthesis and pattern detection | `src/services/hindsight-memory.ts` | Internal Service / `/api/agent` | `src/app/page.tsx`, `src/app/memory-demo/page.tsx` | `tests/unit/hindsight-memory.test.ts`, `tests/unit/memory-demo.test.ts` | **PASS** | Synthesizes experience, observations, and facts. |
| **FR-009** | System-derived observations for recurring patterns | `src/services/hindsight-memory.ts`, `src/services/coordinator-agent.ts` | `/api/agent` | `src/app/page.tsx` | `tests/unit/hindsight-memory.test.ts` | **PASS** | Surfaces longitudinal patterns without making diagnoses. |
| **FR-010** | Persistent Mental Models (Adherence, Symptoms, Compliance) | `src/services/hindsight-memory.ts` | Internal Service | `src/app/page.tsx` | `tests/unit/hindsight-memory.test.ts` | **PASS** | Creates and queries persistent Hindsight mental models. |
| **FR-011** | Deterministic protocol compliance engine (timing, meds, AE grades) | `src/services/protocol-engine.ts` | Internal Service | `src/app/page.tsx` | `tests/unit/protocol-engine.test.ts` | **PASS** | Pure deterministic math/logic for thresholds and counts. |
| **FR-012** | Evidence-backed compliance alert generation | `src/models/ComplianceLog.ts`, `src/services/checkin-pipeline.ts` | `/api/checkin`, `/api/compliance/pending` | `src/app/page.tsx` | `tests/unit/checkin-pipeline.test.ts` | **PASS** | Links current event, historical memories, and triggered rule. |
| **FR-013** | Human-in-the-loop coordinator review (Approve, Override, Dismiss, Escalate) | `src/services/feedback-service.ts` | `/api/compliance/[logId]/override`, `/api/compliance/pending` | `src/app/page.tsx` | `tests/unit/feedback-service.test.ts` | **PASS** | Persists action, updates DB, logs audit event, retains correction. |
| **FR-014** | Conversational coordinator assistant with bounded tools | `src/services/coordinator-agent.ts` | `/api/agent` | `src/app/page.tsx` | `tests/unit/coordinator-agent.test.ts` | **PASS** | Answers natural-language queries grounded in system evidence. |
| **FR-015** | Evidence transparency showing dates, sources, and memory links | `src/services/coordinator-agent.ts`, `src/services/memory-demo.ts` | `/api/agent` | `src/app/page.tsx`, `src/app/memory-demo/page.tsx` | `tests/unit/coordinator-agent.test.ts` | **PASS** | Discloses specific dates, rule IDs, and facts. |
| **FR-016** | Without Memory vs With Hindsight side-by-side comparison page | `src/services/memory-demo.ts` | `/memory-demo` | `src/app/memory-demo/page.tsx` | `tests/unit/memory-demo.test.ts` | **PASS** | Dedicated comparison route showing stateless vs memory depth. |
| **SR-001** | Secret management (server-only env vars, no sk- in git) | `src/lib/env.ts` | Internal Server | N/A | `tests/unit/env.test.ts` | **PASS** | Environment variables kept server-side only. |
| **SR-002** | Synthetic patient data policy | `src/services/synthetic-dataset.ts` | `/api/benchmark` | `src/app/page.tsx` | `tests/unit/synthetic-dataset.test.ts` | **PASS** | 100% synthetic patient names, dates, and medical logs. |
| **SR-003** | Patient memory bank isolation | `src/lib/hindsight.ts`, `src/services/hindsight-memory.ts` | Internal Service | N/A | `tests/unit/hindsight-memory.test.ts` | **PASS** | Cross-patient retrieval strictly blocked by unique bank IDs. |
| **SR-004** | Input schema validation | `src/lib/schemas/checkin-extraction.ts` | `/api/checkin`, `/api/compliance/[logId]/override` | `src/app/page.tsx` | `tests/unit/groq-extractor.test.ts`, `tests/unit/feedback-service.test.ts` | **PASS** | Zod schemas validate all API inputs. |
| **SR-005** | Output schema validation | `src/services/groq-extractor.ts` | Internal Service | N/A | `tests/unit/groq-extractor.test.ts` | **PASS** | Groq extraction validated before persistence. |
| **SR-006** | Auditability (immutable AuditEvent trail) | `src/models/AuditEvent.ts` | Internal Service | `src/app/page.tsx` | `tests/unit/models.test.ts`, `tests/unit/feedback-service.test.ts` | **PASS** | Immutable audit log records agent runs and coordinator actions. |
| **SR-007** | Safety posture & medical claim disclaimer | `src/app/page.tsx` | App Layout | `src/app/page.tsx` | N/A | **PASS** | Prominent decision-support and non-diagnostic disclaimer. |

---

## Final Status Summary

- **Total PRD Requirements Tracked**: 23 items
- **PASS**: 23 (100%)
- **PARTIAL**: 0
- **FAIL**: 0
- **NOT TESTABLE**: 0
