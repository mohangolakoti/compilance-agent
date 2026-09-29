export interface HeroPatientStory {
  patientId: string;
  trialId: string;
  status: 'safety_hold' | 'review' | 'active';
  summary: string;
  risk: string;
  symptoms: string[];
}

export interface DemoStep {
  step: string;
  outcome: string;
}

export const heroPatientStory: HeroPatientStory = {
  patientId: 'P1047',
  trialId: 'CT-2026-X',
  status: 'safety_hold',
  summary:
    'P1047 demonstrates the full compliance story: recurring late doses, fatigue and dizziness symptoms, and a safety hold after the protocol threshold was exceeded.',
  risk: 'Repeated delay + symptom recurrence across multiple check-ins indicates a compliance and safety review is required.',
  symptoms: ['fatigue', 'dizziness', 'late dose', 'headache'],
};

export const heroPatientDemoFlow: DemoStep[] = [
  { step: 'Check-in intake', outcome: 'The patient reports fatigue, dizziness, and a late or skipped dose.' },
  { step: 'Memory recall', outcome: 'Hindsight surfaces the patient-specific pattern from prior check-ins.' },
  { step: 'Pattern detection', outcome: 'The system shows repeated symptom recurrence across the last week.' },
  { step: 'Protocol alert', outcome: 'The deterministic protocol engine flags the dose-timing and symptom rule violations.' },
  { step: 'Coordinator review', outcome: 'A human reviews the alert and confirms the correct safety action.' },
  { step: 'Learning loop', outcome: 'The memory system retains the corrected outcome for future decisions.' },
];

export const gitHubChecklist = [
  'README',
  'Architecture overview',
  'Setup instructions',
  'Hindsight explanation',
  'Environment variables',
  'Production deployment checklist',
];

export const contentChecklist = [
  'Problem statement',
  'Check-in demo',
  'Memory and recall',
  'Pattern detection',
  'Protocol alert',
  'Coordinator verification',
  'Learning loop',
  'Demo video',
  'Live demo',
];
