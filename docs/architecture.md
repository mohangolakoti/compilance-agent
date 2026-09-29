# Architecture — Clinical Trial Hindsight Compliance Agent

**Version:** 1.0 (audit-reconciled architecture)  
**Date:** 2026-09-30  
**Status:** Implemented with documented gaps

---

## 1. System Overview

The product is a **memory-powered clinical trial operations copilot**.

Production API routes that handle check-ins, coordinator decisions, agent queries,
and protocol changes require `COORDINATOR_API_TOKEN`. Local development may run
without that token, while Vercel/production fails closed if it is missing.

Unit tests explicitly set `HINDSIGHT_MODE=mock`, `GROQ_MODE=mock`, and
`MONGODB_MODE=mock`; these modes must not be used as evidence of live integration.

Core loop:

```
Natural-language patient check-in
  → Groq structured extraction
  → MongoDB structured event (source-of-record)
  → Hindsight Retain (longitudinal memory)
  → Hindsight Recall (historical context)
  → Deterministic Protocol Engine (rule evaluation)
  → Hindsight Reflect (when longitudinal synthesis needed)
  → Evidence-backed Alert
  → Human Coordinator Review
  → Coordinator decision retained in Hindsight
  → Future queries benefit from prior decision
```

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript/TSX | |
| Styling | Tailwind CSS | |
| Charts | Recharts | |
| Animation | Framer Motion | Subtle only |
| Server | Next.js Route Handlers | Server-only secrets |
| ODM | Mongoose | |
| Database | MongoDB Atlas | Structured operational state |
| Memory | Hindsight Cloud | @vectorize-io/hindsight-client |
| LLM Provider | Groq | openai/gpt-oss-120b |
| Validation | Zod | All inputs + AI outputs |
| Deployment | Vercel | |

---

## 3. Responsibility Boundaries

### MongoDB — Structured System-of-Record

Stores:
- Trial — trial metadata, protocol version, status
- Patient — patient profile, enrollment, Hindsight bank ID
- CheckIn — raw + structured check-in events
- ProtocolRule — coordinator-approved deterministic rules
- Alert — triggered alerts with evidence links
- CoordinatorReview — human decisions on alerts

Does NOT store longitudinal reasoning, patterns, or contextual synthesis.

### Hindsight Cloud — Longitudinal Memory

Stores and reasons over:
- Patient experiences (check-in events, symptom reports)
- Adherence observations (recurring late doses, patterns)
- Mental models (Adherence Profile, Symptom Pattern, Protocol Compliance History)
- Coordinator verification decisions
- Contextual facts about protocol relevance

Does NOT replace MongoDB for structured queries or record-keeping.

### Groq (openai/gpt-oss-120b) — AI Layer

Responsible for:
- Natural-language extraction to structured check-in fields
- Protocol text to structured rule candidates
- Agent tool selection (bounded tool loop)
- Coordinator briefing generation
- Longitudinal synthesis explanation

Does NOT determine official threshold values, counts, or date windows.

### Deterministic Protocol Engine — Compliance Logic

Responsible for:
- Evaluating approved MongoDB rules against structured events
- Counting missed doses, late doses within date windows
- Calculating missing check-in durations
- Detecting recurring symptom counts above thresholds
- Returning machine-readable triggered/not-triggered results

Does NOT use LLM for threshold decisions.

---

## 4. Memory Bank Naming Convention

```
trial_<trialId>_patient_<patientId>
```

Example:
```
trial_TRIAL-001_patient_P1047
```

Critical rule: No query may target another patient's bank.
Verification: Bank IDs are constructed server-side, never from client input.

---

## 5. Hindsight Memory Mission

Focus on trial adherence, medication timing, reported symptoms, adverse-event
reports, protocol deviations, recurring patterns, unresolved compliance issues,
and coordinator verification. Ignore irrelevant conversational content.
Do not infer diagnoses or treatment recommendations.

### Directives

1. Never diagnose a medical condition.
2. Never recommend treatment or medication changes.
3. Identify protocol/adherence concerns only when supported by stored evidence or approved protocol rules.
4. Include dates when citing historical evidence.
5. Clearly distinguish observed facts from inferred patterns.
6. Require coordinator review before official compliance status changes.

---

## 6. Mental Models

| Model | Source Query |
|---|---|
| A — Adherence Profile | What are this patient's recurring adherence patterns, late doses, missed doses, and improvements? |
| B — Symptom Pattern | What recurring symptoms have been reported, when do they occur, and what historical patterns are supported by evidence? |
| C — Protocol Compliance History | What potential or confirmed protocol deviations have occurred, and how did coordinators resolve them? |

---

## 7. Protocol Ingestion and Approval Gate

The protocol logic is intentionally separated from the LLM layer.

- Raw protocol documents are ingested as source text or PDF content.
- A rule-extraction step converts the document into structured candidate rules.
- The extracted rules are validated with Zod before becoming trusted state.
- A coordinator review step must approve, reject, or edit each candidate.
- Only approved rules are written to MongoDB and used by the deterministic compliance engine.

This prevents the LLM from acting as the source of truth for protocol thresholds, date windows, or clinical action requirements.

### Approval Workflow

```
Synthetic protocol PDF / text
  → extractProtocolTextFromPdf()
  → extractProtocolRulesFromText()
  → Zod validation
  → coordinator review (APPROVE / EDIT / REJECT)
  → approveProtocolRule()
  → MongoDB approved protocol rules
  → deterministic engine reads only approved rules
```

A malformed or empty document is rejected before it can influence the compliance engine. This preserves the PRD requirement that approved protocol rules remain deterministic and human-reviewed.

---

## 8. Dashboard and Patient Experience

Phase 9 establishes the primary product experience as a professional clinical operations dashboard rather than a chatbot-first interface.

Core components of the UI:
- Trial overview with operational KPIs and active alerts
- Patient roster and risk review table
- Patient detail panel with adherence metrics and timestamps
- Longitudinal adherence and symptom trend visualization
- Evidence panel describing key protocol-relevant facts
- Hindsight memory panel summarizing historical context and recurring patterns
- Approved protocol rule panel for current trial thresholds
- Coordinator briefing and Without Memory vs With Hindsight decision support section

The UI is intentionally designed to be evidence-first and coordinator-driven, reinforcing the PRD requirement that compliance decisions remain human-reviewed rather than automated or diagnostic.

---

## 9. High-Level Architecture Diagram

```
                   +-----------------------------------------+
                   |           NEXT.JS + TSX                 |
                   |                                         |
                   | Dashboard | Patient | Alert | Protocol  |
                   | Assistant | Memory Demo                 |
                   +--------------------+--------------------+
                                        |
                                        v
                   +-----------------------------------------+
                   |         APPLICATION SERVICES            |
                   |                                         |
                   | Check-in | Agent | Rules | Alerts       |
                   | Reviews  | Memory | Protocol            |
                   +----------+------------------+-----------+
                              |                  |
              +---------------+                  +------------------+
              v                                                     v
  +---------------------+                          +--------------------+
  |      MONGODB        |                          |  HINDSIGHT CLOUD   |
  |                     |                          |                    |
  | Structured SoT      |                          | Long-term memory   |
  | Trial               |                          | Recall             |
  | Patient             |                          | Reflect            |
  | Check-in            |                          | Observations       |
  | Protocol Rule       |                          | Mental Models      |
  | Alert               |                          | Feedback           |
  | Review              |                          |                    |
  +---------------------+                          +----------+---------+
                                                              |
                                                              v
                                                   +--------------------+
                                                   |       GROQ         |
                                                   | GPT-OSS 120B       |
                                                   |                    |
                                                   | Extraction         |
                                                   | Tool Calling       |
                                                   | Reasoning          |
                                                   | Structured JSON    |
                                                   +--------------------+
```

---

## 10. Recommended Project Directory Structure

```
compilance-agent/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                  # Trial dashboard
│   │   └── layout.tsx
│   ├── patients/
│   │   └── [patientId]/
│   │       └── page.tsx              # Patient detail
│   ├── protocol/
│   │   └── page.tsx                  # Protocol upload & rules
│   ├── alerts/
│   │   └── page.tsx                  # Alerts list & evidence
│   ├── assistant/
│   │   └── page.tsx                  # Coordinator assistant
│   ├── memory-demo/
│   │   └── page.tsx                  # Without vs With Hindsight
│   └── api/
│       ├── trials/
│       ├── patients/
│       ├── checkins/
│       ├── protocol/
│       ├── alerts/
│       ├── memory/
│       └── agent/
├── components/
│   ├── dashboard/
│   ├── patients/
│   ├── alerts/
│   ├── memory/
│   └── ui/
├── lib/
│   ├── mongodb.ts                    # MongoDB singleton client
│   ├── hindsight.ts                  # Hindsight singleton client
│   ├── groq.ts                       # Groq client
│   └── env.ts                        # Environment validation
├── services/
│   ├── checkin.service.ts            # Check-in pipeline orchestration
│   ├── memory.service.ts             # Hindsight operations
│   ├── protocol.service.ts           # Protocol ingestion + rule mgmt
│   ├── compliance.service.ts         # Deterministic rule evaluation
│   ├── alert.service.ts              # Alert creation/management
│   ├── coordinator.service.ts        # Review workflow
│   └── agent.service.ts              # Bounded agent loop
├── models/
│   ├── Trial.ts
│   ├── Patient.ts
│   ├── CheckIn.ts
│   ├── ProtocolRule.ts
│   ├── Alert.ts
│   └── CoordinatorReview.ts
├── schemas/
│   ├── checkin.schema.ts
│   ├── protocol.schema.ts
│   ├── agent.schema.ts
│   └── alert.schema.ts
├── types/
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   ├── seed.ts                       # Synthetic data seeder
│   └── benchmark.ts                  # Evaluation benchmark
├── docs/
│   ├── architecture.md               # This file
│   └── progress.md                   # Phase progress log
└── public/
```

---

## 9. API Surface

### Trials
- GET /api/trials
- POST /api/trials
- GET /api/trials/[trialId]

### Patients
- GET /api/patients
- POST /api/patients
- GET /api/patients/[patientId]
- GET /api/patients/[patientId]/timeline
- GET /api/patients/[patientId]/checkins

### Check-ins
- POST /api/checkins

### Protocol
- POST /api/protocol/upload
- GET /api/protocol/rules
- PATCH /api/protocol/rules/[ruleId]

### Alerts
- GET /api/alerts
- GET /api/alerts/[alertId]
- POST /api/alerts/[alertId]/review

### Agent
- POST /api/agent

### Health (internal)
- GET /api/health

---

## 10. Agent Tool Contracts

The model requests tools; the server executes them.

| Tool | Input | Output |
|---|---|---|
| get_patient | patientId | Patient metadata |
| search_patients | query, filters | Patient list |
| get_patient_timeline | patientId, dateRange? | Structured events |
| recall_patient_memory | patientId, query, filters? | Hindsight memories |
| reflect_patient_memory | patientId, question, context? | Synthesized answer |
| get_protocol_rules | trialId | Approved rules |
| evaluate_protocol_compliance | patientId, dateRange | Triggered rules + evidence |
| get_alert_history | patientId, status? | Alerts |
| get_coordinator_reviews | patientId | Reviews |
| record_coordinator_review | alertId, decision, reason | Updated alert + review |

Maximum tool iterations: 5

---

## 11. Security Requirements

- All API keys (GROQ, HINDSIGHT, MONGODB) remain server-side only
- No NEXT_PUBLIC_ prefix on secrets
- All API inputs validated with Zod
- All AI outputs validated with Zod before persistence
- Patient bank IDs constructed server-side only
- No cross-bank queries permitted
- Structured logging for all agent runs and tool calls

---

## 12. Reliability Requirements

| Failure | Behavior |
|---|---|
| Hindsight unavailable | Save to MongoDB; mark memory status pending |
| Groq unavailable | Save raw text; expose processing-pending state |
| Invalid extraction | Retry max 2 times; route to manual review |
| No relevant memory | Explicitly state no relevant historical memory found |
| Tool call failure | Retry within bounded policy; log; safe fallback |

---

## 13. Architecture Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Single codebase, server actions, route handlers |
| Language | TypeScript strict | Type safety throughout |
| Database | MongoDB Atlas | Flexible schema, good for clinical event data |
| Memory | Hindsight Cloud | Mandatory + core differentiator |
| LLM | Groq openai/gpt-oss-120b | Tool use + JSON Schema + 131K context |
| Compliance | Deterministic code only | Avoid LLM threshold decisions |
| Patient isolation | One Hindsight bank per patient | Prevent cross-patient memory leakage |
| Human feedback | Required coordinator review | Operational safety |
| Data | Synthetic only | Hackathon safety requirement |
| Hosting | Vercel | Natural Next.js fit |
| UI priority | Dashboard first, chat second | Avoid generic chatbot perception |
