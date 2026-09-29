/**
 * Environment variable validation.
 * This module is SERVER-SIDE ONLY. Never import from client components.
 * Fails fast at startup if required variables are missing.
 */

const required = [
  'MONGODB_URI',
  'HINDSIGHT_API_KEY',
  'HINDSIGHT_API_URL',
  'GROQ_API_KEY',
] as const;

const optional = {
  GROQ_MODEL: 'openai/gpt-oss-120b',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NODE_ENV: 'development',
} as const;

type RequiredEnvKey = (typeof required)[number];
type OptionalEnvKey = keyof typeof optional;
export type EnvKey = RequiredEnvKey | OptionalEnvKey;

function validateEnv(): void {
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables:\n  ${missing.join('\n  ')}\n\n` +
        `Copy .env.example to .env.local and fill in all values.`
    );
  }
}

/**
 * Get a required environment variable. Throws if missing.
 */
export function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[env] Required environment variable "${key}" is not set.`);
  }
  return value;
}

/**
 * Get an optional environment variable with a fallback default.
 */
export function getOptionalEnv(key: OptionalEnvKey): string {
  return process.env[key] ?? optional[key];
}

/**
 * Validate all required environment variables are present.
 * Call once at startup / in integration layers.
 */
export function assertEnv(): void {
  validateEnv();
}

/**
 * Check environment health without throwing.
 * Returns which variables are present / missing.
 */
export function checkEnvHealth(): {
  ok: boolean;
  present: string[];
  missing: string[];
} {
  const present: string[] = [];
  const missing: string[] = [];

  for (const key of required) {
    if (process.env[key]) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  return { ok: missing.length === 0, present, missing };
}
