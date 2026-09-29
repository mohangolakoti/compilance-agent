/**
 * Hindsight Cloud client singleton.
 * SERVER-SIDE ONLY. Never import from client components.
 *
 * Uses the official @vectorize-io/hindsight-client SDK.
 * Bank naming convention: trial_<trialId>_patient_<patientId>
 */

import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_API_URL = process.env.HINDSIGHT_API_URL;
const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY;

declare global {
  // eslint-disable-next-line no-var
  var __hindsightClient: HindsightClient | undefined;
}

/**
 * Get the Hindsight client singleton.
 * Throws a descriptive error if credentials are not configured.
 */
export function getHindsightClient(): HindsightClient {
  if (global.__hindsightClient) {
    return global.__hindsightClient;
  }

  if (!HINDSIGHT_API_URL) {
    throw new Error(
      '[hindsight] HINDSIGHT_API_URL environment variable is not set. ' +
        'Add it to .env.local (see .env.example).'
    );
  }

  if (!HINDSIGHT_API_KEY) {
    throw new Error(
      '[hindsight] HINDSIGHT_API_KEY environment variable is not set. ' +
        'Add it to .env.local (see .env.example).'
    );
  }

  const client = new HindsightClient({
    baseUrl: HINDSIGHT_API_URL,
    apiKey: HINDSIGHT_API_KEY,
  });

  if (process.env.NODE_ENV === 'development') {
    global.__hindsightClient = client;
  }

  return client;
}

/**
 * Construct a patient-specific Hindsight bank ID.
 * This is the ONLY approved way to build a bank ID.
 * Never construct bank IDs from client-supplied input.
 */
export function buildBankId(trialId: string, patientId: string): string {
  if (!trialId || !patientId) {
    throw new Error('[hindsight] trialId and patientId are required to build a bank ID.');
  }
  // Sanitize: allow only alphanumeric and hyphens
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9-]/g, '-');
  return `trial_${safe(trialId)}_patient_${safe(patientId)}`;
}

/**
 * Check if Hindsight is reachable without throwing.
 */
export async function checkHindsightHealth(): Promise<{
  ok: boolean;
  status: string;
  error?: string;
}> {
  try {
    const client = getHindsightClient();
    // Attempt to create/verify a canary bank as a connectivity check
    const testBankId = 'health-check-canary';
    await client.createBank(testBankId, {
      name: 'Health Check Canary',
    });
    return { ok: true, status: 'connected' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A 409/already-exists error is fine — it means we CAN reach Hindsight
    if (
      message.includes('409') ||
      message.includes('already exists') ||
      message.includes('conflict')
    ) {
      return { ok: true, status: 'connected' };
    }
    return {
      ok: false,
      status: 'error',
      error: message,
    };
  }
}
