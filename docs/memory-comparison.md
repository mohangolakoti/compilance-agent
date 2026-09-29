# Memory Comparison Contract

The comparison page is a decision-support demonstration, not a clinical decision.

## Without memory

The stateless side uses only the selected latest check-in and the deterministic
protocol evaluation for that event. It must not call Hindsight Recall or Reflect.

## With Hindsight

The Hindsight side calls patient-scoped Recall and Reflect using the bank generated
by `buildBankId(trialId, patientId)`. It adds historical evidence and longitudinal
pattern language to the current event.

## Validation boundary

When Hindsight is unavailable, the application reports a pending/unavailable memory
state rather than presenting synthetic memory as live evidence. The built-in mock
store is reserved for deterministic tests and offline development.