"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CheckIn = {
  dayNumber: number;
  timestamp: string;
  doseTaken: boolean;
  doseDelayMinutes: number;
  symptoms: string[];
  distressScore: number;
  rawResponse: string;
};

type Patient = {
  patientId: string;
  status: "active" | "safety_hold" | "review" | "withdrawn";
  cohort: string;
  treatmentArm: string;
  adherence: number;
  memoryNotes: string[];
  recentCheckIns: CheckIn[];
};

type BenchmarkResponse = {
  trialId: string;
  patientCount: number;
  patients: Patient[];
};

const statusLabels: Record<Patient["status"], string> = {
  active: "Active",
  safety_hold: "Safety hold",
  review: "Review",
  withdrawn: "Withdrawn",
};

function statusClass(status: Patient["status"]): string {
  if (status === "safety_hold") return "status-critical";
  if (status === "review") return "status-warning";
  if (status === "active") return "status-success";
  return "status-neutral";
}

export default function Home() {
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [selectedId, setSelectedId] = useState("P1047");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/benchmark")
      .then(async (response) => {
        if (!response.ok) throw new Error("The synthetic trial dataset could not be loaded.");
        return response.json() as Promise<{ ok: boolean } & BenchmarkResponse>;
      })
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load trial data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedPatient = data?.patients.find((patient) => patient.patientId === selectedId) ?? data?.patients[0];
  const reviewPatients = data?.patients.filter((patient) => patient.status === "review" || patient.status === "safety_hold") ?? [];
  const averageAdherence = data ? Math.round(data.patients.reduce((sum, patient) => sum + patient.adherence, 0) / Math.max(data.patients.length, 1)) : 0;
  const selectedTrend = useMemo(() => selectedPatient?.recentCheckIns.map((checkIn) => ({
    day: `Day ${checkIn.dayNumber}`,
    adherence: checkIn.doseTaken ? Math.max(0, 100 - Math.min(checkIn.doseDelayMinutes / 3, 35)) : 0,
  })) ?? [], [selectedPatient]);

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark">CT</div>
            <div><p className="eyebrow">Clinical trial operations</p><h1 className="brand-title">Hindsight Compliance</h1></div>
          </div>
          <nav className="topnav" aria-label="Primary navigation">
            <a className="nav-link nav-link-active" href="#overview">Overview</a>
            <a className="nav-link" href="#patients">Patients</a>
            <a className="nav-link" href="#alerts">Alerts</a>
            <a className="nav-link" href="/memory-demo">Memory</a>
            <a className="nav-link" href="#protocol">Protocol</a>
          </nav>
          <div className="trial-chip"><span className="pulse-dot" /> CT-2026-X <span className="chip-muted">v1.0</span></div>
        </header>

        {loading && <section className="state-panel" aria-live="polite"><div className="spinner" /> Loading synthetic trial operations...</section>}
        {error && <section className="state-panel state-error" role="alert"><strong>Trial data unavailable.</strong><span>{error}</span><button className="button button-dark" onClick={() => window.location.reload()}>Retry</button></section>}

        {!loading && !error && data && selectedPatient && (
          <>
            <section id="overview" className="hero-band">
              <div><p className="eyebrow accent">Coordinator workspace</p><h2 className="page-title">Trial overview</h2><p className="page-subtitle">Evidence-first monitoring for adherence, protocol risk, and longitudinal patient signals.</p></div>
              <div className="hero-actions"><a className="button button-light" href="/memory-demo">Open memory comparison</a><a className="button button-dark" href="#alerts">Review queue <span className="button-count">{reviewPatients.length}</span></a></div>
            </section>

            <section className="kpi-grid" aria-label="Trial KPIs">
              {[["Enrolled patients", String(data.patientCount), "Synthetic cohort"], ["Average adherence", `${averageAdherence}%`, "Across current cohort"], ["Needs coordinator review", String(reviewPatients.length), "Safety hold or review"], ["Safety holds", String(data.patients.filter((patient) => patient.status === "safety_hold").length), "Requires human decision"]].map(([label, value, detail], index) => (
                <motion.article key={label} className={`kpi-card ${index === 2 ? "kpi-accent" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}><p className="eyebrow">{label}</p><strong className="kpi-value">{value}</strong><span className="kpi-detail">{detail}</span></motion.article>
              ))}
            </section>

            <section className="content-grid">
              <div className="content-main">
                <article id="patients" className="panel"><div className="panel-heading"><div><p className="eyebrow">Patient roster</p><h3 className="section-title">Current cohort</h3></div><span className="panel-meta">{data.patients.length} records</span></div><div className="patient-list">
                  {data.patients.map((patient) => <button key={patient.patientId} className={`patient-row ${patient.patientId === selectedPatient.patientId ? "patient-row-selected" : ""}`} onClick={() => setSelectedId(patient.patientId)}><span className="patient-avatar">{patient.patientId.slice(-2)}</span><span className="patient-identity"><strong>{patient.patientId}</strong><small>{patient.cohort} / {patient.treatmentArm}</small></span><span className="patient-adherence"><small>Adherence</small><strong>{patient.adherence}%</strong><span className="meter"><i style={{ width: `${patient.adherence}%` }} /></span></span><span className={`status-pill ${statusClass(patient.status)}`}>{statusLabels[patient.status]}</span></button>)}
                </div></article>

                <article className="panel patient-focus"><div className="panel-heading"><div><p className="eyebrow accent">Selected patient</p><h3 className="section-title">{selectedPatient.patientId}</h3></div><span className={`status-pill ${statusClass(selectedPatient.status)}`}>{statusLabels[selectedPatient.status]}</span></div><div className="focus-grid"><div><p className="focus-label">Treatment arm</p><p className="focus-value">{selectedPatient.treatmentArm}</p></div><div><p className="focus-label">Adherence</p><p className="focus-value">{selectedPatient.adherence}%</p></div><div><p className="focus-label">Memory signals</p><p className="focus-value">{selectedPatient.memoryNotes.length} retained notes</p></div></div><div className="chart-wrap"><div className="chart-heading"><span>Recent dose signal</span><span className="panel-meta">Latest check-ins</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={selectedTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe7ed" /><XAxis dataKey="day" tickLine={false} axisLine={false} stroke="#718096" /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} stroke="#718096" /><Tooltip /><Line type="monotone" dataKey="adherence" stroke="#0d6b78" strokeWidth={3} dot={{ fill: "#0d6b78", r: 4 }} /></LineChart></ResponsiveContainer></div></div></article>
              </div>

              <aside className="content-side">
                <article id="alerts" className="panel alert-panel"><div className="panel-heading"><div><p className="eyebrow">Attention queue</p><h3 className="section-title">Coordinator review</h3></div><span className="count-badge">{reviewPatients.length}</span></div>{reviewPatients.slice(0, 4).map((patient) => <div className="alert-item" key={patient.patientId}><div className={`alert-icon ${patient.status === "safety_hold" ? "alert-icon-critical" : "alert-icon-warning"}`}>!</div><div><strong>{patient.patientId} requires review</strong><p>{patient.status === "safety_hold" ? "Safety hold with repeated adherence signals." : "Recurring symptoms or delayed dosing need review."}</p><a href="#patients" onClick={() => setSelectedId(patient.patientId)}>Open patient</a></div></div>)}{reviewPatients.length === 0 && <div className="empty-state">No active coordinator reviews.</div>}</article>
                <article className="panel memory-panel"><div className="panel-heading"><div><p className="eyebrow accent">Hindsight memory</p><h3 className="section-title">Longitudinal signal</h3></div><span className="memory-status">Patient-scoped</span></div><div className="memory-stat"><strong>{selectedPatient.memoryNotes.length}</strong><span>retained signals for {selectedPatient.patientId}</span></div><div className="memory-notes">{selectedPatient.memoryNotes.slice(0, 3).map((note) => <div className="memory-note" key={note}><span className="note-line" />{note}</div>)}</div><a className="text-link" href="/memory-demo">Compare without memory vs Hindsight -&gt;</a></article>
                <article id="protocol" className="panel protocol-panel"><div className="panel-heading"><div><p className="eyebrow">Protocol guardrails</p><h3 className="section-title">Approved rules</h3></div><span className="panel-meta">Deterministic</span></div>{["Dosing time window: +/-120 min", "Missed dose review: 1 event", "Prohibited medication: any match", "Adverse event: coordinator escalation"].map((rule) => <div className="rule-row" key={rule}><span className="rule-check">&#10003;</span>{rule}</div>)}</article>
              </aside>
            </section>

            <section className="bottom-note"><span className="bottom-mark">H</span><div><strong>Evidence-first by design.</strong><p>Hindsight connects patient-specific history to the current event. Deterministic protocol rules remain the source of compliance truth, and every safety decision stays with a human coordinator.</p></div></section>
          </>
        )}
      </div>
    </main>
  );
}
