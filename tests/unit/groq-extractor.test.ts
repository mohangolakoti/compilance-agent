import {
  extractCheckInData,
  heuristicExtractCheckIn,
} from '@/services/groq-extractor';
import { CheckInExtractionSchema } from '@/lib/schemas/checkin-extraction';

describe('Phase 4 — Groq Extractor Unit Tests', () => {
  test('CheckInExtractionSchema validates compliant payload structure', () => {
    const sample = {
      doseTaken: true,
      doseTimestamp: '08:15 AM',
      doseDelayMinutes: 15,
      symptoms: [{ name: 'nausea', severity: 'mild' }],
      concomitantMedications: [{ name: 'ibuprofen', dose: '400mg' }],
      distressScore: 3,
    };

    const parsed = CheckInExtractionSchema.parse(sample);
    expect(parsed.doseTaken).toBe(true);
    expect(parsed.symptoms[0].severity).toBe('mild');
    expect(parsed.concomitantMedications[0].name).toBe('ibuprofen');
  });

  test('heuristicExtractCheckIn accurately parses skipped dose and concomitant aspirin', () => {
    const text = 'Skipped morning dose today because I threw up yesterday. Took aspirin for headache.';
    const result = heuristicExtractCheckIn(text);

    expect(result.doseTaken).toBe(false);
    expect(result.symptoms.some((s) => s.name === 'vomiting')).toBe(true);
    expect(result.concomitantMedications.some((m) => m.name === 'aspirin')).toBe(true);
    expect(result.distressScore).toBeGreaterThanOrEqual(4);
  });

  test('heuristicExtractCheckIn extracts dose timestamp and calculates delay', () => {
    const text = 'Took my medicine at 09:30 AM with breakfast.';
    const result = heuristicExtractCheckIn(text);

    expect(result.doseTaken).toBe(true);
    expect(result.doseTimestamp).toBe('09:30 AM');
    expect(result.doseDelayMinutes).toBe(90); // 09:30 AM vs target 08:00 AM = 90 min
  });

  test('extractCheckInData returns structured result in live or fallback mode', async () => {
    const text = 'Took morning dose at 8:00 AM. Feeling good!';
    const result = await extractCheckInData(text);

    expect(result.data).toBeDefined();
    expect(result.data.doseTaken).toBe(true);
    expect(['live', 'heuristic_fallback']).toContain(result.mode);
  });
});
