import { generateSyntheticDataset, generateBenchmarkQuestions } from '@/services/synthetic-dataset';

describe('Phase 12 — Synthetic dataset and benchmark', () => {
  test('generates a realistic dataset and benchmark question pack for the trial', () => {
    const dataset = generateSyntheticDataset('CT-2026-X');

    expect(dataset.trialId).toBe('CT-2026-X');
    expect(dataset.patients.length).toBeGreaterThanOrEqual(10);
    expect(dataset.patients.length).toBeLessThanOrEqual(15);
    expect(dataset.patients.some((patient) => patient.patientId === 'P1047')).toBe(true);
    expect(Array.isArray(dataset.benchmarkQuestions)).toBe(true);
    expect(dataset.benchmarkQuestions.some((q) => /why was .* flagged|pattern|fatigue/i.test(q.question))).toBe(true);
  });

  test('creates benchmark questions aligned to the coordinator workflow', () => {
    const questions = generateBenchmarkQuestions('CT-2026-X');

    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(questions.some((q) => q.patientId === 'P1047')).toBe(true);
    expect(questions[0].question).toMatch(/flagged|reason|pattern/i);
  });
});
