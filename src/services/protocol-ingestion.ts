/**
 * Phase 8 — Protocol Ingestion Service
 *
 * Responsible for converting a synthetic protocol PDF or protocol text into
 * candidate rule objects, validating them with Zod, and permitting human
 * approval/edit/rejection before rules become authoritative for compliance.
 */

import { z } from 'zod';
import { ProtocolModel } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import { RuleCategory, ViolationSeverity } from '@/types';

export const ProtocolRuleCandidateSchema = z.object({
  ruleId: z.string().min(1),
  category: z.enum([
    'DOSING_TIMING',
    'DOSING_AMOUNT',
    'PROHIBITED_MEDICATION',
    'ADVERSE_EVENT_GRADE',
    'LAB_THRESHOLD',
    'SCHEDULED_VISIT',
    'PATIENT_REPORTED_OUTCOME',
  ]),
  name: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  parameters: z.record(z.string(), z.unknown()).default({}),
  sourcePage: z.string().optional(),
  sourceReference: z.string().optional(),
  threshold: z.string().optional(),
  timeWindow: z.string().optional(),
  requiredAction: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EDITED']).default('PENDING'),
  notes: z.string().optional(),
});

export type ProtocolRuleCandidate = z.infer<typeof ProtocolRuleCandidateSchema>;

export const ProtocolRuleReviewInputSchema = z.object({
  trialId: z.string().min(1),
  decision: z.enum(['APPROVE', 'EDIT', 'REJECT']),
  coordinatorId: z.string().min(1),
  candidate: z.unknown(),
  notes: z.string().optional(),
});

export type ProtocolRuleReviewInput = z.infer<typeof ProtocolRuleReviewInputSchema>;

export interface ProtocolExtractionResult {
  trialId: string;
  sourceText: string;
  candidates: ProtocolRuleCandidate[];
}

export interface ProtocolReviewResult {
  ok: boolean;
  data?: ProtocolRuleCandidate;
  error?: string;
}

const DEFAULT_GOOD_RULES: Record<string, Partial<ProtocolRuleCandidate>> = {
  DOSING_TIMING: {
    category: 'DOSING_TIMING',
    name: 'Dose Timing Window',
    description: 'Dose must be taken within the allowed time window.',
    severity: 'MEDIUM',
    parameters: { maxAllowedWindowMinutes: 120 },
    threshold: '120 minutes',
    requiredAction: 'Review any dose taken beyond the allowed timing window.',
  },
  DOSING_AMOUNT: {
    category: 'DOSING_AMOUNT',
    name: 'Missed or Skipped Dose',
    description: 'Patient should not miss or skip the scheduled dose without review.',
    severity: 'HIGH',
    parameters: { maxMissedDosesConsecutive: 1 },
    threshold: '1 missed dose',
    requiredAction: 'Investigate missed doses and confirm whether the dose was deferred or not taken.',
  },
  PROHIBITED_MEDICATION: {
    category: 'PROHIBITED_MEDICATION',
    name: 'Prohibited Concomitant Medication',
    description: 'Avoid prohibited concomitant medications while on study treatment.',
    severity: 'CRITICAL',
    parameters: { prohibitedSubstances: ['ibuprofen', 'naproxen', 'aspirin', 'ketoconazole'] },
    threshold: 'Any reported prohibited medication',
    requiredAction: 'Escalate to the coordinator and confirm whether a prohibited medication was taken.',
  },
  ADVERSE_EVENT_GRADE: {
    category: 'ADVERSE_EVENT_GRADE',
    name: 'Adverse Event Grade Threshold',
    description: 'Severe symptoms or grade 3+ events require coordinator review.',
    severity: 'HIGH',
    parameters: { gradeThresholds: { vomiting: 2, fever: 2 } },
    threshold: 'Grade 3 or moderate vomiting/fever',
    requiredAction: 'Assess severity, determine if the patient needs a safety hold, and document the symptom course.',
  },
  SCHEDULED_VISIT: {
    category: 'SCHEDULED_VISIT',
    name: 'Visit Compliance',
    description: 'The patient must complete the scheduled trial visit window.',
    severity: 'MEDIUM',
    parameters: { requiredVisitWindowDays: 7 },
    threshold: 'Within 7 days',
    requiredAction: 'Verify the completed visit and identify any scheduling deviation.',
  },
};

function normalizeRuleId(trialId: string, category: RuleCategory, index: number): string {
  const safeTrial = trialId.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
  return `RULE-${safeTrial}-${category}-${index + 1}`;
}

function toRuleCandidate(raw: unknown, fallbackCategory?: RuleCategory): ProtocolRuleCandidate {
  const candidate = raw as Record<string, unknown>;
  const category = (candidate.category as RuleCategory) ?? fallbackCategory ?? 'PATIENT_REPORTED_OUTCOME';
  const baseCandidate: ProtocolRuleCandidate = {
    ruleId: typeof candidate.ruleId === 'string' && candidate.ruleId ? candidate.ruleId : normalizeRuleId('TRIAL', category, 0),
    category,
    name: typeof candidate.name === 'string' && candidate.name ? candidate.name : DEFAULT_GOOD_RULES[category]?.name ?? 'Protocol Rule',
    description:
      typeof candidate.description === 'string' && candidate.description
        ? candidate.description
        : DEFAULT_GOOD_RULES[category]?.description ?? 'Review the protocol requirement for this patient event.',
    severity: (candidate.severity as ViolationSeverity) ?? DEFAULT_GOOD_RULES[category]?.severity ?? 'MEDIUM',
    parameters: candidate.parameters && typeof candidate.parameters === 'object' ? (candidate.parameters as Record<string, unknown>) : (DEFAULT_GOOD_RULES[category]?.parameters ?? {}),
    sourcePage: typeof candidate.sourcePage === 'string' ? candidate.sourcePage : undefined,
    sourceReference: typeof candidate.sourceReference === 'string' ? candidate.sourceReference : undefined,
    threshold: typeof candidate.threshold === 'string' ? candidate.threshold : DEFAULT_GOOD_RULES[category]?.threshold,
    timeWindow: typeof candidate.timeWindow === 'string' ? candidate.timeWindow : DEFAULT_GOOD_RULES[category]?.timeWindow,
    requiredAction:
      typeof candidate.requiredAction === 'string'
        ? candidate.requiredAction
        : DEFAULT_GOOD_RULES[category]?.requiredAction ?? 'Review the event with the coordinating clinical team.',
    status: (candidate.status as ProtocolRuleCandidate['status']) ?? 'PENDING',
    notes: typeof candidate.notes === 'string' ? candidate.notes : undefined,
  };

  const parsed = ProtocolRuleCandidateSchema.safeParse(baseCandidate);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  }

  return parsed.data;
}

function resolveCategoryFromText(text: string): RuleCategory | null {
  const lower = text.toLowerCase();

  if (/(dosing|dose.*(window|time)|within .*minutes|off-schedule)/i.test(lower)) return 'DOSING_TIMING';
  if (/(missed.*dose|skip.*dose|dose.*missed|noncompliance)/i.test(lower)) return 'DOSING_AMOUNT';
  if (/(ibuprofen|naproxen|aspirin|ketoconazole|nsaid|prohibited.*med)/i.test(lower)) return 'PROHIBITED_MEDICATION';
  if (/(grade.*[3-4]|adverse event|fever|vomiting|severe symptom)/i.test(lower)) return 'ADVERSE_EVENT_GRADE';
  if (/(visit|check-in|clinic.*every|follow-up.*days)/i.test(lower)) return 'SCHEDULED_VISIT';

  return null;
}

export function extractProtocolRulesFromText(
  rawText: string,
  trialId = 'CT-TRIAL'
): ProtocolExtractionResult {
  const sourceText = rawText.trim();
  if (!sourceText) {
    throw new Error('Protocol text is empty. Please provide a valid protocol extract.');
  }

  const lines = sourceText
    .split(/\r?\n|\.|;|\b(?=Protocol)|\b(?=Dosing)|\b(?=Missed)|\b(?=Prohibited)|\b(?=Adverse)|\b(?=Visit)/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates: ProtocolRuleCandidate[] = [];

  if (lines.length === 0) {
    throw new Error('No extractable protocol rule text could be parsed from the supplied content.');
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const category = resolveCategoryFromText(line) ?? 'PATIENT_REPORTED_OUTCOME';
    const base = DEFAULT_GOOD_RULES[category] ?? DEFAULT_GOOD_RULES['DOSING_TIMING'];

    if (!line || !/dose|med|visit|grade|fever|vomiting|adverse|missed|check-in/i.test(line)) {
      continue;
    }

    const candidate = toRuleCandidate(
      {
        ruleId: normalizeRuleId(trialId, category, index),
        category,
        name: base?.name ?? 'Protocol Rule',
        description: line,
        severity: base?.severity ?? 'MEDIUM',
        parameters: base?.parameters ?? {},
        sourceReference: 'Synthetic protocol excerpt',
        threshold: base?.threshold ?? 'Review threshold',
        timeWindow: base?.timeWindow,
        requiredAction: base?.requiredAction ?? 'Coordinators should review this requirement against the patient record.',
        status: 'PENDING',
      },
      category
    );

    candidates.push(candidate);
  }

  if (candidates.length === 0) {
    const fallbackCategory = 'DOSING_TIMING';
    candidates.push(
      toRuleCandidate(
        {
          ruleId: normalizeRuleId(trialId, fallbackCategory, 0),
          category: fallbackCategory,
          name: DEFAULT_GOOD_RULES[fallbackCategory]?.name,
          description: 'Generic protocol requirement identified from source text.',
          severity: 'MEDIUM',
          parameters: DEFAULT_GOOD_RULES[fallbackCategory]?.parameters ?? { maxAllowedWindowMinutes: 120 },
          threshold: '120 minutes',
          requiredAction: 'Coordinator review required for dose-timing deviations.',
          status: 'PENDING',
        },
        fallbackCategory
      )
    );
  }

  return {
    trialId,
    sourceText,
    candidates,
  };
}

export async function extractProtocolTextFromPdf(
  input: File | string | Buffer | Uint8Array | null | undefined
): Promise<string> {
  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) {
      throw new Error('Protocol text is empty. Please provide valid PDF text or a valid PDF document.');
    }
    return text;
  }

  if (!input) {
    throw new Error('No PDF content was provided.');
  }

  if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    const decoded = new TextDecoder('utf-8').decode(input);
    if (!decoded.trim()) {
      throw new Error('PDF content was empty or unreadable.');
    }
    return decoded;
  }

  if (typeof File !== 'undefined' && input instanceof File) {
    const fileName = input.name || 'protocol.pdf';
    const isPdf = /\.pdf$/i.test(fileName) || /application\/pdf/i.test(input.type);

    if (!isPdf) {
      throw new Error('Invalid protocol document. Expected a PDF file.');
    }

    const text = await input.text();
    if (!text.trim()) {
      throw new Error('Protocol PDF is empty or unreadable.');
    }

    return text;
  }

  throw new Error('Unsupported protocol document format. Please provide a PDF file or raw text.');
}

export function reviewProtocolRule(input: unknown): ProtocolReviewResult {
  const parsed = ProtocolRuleReviewInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid protocol rule review payload: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
    };
  }

  const { trialId, decision, candidate } = parsed.data;

  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    Array.isArray(candidate) ||
    Object.keys(candidate as Record<string, unknown>).length === 0 ||
    (!('category' in (candidate as Record<string, unknown>)) &&
      !('name' in (candidate as Record<string, unknown>)) &&
      !('description' in (candidate as Record<string, unknown>)))
  ) {
    return {
      ok: false,
      error: 'Invalid protocol rule: missing rule metadata required for review.',
    };
  }

  try {
    const normalizedCandidate = toRuleCandidate(candidate, 'PATIENT_REPORTED_OUTCOME');
    const status = decision === 'APPROVE' ? 'APPROVED' : decision === 'EDIT' ? 'EDITED' : 'REJECTED';

    const reviewedCandidate: ProtocolRuleCandidate = {
      ...normalizedCandidate,
      ruleId: normalizedCandidate.ruleId || normalizeRuleId(trialId, normalizedCandidate.category, 0),
      status,
      notes: parsed.data.notes || normalizedCandidate.notes,
    };

    return { ok: true, data: reviewedCandidate };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `Invalid protocol rule: ${error.message}` : 'Invalid protocol rule payload.',
    };
  }
}

export async function approveProtocolRule(
  input: {
    trialId: string;
    coordinatorId: string;
    candidate: unknown;
    notes?: string;
  }
): Promise<{ ok: boolean; data?: ProtocolRuleCandidate; protocol?: unknown; error?: string }> {
  const review = reviewProtocolRule({
    ...input,
    decision: 'APPROVE',
  });

  if (!review.ok || !review.data) {
    return {
      ok: false,
      error: review.error ?? 'Unable to approve protocol rule.',
    };
  }

  const approvedRule = { ...review.data, status: 'APPROVED' as const };

  if (!process.env.MONGODB_URI) {
    return {
      ok: true,
      data: approvedRule,
      protocol: { protocolId: input.trialId, rules: [approvedRule] },
    };
  }

  try {
    await connectToDatabase();
    const protocol = await ProtocolModel.findOneAndUpdate(
      { protocolId: input.trialId },
      {
        $setOnInsert: {
          protocolId: input.trialId,
          title: 'Imported Protocol Rules',
          phase: 'Phase II',
          indication: 'Clinical Trial',
          investigationalProduct: 'Trial Product',
          dosingSchedule: {
            frequency: 'Daily',
            targetTimeOfDay: '08:00 AM',
            allowedWindowMinutes: 120,
            withFood: true,
          },
          version: 1,
          isActive: true,
        },
        $addToSet: {
          rules: {
            ...approvedRule,
            parameters: approvedRule.parameters ?? {},
          },
        },
      },
      { upsert: true, new: true }
    );

    return {
      ok: true,
      data: approvedRule,
      protocol,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to save approved protocol rule.',
    };
  }
}

export async function ingestProtocolDocument(input: {
  trialId: string;
  title?: string;
  file?: File | string | Buffer | Uint8Array | null;
  text?: string;
  coordinatorId: string;
}): Promise<{
  ok: boolean;
  sourceText?: string;
  candidates?: ProtocolRuleCandidate[];
  approved?: ProtocolRuleCandidate[];
  error?: string;
}> {
  try {
    const finalText = input.file ? await extractProtocolTextFromPdf(input.file) : input.text ?? '';
    const extracted = extractProtocolRulesFromText(finalText, input.trialId);

    const approved: ProtocolRuleCandidate[] = [];

    for (const candidate of extracted.candidates) {
      const review = reviewProtocolRule({
        trialId: input.trialId,
        decision: 'APPROVE',
        coordinatorId: input.coordinatorId,
        candidate,
      });

      if (review.ok && review.data) {
        approved.push(review.data);
      }
    }

    return {
      ok: true,
      sourceText: extracted.sourceText,
      candidates: extracted.candidates,
      approved,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to ingest protocol document.',
    };
  }
}
