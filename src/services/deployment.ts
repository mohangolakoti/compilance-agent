export type DeploymentChecklistItem = {
  step: string;
  ok: boolean;
  detail: string;
};

export function getRequiredProductionEnv(): string[] {
  return [
    'MONGODB_URI',
    'HINDSIGHT_API_KEY',
    'HINDSIGHT_API_URL',
    'GROQ_API_KEY',
    'NEXT_PUBLIC_APP_URL',
  ];
}

export function buildDeploymentChecklist(args: {
  appUrl: string;
  envReady: boolean;
  dbReady: boolean;
  memoryReady: boolean;
  llmReady: boolean;
}): DeploymentChecklistItem[] {
  return [
    {
      step: 'Configure Vercel environment variables',
      ok: args.envReady,
      detail: args.envReady
        ? 'Required production environment values are present.'
        : 'Add the production env values before deployment.',
    },
    {
      step: 'Deploy to Vercel',
      ok: Boolean(args.appUrl),
      detail: args.appUrl
        ? `Production URL is set to ${args.appUrl}.`
        : 'Set a stable frontend URL before production rollout.',
    },
    {
      step: 'Seed synthetic data and verify MongoDB',
      ok: args.dbReady,
      detail: args.dbReady
        ? 'MongoDB connectivity and seed data are ready.'
        : 'Connect MongoDB Atlas and run the seed script.',
    },
    {
      step: 'Configure Hindsight Cloud memory bank',
      ok: args.memoryReady,
      detail: args.memoryReady
        ? 'Hindsight Cloud is configured for patient memory operations.'
        : 'Verify the Hindsight API credentials and bank configuration.',
    },
    {
      step: 'Run smoke tests against the production app',
      ok: args.llmReady,
      detail: args.llmReady
        ? 'LLM and health checks are ready for launch.'
        : 'Validate the first response path, LLM health, and coordinator flow.',
    },
    {
      step: 'Validate coordinator + memory + protocol workflow',
      ok: args.llmReady && args.memoryReady && args.dbReady,
      detail: 'The end-to-end hero patient scenario must complete successfully.',
    },
  ];
}

export function getVercelSetup(args: {
  projectName: string;
  region: string;
  framework: string;
}): {
  projectName: string;
  region: string;
  framework: string;
  buildCommand: string;
  installCommand: string;
  outputDirectory: string;
} {
  return {
    projectName: args.projectName,
    region: args.region,
    framework: args.framework,
    buildCommand: 'npm run build',
    installCommand: 'npm install',
    outputDirectory: '.next',
  };
}
