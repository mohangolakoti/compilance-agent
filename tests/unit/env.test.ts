import { checkEnvHealth, getOptionalEnv } from '@/lib/env';
import { buildBankId } from '@/lib/hindsight';

describe('Phase 1 Infrastructure - Env & Helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('checkEnvHealth reports missing required environment variables when unset', () => {
    delete process.env.MONGODB_URI;
    delete process.env.HINDSIGHT_API_KEY;
    delete process.env.HINDSIGHT_API_URL;
    delete process.env.GROQ_API_KEY;

    const health = checkEnvHealth();
    expect(health.ok).toBe(false);
    expect(health.missing).toContain('MONGODB_URI');
    expect(health.missing).toContain('HINDSIGHT_API_KEY');
    expect(health.missing).toContain('HINDSIGHT_API_URL');
    expect(health.missing).toContain('GROQ_API_KEY');
  });

  test('checkEnvHealth reports ok when all required vars are set', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.HINDSIGHT_API_KEY = 'test_key';
    process.env.HINDSIGHT_API_URL = 'https://api.hindsight.vectorize.io';
    process.env.GROQ_API_KEY = 'test_groq_key';

    const health = checkEnvHealth();
    expect(health.ok).toBe(true);
    expect(health.missing.length).toBe(0);
  });

  test('getOptionalEnv returns default value when optional var is unset', () => {
    delete process.env.GROQ_MODEL;
    expect(getOptionalEnv('GROQ_MODEL')).toBe('openai/gpt-oss-120b');
  });

  test('buildBankId produces standardized bank IDs adhering to PRD rule: trial_<trialId>_patient_<patientId>', () => {
    const bankId = buildBankId('TRIAL-101', 'PATIENT-007');
    expect(bankId).toBe('trial_TRIAL-101_patient_PATIENT-007');
  });

  test('buildBankId sanitizes unsafe characters safely', () => {
    const bankId = buildBankId('trial/123!', 'patient@456#');
    expect(bankId).toBe('trial_trial-123-_patient_patient-456-');
  });

  test('buildBankId throws error if trialId or patientId is empty', () => {
    expect(() => buildBankId('', 'P001')).toThrow();
    expect(() => buildBankId('T001', '')).toThrow();
  });
});
