/**
 * Hindsight Memory Service
 * SERVER-SIDE ONLY.
 * 
 * Provides longitudinal patient memory capabilities:
 * - retain: Ingests unstructured patient check-ins, reported symptoms, and AE notes.
 * - recall: Performs semantic/fact retrieval over a patient's historical records.
 * - reflect: Synthesizes high-level clinical compliance insights grounded in retained facts.
 * - mental models: Tracks evolving longitudinal patient status and recurring symptoms.
 * 
 * Handles fallback mock mode when HINDSIGHT_API_KEY is unset (e.g. offline dev/testing).
 */

import { buildBankId, getHindsightClient } from '@/lib/hindsight';

export interface RetainMemoryResult {
  ok: boolean;
  bankId: string;
  operationId?: string;
  mode: 'live' | 'mock';
  message: string;
}

export interface RecallMemoryResult {
  ok: boolean;
  bankId: string;
  query: string;
  results: Array<{
    id: string;
    text: string;
    type?: string;
    score?: number;
    timestamp?: string;
    metadata?: Record<string, string>;
  }>;
  mode: 'live' | 'mock';
}

export interface ReflectMemoryResult {
  ok: boolean;
  bankId: string;
  query: string;
  answer: string;
  basedOnFacts?: string[];
  mode: 'live' | 'mock';
}

export interface MentalModelResult {
  id: string;
  name: string;
  sourceQuery: string;
  content?: string;
  status?: string;
  mode: 'live' | 'mock';
}

// In-memory mock store for offline dev & unit tests
const mockMemoryStore: Map<
  string,
  {
    memories: Array<{ text: string; timestamp: string; metadata?: Record<string, string>; tags?: string[] }>;
    mentalModels: Array<{ id: string; name: string; sourceQuery: string; content?: string }>;
  }
> = new Map();

function isLiveMode(): boolean {
  return process.env.HINDSIGHT_MODE !== 'mock' && Boolean(process.env.HINDSIGHT_API_KEY && process.env.HINDSIGHT_API_URL);
}

/**
 * Ensure a Hindsight bank exists for the patient.
 */
export async function ensurePatientBankExists(
  trialId: string,
  patientId: string
): Promise<{ bankId: string; mode: 'live' | 'mock' }> {
  const bankId = buildBankId(trialId, patientId);

  if (!isLiveMode()) {
    if (!mockMemoryStore.has(bankId)) {
      mockMemoryStore.set(bankId, { memories: [], mentalModels: [] });
    }
    return { bankId, mode: 'mock' };
  }

  try {
    const client = getHindsightClient();
    await client.createBank(bankId, {
      name: `Bank for Trial ${trialId} Patient ${patientId}`,
      reflectMission:
        'You are a clinical trial compliance memory engine. Reason strictly over patient observations, symptom timelines, and protocol constraints.',
      enableObservations: true,
      enableTemporalRetrieval: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Ignore 409 Conflict if bank already exists
    if (!msg.includes('409') && !msg.includes('already exists')) {
      console.warn(`[hindsight-memory] Bank creation warning for ${bankId}:`, msg);
    }
  }

  return { bankId, mode: 'live' };
}

/**
 * Retain a patient observation, symptom report, or check-in response in Hindsight.
 */
export async function retainPatientObservation(
  trialId: string,
  patientId: string,
  text: string,
  options?: {
    timestamp?: Date | string;
    metadata?: Record<string, string>;
    tags?: string[];
    context?: string;
  }
): Promise<RetainMemoryResult> {
  const { bankId, mode } = await ensurePatientBankExists(trialId, patientId);
  const isoTimestamp = typeof options?.timestamp === 'string'
    ? options.timestamp
    : (options?.timestamp ?? new Date()).toISOString();

  if (mode === 'mock') {
    const bank = mockMemoryStore.get(bankId)!;
    bank.memories.push({
      text,
      timestamp: isoTimestamp,
      metadata: options?.metadata,
      tags: options?.tags,
    });
    return {
      ok: true,
      bankId,
      mode: 'mock',
      message: 'Memory retained in mock store',
    };
  }

  const client = getHindsightClient();
  const response = await client.retain(bankId, text, {
    timestamp: isoTimestamp,
    context: options?.context ?? `Patient check-in observation for ${patientId}`,
    metadata: options?.metadata,
    tags: options?.tags,
  });

  return {
    ok: true,
    bankId,
    operationId: response.operation_id ?? undefined,
    mode: 'live',
    message: 'Memory retained in Hindsight Cloud',
  };
}

/**
 * Recall relevant facts or observations from a patient's Hindsight memory bank.
 */
export async function recallPatientMemory(
  trialId: string,
  patientId: string,
  query: string,
  options?: {
    tags?: string[];
    maxTokens?: number;
  }
): Promise<RecallMemoryResult> {
  const bankId = buildBankId(trialId, patientId);

  if (!isLiveMode()) {
    const bank = mockMemoryStore.get(bankId) ?? { memories: [], mentalModels: [] };
    const queryLower = query.toLowerCase();
    
    // Simple mock keyword match for offline dev/tests
    const matched = bank.memories
      .filter((m) => m.text.toLowerCase().includes(queryLower) || queryLower === '*')
      .map((m, idx) => ({
        id: `mock-mem-${idx}`,
        text: m.text,
        type: 'observation',
        score: 0.9,
        timestamp: m.timestamp,
        metadata: m.metadata,
      }));

    return {
      ok: true,
      bankId,
      query,
      results: matched.length > 0 ? matched : bank.memories.slice(-5).map((m, idx) => ({
        id: `mock-mem-fallback-${idx}`,
        text: m.text,
        type: 'observation',
        score: 0.7,
        timestamp: m.timestamp,
        metadata: m.metadata,
      })),
      mode: 'mock',
    };
  }

  const client = getHindsightClient();
  const res = await client.recall(bankId, query, {
    tags: options?.tags,
    maxTokens: options?.maxTokens ?? 2048,
    preferObservations: true,
  });

  const results = (res.results ?? []).map((r, idx) => {
    const scoreVal = r.scores?.final ?? r.scores?.reranker ?? r.scores?.semantic ?? undefined;
    return {
      id: r.id ?? `fact-${idx}`,
      text: r.text ?? '',
      type: r.type ?? undefined,
      score: scoreVal,
      timestamp: r.occurred_start ?? r.mentioned_at ?? undefined,
      metadata: r.metadata ?? undefined,
    };
  });

  return {
    ok: true,
    bankId,
    query,
    results,
    mode: 'live',
  };
}

/**
 * Perform a Reflect query over patient memory to generate contextual reasoning.
 */
export async function reflectOnPatientState(
  trialId: string,
  patientId: string,
  query: string,
  options?: {
    context?: string;
    tags?: string[];
  }
): Promise<ReflectMemoryResult> {
  const bankId = buildBankId(trialId, patientId);

  if (!isLiveMode()) {
    const recallRes = await recallPatientMemory(trialId, patientId, query);
    const facts = recallRes.results.map((r) => r.text);
    return {
      ok: true,
      bankId,
      query,
      answer: facts.length > 0
        ? `[Mock Reflection] Based on ${facts.length} retained facts for patient ${patientId}: ${facts.join('; ')}`
        : `[Mock Reflection] No previous facts retained for patient ${patientId}.`,
      basedOnFacts: facts,
      mode: 'mock',
    };
  }

  const client = getHindsightClient();
  const res = await client.reflect(bankId, query, {
    context: options?.context,
    tags: options?.tags,
    includeFacts: true,
  });

  const basedOnFacts: string[] = [];
  if (res.based_on) {
    if (Array.isArray(res.based_on.memories)) {
      res.based_on.memories.forEach((m) => {
        if (m.text) basedOnFacts.push(m.text);
      });
    }
  }

  return {
    ok: true,
    bankId,
    query,
    answer: res.text ?? '',
    basedOnFacts,
    mode: 'live',
  };
}

/**
 * Create or update a Mental Model for tracking evolving patient status over time.
 */
export async function createPatientMentalModel(
  trialId: string,
  patientId: string,
  name: string,
  sourceQuery: string
): Promise<MentalModelResult> {
  const bankId = buildBankId(trialId, patientId);

  if (!isLiveMode()) {
    const bank = mockMemoryStore.get(bankId) ?? { memories: [], mentalModels: [] };
    const id = `mm-${Date.now()}`;
    const mm = { id, name, sourceQuery, content: `[Mock Mental Model for ${name}]: synthesized from query "${sourceQuery}"` };
    bank.mentalModels.push(mm);
    mockMemoryStore.set(bankId, bank);
    return {
      id,
      name,
      sourceQuery,
      content: mm.content,
      mode: 'mock',
    };
  }

  const client = getHindsightClient();
  const res = await client.createMentalModel(bankId, name, sourceQuery);
  return {
    id: res.mental_model_id ?? name,
    name,
    sourceQuery,
    mode: 'live',
  };
}

/**
 * Get all Mental Models active for a patient.
 */
export async function getPatientMentalModels(
  trialId: string,
  patientId: string
): Promise<MentalModelResult[]> {
  const bankId = buildBankId(trialId, patientId);

  if (!isLiveMode()) {
    const bank = mockMemoryStore.get(bankId);
    return (bank?.mentalModels ?? []).map((mm) => ({
      ...mm,
      mode: 'mock',
    }));
  }

  const client = getHindsightClient();
  const res = await client.listMentalModels(bankId, { detail: 'content' });
  return (res.items ?? []).map((mm) => ({
    id: mm.id ?? '',
    name: mm.name ?? '',
    sourceQuery: mm.source_query ?? '',
    content: mm.content ?? undefined,
    mode: 'live',
  }));
}
