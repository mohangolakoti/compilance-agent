# Clinical Trial Hindsight Compliance Agent

This project is a production-ready clinical trial compliance workflow that combines:

- MongoDB-backed patient and protocol state
- Hindsight memory retention, recall, and reflection flows
- Groq-based extraction and summaries
- Deterministic protocol evaluation
- Coordinator review and alerting
- A Vercel-ready Next.js deployment path

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 to access the dashboard and demo routes.

## Required environment variables

Copy `.env.example` to `.env.local` and fill in your credentials before starting the app:

```bash
cp .env.example .env.local
```

Required values:

- `MONGODB_URI`
- `HINDSIGHT_API_KEY`
- `HINDSIGHT_API_URL`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Production deployment on Vercel

1. Import the repo into Vercel.
2. Set the same variables in Vercel Project Settings -> Environment Variables.
3. Use the default Next.js production build flow.
4. Add a production domain and set `NEXT_PUBLIC_APP_URL` to that URL.
5. Run the smoke check after deployment:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app npm run smoke:prod
```

The repository includes a deployment configuration file at `vercel.json` and a production smoke-check script at `scripts/smoke-prod-check.mjs`.

## Key app routes

- `/` — clinical operations dashboard
- `/memory-demo` — before/after Hindsight comparison
- `/api/health` — environment + service health
- `/api/benchmark` — synthetic benchmark dataset
- `/api/agent` — coordinator assistant endpoint

## Deployment checklist

Before public launch, confirm:

- MongoDB Atlas is connected and seeded
- Hindsight Cloud is configured for the trial bank
- Groq API access is working
- Health checks are green
- Coordinator agent answer path is validated
- Synthetic demo patient story is reproducible

## Final demo narrative

The stable hero patient is `P1047` in `CT-2026-X`.

This patient shows the full trial story:

- repeated late or missed dosing
- fatigue and dizziness after medication events
- a protocol threshold breach
- Hindsight recall that connects the history to the present signal
- a required coordinator review and safety hold

Use the patient narrative in the live demo to explain why the system matters.

## Submission package

For the final handoff, use:

- [docs/submission-package.md](docs/submission-package.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/progress.md](docs/progress.md)

These cover the stable demo flow, system architecture, and the project milestone record.

## Verification

```bash
npm test -- --runInBand
npm run build
npm run smoke:prod
```
