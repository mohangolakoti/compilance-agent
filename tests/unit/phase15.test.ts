import { heroPatientStory, heroPatientDemoFlow, gitHubChecklist, contentChecklist } from '@/services/hero-patient';

describe('Phase 15 — submission package', () => {
  test('uses a stable hero patient and single workflow for the public demo', () => {
    expect(heroPatientStory.patientId).toBe('P1047');
    expect(heroPatientStory.trialId).toBe('CT-2026-X');
    expect(heroPatientStory.status).toBe('safety_hold');
  });

  test('defines a full demo flow from onboarding to learning', () => {
    expect(heroPatientDemoFlow.map((item) => item.step)).toEqual([
      'Check-in intake',
      'Memory recall',
      'Pattern detection',
      'Protocol alert',
      'Coordinator review',
      'Learning loop',
    ]);
  });

  test('includes the event artifacts required for a submission package', () => {
    expect(gitHubChecklist).toContain('README');
    expect(contentChecklist).toContain('Demo video');
    expect(contentChecklist).toContain('Live demo');
  });
});
