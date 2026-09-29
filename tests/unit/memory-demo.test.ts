import { buildMemoryDemoForPatient } from '@/services/memory-demo';

describe('Phase 11 — Memory demo', () => {
  test('builds a clear without-memory vs with-hindsight comparison for the selected patient', async () => {
    const demo = await buildMemoryDemoForPatient('CT-2026-X', 'P1047');

    expect(demo.patientId).toBe('P1047');
    expect(demo.trialId).toBe('CT-2026-X');
    expect(demo.withoutMemory).toContain('late dose');
    expect(demo.withHindsight).toMatch(/fatigue|dose|pattern|history/i);
    expect(Array.isArray(demo.historicalEvidence)).toBe(true);
    expect(demo.historicalEvidence.length).toBeGreaterThan(0);
    expect(Array.isArray(demo.patternDiscovery)).toBe(true);
  });
});
