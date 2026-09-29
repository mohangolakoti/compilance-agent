import { buildDeploymentChecklist, getRequiredProductionEnv, getVercelSetup } from '@/services/deployment';

describe('Phase 14 — deployment readiness', () => {
  test('lists the required production environment variables for Vercel', () => {
    const env = getRequiredProductionEnv();

    expect(env).toContain('MONGODB_URI');
    expect(env).toContain('HINDSIGHT_API_KEY');
    expect(env).toContain('HINDSIGHT_API_URL');
    expect(env).toContain('GROQ_API_KEY');
  });

  test('builds the production deployment checklist with the required steps', () => {
    const checklist = buildDeploymentChecklist({
      appUrl: 'https://demo.example.com',
      envReady: true,
      dbReady: true,
      memoryReady: true,
      llmReady: true,
    });

    expect(checklist.every((item) => item.ok)).toBe(true);
    expect(checklist.some((item) => item.step.includes('Deploy to Vercel'))).toBe(true);
  });

  test('produces a Vercel-ready configuration object', () => {
    const config = getVercelSetup({
      projectName: 'clinical-trial-compliance-agent',
      region: 'iad1',
      framework: 'nextjs',
    });

    expect(config.projectName).toBe('clinical-trial-compliance-agent');
    expect(config.region).toBe('iad1');
    expect(config.framework).toBe('nextjs');
  });
});
