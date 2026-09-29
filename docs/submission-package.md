# Phase 15 — Submission Package

## Stable hero patient

Use patient `P1047` in trial `CT-2026-X` for all live demo and submission recordings.

- Status: `safety_hold`
- Pattern: repeated late dose + fatigue + dizziness
- Why this patient works: the story is easy to explain and demonstrates both memory and protocol logic in one sequence.

## Demo flow

1. Start with the dashboard and select the hero patient.
2. Show the latest patient check-in with late dose and fatigue symptoms.
3. Open the memory panel to compare the stateless summary versus the Hindsight-informed recall.
4. Show the protocol engine alert for dose timing and symptom recurrence.
5. Confirm the coordinator review action and safety hold.
6. Close by highlighting the learning loop and the corrected memory state.

## Recommended narration

"This patient repeatedly delayed the morning dose and reported fatigue and dizziness across multiple check-ins. The Hindsight memory layer connects the historical events, the protocol engine flags the risk, and the coordinator review confirms the appropriate safety action."

## Submission artifact checklist

### GitHub

- Clean repository with production-ready README
- Setup instructions and environment variables
- Architecture overview and system explanation
- Short explanation of Hindsight usage and patient-bank structure

### Demo video

Show the following sequence in order:

- Problem statement
- Check-in intake
- Memory recall
- Pattern detection
- Protocol alert
- Coordinator verification
- Learning effect
- Stateless vs Hindsight comparison

### Live demo

- Use a pre-seeded patient and a stable synthetic trial state.
- Keep the demo focused on one patient, one trial, and one workflow.
- Prioritize a clear story over broad exploration.

### Content delivery

- Use the hero patient as the central narrative anchor.
- Explain the value of Hindsight memory for patient traceability and missed signal detection.
- Emphasize that the protocol engine remains deterministic while the coordinator retains accountability.
