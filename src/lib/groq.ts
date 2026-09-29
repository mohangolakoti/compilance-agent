/**
 * Groq client singleton.
 * SERVER-SIDE ONLY. Never import from client components.
 *
 * Uses the official groq-sdk.
 * Primary model: openai/gpt-oss-120b
 */

import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

declare global {
  // eslint-disable-next-line no-var
  var __groqClient: Groq | undefined;
}

/**
 * Get the Groq client singleton.
 * Throws a descriptive error if credentials are not configured.
 */
export function getGroqClient(): Groq {
  if (global.__groqClient) {
    return global.__groqClient;
  }

  if (!GROQ_API_KEY) {
    throw new Error(
      '[groq] GROQ_API_KEY environment variable is not set. ' +
        'Add it to .env.local (see .env.example).'
    );
  }

  const client = new Groq({ apiKey: GROQ_API_KEY });

  if (process.env.NODE_ENV === 'development') {
    global.__groqClient = client;
  }

  return client;
}

/**
 * Default model for all structured extraction and agent tasks.
 */
export const GROQ_DEFAULT_MODEL =
  process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

/**
 * Check if Groq is reachable without throwing.
 */
export async function checkGroqHealth(): Promise<{
  ok: boolean;
  status: string;
  model: string;
  error?: string;
}> {
  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [{ role: 'user', content: 'Reply with the word "ok" only.' }],
      max_tokens: 5,
      temperature: 0,
    });
    const reply = completion.choices[0]?.message?.content ?? '';
    return {
      ok: reply.toLowerCase().includes('ok') || reply.length > 0,
      status: 'connected',
      model: GROQ_DEFAULT_MODEL,
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      model: GROQ_DEFAULT_MODEL,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
