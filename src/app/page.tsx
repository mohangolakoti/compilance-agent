"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const patients = [
  {
    id: "P1047",
    name: "Maya Patel",
    cohort: "Arm A",
    adherence: 76,
    risk: "High",
    status: "Safety Hold",
    lastCheckin: "12 hrs ago",
    openAlerts: 2,
    symptoms: ["fatigue", "dizziness"],
  },
  {
    id: "P1079",
    name: "Lucas Gomez",
    cohort: "Arm B",
    adherence: 90,
    risk: "Low",
    status: "Active",
    lastCheckin: "8 hrs ago",
    openAlerts: 0,
    symptoms: ["mild nausea"],
  },
  {
    id: "P1122",
    name: "Amelia Chen",
    cohort: "Arm A",
    adherence: 84,
    risk: "Medium",
    status: "Review",
    lastCheckin: "16 hrs ago",
    openAlerts: 1,
    symptoms: ["fatigue"],
  },
  {
    id: "P1188",
    name: "Daniel Brooks",
    cohort: "Arm C",
    adherence: 93,
    risk: "Low",
    status: "Active",
    lastCheckin: "3 hrs ago",
    openAlerts: 0,
    symptoms: [],
  },
];

const adherenceTrend = [
  { day: "W1", adherence: 88 },
  { day: "W2", adherence: 81 },
  { day: "W3", adherence: 79 },
  { day: "W4", adherence: 76 },
  { day: "W5", adherence: 73 },
  { day: "W6", adherence: 82 },
  { day: "W7", adherence: 76 },
];

const symptomTrend = [
  { name: "Fatigue", count: 12 },
  { name: "Dizziness", count: 7 },
  { name: "Nausea", count: 9 },
  { name: "Fever", count: 4 },
  { name: "Vomiting", count: 3 },
];

const alertFeed = [
  {
    id: "AL-2047",
    severity: "High",
    patient: "P1047",
    issue: "Late dose + dizziness + missed adherence window",
    time: "18 min ago",
  },
  {
    id: "AL-1842",
    severity: "Medium",
    patient: "P1122",
    issue: "Potential fatigue pattern on 3 consecutive days",
    time: "2 hrs ago",
  },
  {
    id: "AL-2031",
    severity: "Low",
    patient: "P1079",
    issue: "Dose timing within threshold",
    time: "6 hrs ago",
  },
];

const protocolRules = [
  { rule: "Dose timing", threshold: "±120 min", status: "Active", impact: "Medium" },
  { rule: "Missed dose review", threshold: "1 missed dose", status: "Active", impact: "High" },
  { rule: "Prohibited medication", threshold: "Any NSAID", status: "Active", impact: "Critical" },
  { rule: "AE grade threshold", threshold: "Grade 3+ / moderate vomiting", status: "Pending", impact: "High" },
];

const memoryInsights = [
  "Historical pattern: fatigue recurred in 3 of the last 5 check-ins.",
  "Observed dose-timing drift after symptom onset on Day 5 and Day 7.",
  "Mental model: adherence profile indicates a recurring late-dose pattern tied to fatigue events.",
  "Coordinator decision history indicates earlier fatigue reports were not escalated.",
];

const evidenceBlocks = [
  { title: "Reported symptom", text: "Fatigue and dizziness reported on three recent check-ins." },
  { title: "Dose timing", text: "Dose was reported 146 minutes late versus the allowed 120-minute window." },
  { title: "Protocol relevance", text: "This crosses the active missed-dose and timing threshold for coordinator review." },
];

const selectedPatient = patients[0];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Trial operations</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">CT-2026-X Compliance Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Live monitoring</div>
            <a href="/memory-demo" className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100">
              Memory demo
            </a>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700">
              Review queue
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Active patients", value: "1,248", delta: "+12%", tone: "bg-slate-900 text-white" },
            { label: "Adherence avg", value: "86.4%", delta: "+1.8%", tone: "bg-emerald-50 text-emerald-700" },
            { label: "Open alerts", value: "23", delta: "-5%", tone: "bg-amber-50 text-amber-700" },
            { label: "Safety holds", value: "4", delta: "2 new", tone: "bg-rose-50 text-rose-700" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${stat.tone}`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] opacity-75">{stat.label}</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold">{stat.value}</span>
                <span className="text-xs font-medium">{stat.delta}</span>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Patient roster</p>
                  <h2 className="text-xl font-semibold text-slate-900">Current cohort</h2>
                </div>
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">Export</button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 bg-white text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Patient</th>
                      <th className="px-4 py-3 font-medium">Cohort</th>
                      <th className="px-4 py-3 font-medium">Adherence</th>
                      <th className="px-4 py-3 font-medium">Risk</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((patient) => (
                      <tr key={patient.id} className={patient.id === selectedPatient.id ? "bg-slate-50" : "bg-white"}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{patient.name}</div>
                          <div className="text-xs text-slate-500">{patient.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{patient.cohort}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-20 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${patient.adherence}%` }} />
                            </div>
                            <span className="font-medium text-slate-700">{patient.adherence}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${patient.risk === "High" ? "bg-rose-50 text-rose-700" : patient.risk === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {patient.risk}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${patient.status === "Safety Hold" ? "bg-rose-100 text-rose-700" : patient.status === "Review" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
                            {patient.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Patient detail</p>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedPatient.name}</h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{selectedPatient.id}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current adherence</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{selectedPatient.adherence}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Open alerts</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{selectedPatient.openAlerts}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last check-in</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{selectedPatient.lastCheckin}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Longitudinal timeline</h3>
                    <span className="text-xs font-medium text-slate-500">Last 7 days</span>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={adherenceTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} />
                        <YAxis domain={[60, 100]} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="adherence" stroke="#111827" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Reported symptoms</h3>
                    <span className="text-xs text-slate-500">Current cycle</span>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={symptomTrend}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Alerts</p>
                  <h2 className="text-xl font-semibold text-slate-900">Current review queue</h2>
                </div>
                <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">3 open</span>
              </div>

              <div className="space-y-3">
                {alertFeed.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{alert.id}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${alert.severity === "High" ? "bg-rose-100 text-rose-700" : alert.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <div className="font-medium text-slate-900">{alert.patient}</div>
                    <p className="mt-1 text-sm text-slate-600">{alert.issue}</p>
                    <div className="mt-2 text-xs text-slate-500">{alert.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Evidence panel</p>
                  <h2 className="text-xl font-semibold text-slate-900">Clinical summary</h2>
                </div>
              </div>

              <div className="space-y-3">
                {evidenceBlocks.map((block) => (
                  <div key={block.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{block.title}</div>
                    <p className="mt-2 text-sm text-slate-700">{block.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Hindsight memory</p>
                <h2 className="text-xl font-semibold text-slate-900">Longitudinal context</h2>
              </div>
              <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">Memory bank active</span>
            </div>

            <div className="space-y-3">
              {memoryInsights.map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Protocol screen</p>
                <h2 className="text-xl font-semibold text-slate-900">Approved rules</h2>
              </div>
            </div>

            <div className="space-y-3">
              {protocolRules.map((rule) => (
                <div key={rule.rule} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <div className="font-medium text-slate-900">{rule.rule}</div>
                    <div className="text-xs text-slate-500">Threshold: {rule.threshold}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${rule.impact === "Critical" ? "bg-rose-100 text-rose-700" : rule.impact === "High" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
                      {rule.impact}
                    </span>
                    <span className="text-xs font-medium text-slate-600">{rule.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Coordinator briefing</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Summary</h2>
            <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm leading-6 text-slate-100">
              Patient P1047 shows a recurring late-dose pattern during the last seven days, accompanied by fatigue and dizziness. The current event exceeds the approved timing threshold and is consistent with previous adherence drift. A coordinator review is required before any compliance status change is finalized.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Without Memory vs With Hindsight</p>
                <h2 className="text-xl font-semibold text-slate-900">Decision support view</h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Without memory</div>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Current day shows a late dose.</li>
                  <li>• One symptom is reported.</li>
                  <li>• Timing threshold is exceeded.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">With hindsight</div>
                <ul className="space-y-2 text-sm text-sky-800">
                  <li>• Repeated fatigue pattern over 5 of 7 days.</li>
                  <li>• Prior dose-drifts align with symptom onset.</li>
                  <li>• Coordinator history indicates earlier fatigue events were not escalated.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Clinical safety note</p>
              <h2 className="text-xl font-semibold text-slate-900">Prototype scope</h2>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-700">
            This interface is a synthetic-data operations dashboard for protocol adherence review. It does not diagnose, prescribe treatment, or replace a qualified clinical professional. The system supports evidence-backed review and requires coordinator confirmation before compliance decisions are finalized.
          </p>
        </section>
      </div>
    </main>
  );
}
