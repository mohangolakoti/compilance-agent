# Known Limitations

These limitations remain after the 2026-09-30 audit:

- Live MongoDB Atlas, Hindsight Cloud, and Groq authentication were not verifiable from this environment.
- The repository has no browser E2E suite or public deployment URL to validate.
- The main dashboard still contains demo-oriented static presentation data in places and needs a full API-backed operational state pass.
- There are no dedicated Trial, Alert, or CoordinatorReview Mongoose models; ComplianceLog carries overlapping alert/review concerns.
- Historical protocol windows, cumulative thresholds, and missing-check-in rules are not fully implemented.
- Protocol PDF ingestion does not yet provide production-grade page provenance and multipart upload handling.
- The coordinator agent has bounded deterministic routing, but a complete live Groq tool-selection loop is not proven.
- Lint completes with seven warnings.
- Credentials previously placed in local files or chat should be rotated before any deployment.