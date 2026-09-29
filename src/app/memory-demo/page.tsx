import { buildMemoryDemoForPatient } from '@/services/memory-demo';

export default async function MemoryDemoPage() {
  const demo = await buildMemoryDemoForPatient('CT-2026-X', 'P1047');

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">Phase 11</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Without Memory vs With Hindsight</h1>
          </div>
          <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
            Patient {demo.patientId} · Trial {demo.trialId}
          </div>
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Current check-in</div>
            <div className="mt-3 text-base font-semibold text-slate-900">{demo.currentCheckIn.summary}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Dose state</div>
            <div className="mt-3 text-base font-semibold text-slate-900">
              {demo.currentCheckIn.doseTaken ? 'Taken' : 'Missed'} · {demo.currentCheckIn.delayMinutes} min late
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Symptoms</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {demo.currentCheckIn.symptoms.map((symptom) => (
                <span key={symptom} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Without memory</div>
            <p className="text-base leading-7 text-slate-700">{demo.withoutMemory}</p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">With hindsight</div>
            <p className="text-base leading-7 text-sky-900">{demo.withHindsight}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Historical evidence</h2>
            <ul className="mt-4 space-y-3">
              {demo.historicalEvidence.map((fact, index) => (
                <li key={`${fact}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Pattern discovery</h2>
            <ul className="mt-4 space-y-3">
              {demo.patternDiscovery.map((point, index) => (
                <li key={`${point}-${index}`} className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-sm leading-7 text-slate-100">
          This demonstration is a synthetic-data, evidence-first review aid. It supports human coordinator decision-making and does not diagnose or replace clinical judgment.
        </div>
      </div>
    </main>
  );
}
