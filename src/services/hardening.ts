export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = 2, delayMs = 50, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      if (onRetry) {
        onRetry(attempt + 1, error);
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function clampToolLoop<T>(tools: T[], maxIterations = 3): T[] {
  return tools.slice(0, Math.min(maxIterations, tools.length));
}

export function createFallbackResponse(
  patientId: string,
  trialId: string,
  reason: string
): {
  ok: false;
  answer: string;
  evidence: string[];
  tools: string[];
  patientId: string;
} {
  return {
    ok: false,
    answer: `Unable to complete the coordinator review for ${patientId} in trial ${trialId} because ${reason}. The system has switched to a safe fallback state and requires manual review.`,
    evidence: [],
    tools: [],
    patientId,
  };
}
