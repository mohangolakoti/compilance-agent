# Test Report

**Audit date:** 2026-09-30

## Final commands

| Command | Result | Details |
|---|---|---|
| `npm test -- --runInBand` | PASS | 15 suites passed; 66 tests passed. Unit tests explicitly use mock modes and no longer contact external services. |
| `npm run lint` | PASS WITH WARNINGS | 0 errors, 7 warnings. |
| `npm run build` | PASS | Next.js production build and TypeScript completed. |
| tracked-secret scan | PASS | No tracked `.env` file found; local `.env` is ignored. |
| MongoDB SRV connectivity | FAIL/NOT TESTABLE | Environment returned `ECONNREFUSED` during SRV resolution; application now falls back without crashing. |
| Hindsight live authentication | NOT TESTABLE | No authenticated live request was established. |
| Groq live authentication | NOT TESTABLE | No authenticated live request was established. |
| Public deployment smoke test | NOT TESTABLE | No public deployment URL was available. |

## Coverage by critical path

- Environment and bank ID helpers: unit tested.
- Models: unit tested.
- Groq extraction: unit tested primarily through fallback/mock paths.
- Hindsight: unit tests exist but are not isolated from live environment configuration.
- Protocol engine: unit tested.
- Check-in pipeline: tests exist but fail by timeout with configured external services.
- Feedback service: unit tested.
- Agent: service-level tests exist; complete tool-by-tool security/error matrix is missing.
- UI: no browser E2E suite is present.
- MongoDB/Hindsight/Groq integration: no credential-gated live suite is present.

## Fixes verified

- Hindsight, Groq, and MongoDB unit-mode isolation removed the baseline timeout failures.
- `/memory-demo` and coordinator reads use synthetic fallback data when Atlas is unreachable.
- Hindsight retain/recall/reflect outages are reported as pending/unavailable rather than fabricated live evidence.
- Production coordinator APIs fail closed without `COORDINATOR_API_TOKEN`.
- Protocol recommendations no longer instruct medication discontinuation.

## Required follow-up

1. Make unit tests deterministic by explicitly selecting mock mode in test setup.
2. Add bounded timeouts and pending/failed states for Hindsight, Groq, and MongoDB.
3. Add route/API integration tests and browser E2E tests for the hero workflow.
4. Run live integration tests only when credentials and network access are explicitly available.
