/**
 * Human Feedback Loop Service — Phase 7
 * SERVER-SIDE ONLY.
 *
 * Provides coordinator review, override, and resolution actions for compliance logs.
 *
 * Workflow:
 *   1. Coordinator fetches pending compliance logs that require human review.
 *   2. Coordinator submits a CoordinatorAction (approve / override / escalate / dismiss).
 *   3. Service records the action on the ComplianceLog and creates an immutable AuditEvent.
 *   4. For OVERRIDE or DISMISS actions the service retains a correction memory in Hindsight
 *      so future AI decisions benefit from coordinator judgment.
 *   5. Patient status is updated if the coordinator lifts a safety hold.
 */

import { connectToDatabase } from '@/lib/mongodb';
import {
  ComplianceLogModel,
  AuditEventModel,
  PatientModel,
  IComplianceLogDocument,
} from '@/models';
import { retainPatientObservation } from './hindsight-memory';
import { z } from 'zod';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const CoordinatorActionSchema = z.object({
  /** Unique log ID of the ComplianceLog being reviewed */
  logId: z.string().min(1),
  /** The coordinator's action decision */
  action: z.enum(['APPROVE', 'OVERRIDE', 'ESCALATE', 'DISMISS']),
  /** Human-readable coordinator user identifier (e.g. user email or staff ID) */
  coordinatorId: z.string().min(1),
  /** Optional free-text clinical rationale for the action */
  notes: z.string().optional(),
  /**
   * Only relevant for OVERRIDE: the new status to assign to the compliance log.
   * Required when action === 'OVERRIDE'.
   */
  overrideStatus: z
    .enum(['COMPLIANT', 'NON_COMPLIANT', 'ADVERSE_EVENT', 'SAFETY_VIOLATION', 'REQUIRES_HUMAN_REVIEW'])
    .optional(),
  /**
   * If true, and the patient is currently on safety_hold, the coordinator is
   * authorising removal of the hold. Only honoured for APPROVE or OVERRIDE actions.
   */
  liftSafetyHold: z.boolean().optional(),
});

export type CoordinatorAction = z.infer<typeof CoordinatorActionSchema>;

// ─── Result types ─────────────────────────────────────────────────────────────

export interface CoordinatorReviewResult {
  ok: boolean;
  logId: string;
  action: CoordinatorAction['action'];
  previousStatus: string;
  newStatus: string;
  patientStatusChanged: boolean;
  hindsightCorrectionRetained: boolean;
  auditEventId: string;
  message: string;
}

export interface PendingReviewItem {
  logId: string;
  checkInId: string;
  patientId: string;
  trialId: string;
  evaluatedAt: Date;
  overallStatus: string;
  violationCount: number;
  violationSummary: string[];
  hindsightEvidence: string[];
  reflectionsSummary?: string;
  ageMinutes: number;
}

// ─── Service functions ─────────────────────────────────────────────────────────

/**
 * Fetch all compliance logs that require coordinator action and have not yet
 * been reviewed (coordinatorActionTaken is absent).
 */
export async function getPendingCoordinatorReviews(
  trialId?: string,
  limit = 50
): Promise<PendingReviewItem[]> {
  if (!process.env.MONGODB_URI) {
    // Offline dev: return empty list
    return [];
  }

  await connectToDatabase();

  const query: Record<string, unknown> = {
    requiresCoordinatorAction: true,
    'coordinatorActionTaken.action': { $exists: false },
  };
  if (trialId) {
    query.trialId = trialId;
  }

  const docs = await ComplianceLogModel.find(query)
    .sort({ evaluatedAt: -1 })
    .limit(limit)
    .lean<IComplianceLogDocument[]>();

  const now = Date.now();

  return docs.map((doc) => ({
    logId: doc.logId,
    checkInId: doc.checkInId,
    patientId: doc.patientId,
    trialId: doc.trialId,
    evaluatedAt: doc.evaluatedAt,
    overallStatus: doc.overallStatus,
    violationCount: doc.violations.length,
    violationSummary: doc.violations.map(
      (v) => `[${v.severity}] ${v.ruleName}: ${v.description}`
    ),
    hindsightEvidence: doc.hindsightEvidence ?? [],
    reflectionsSummary: doc.reflectionsSummary,
    ageMinutes: Math.round((now - new Date(doc.evaluatedAt).getTime()) / 60_000),
  }));
}

/**
 * Fetch a single compliance log by its logId for coordinator review.
 */
export async function getComplianceLogForReview(
  logId: string
): Promise<IComplianceLogDocument | null> {
  if (!process.env.MONGODB_URI) return null;

  await connectToDatabase();
  return ComplianceLogModel.findOne({ logId }).lean<IComplianceLogDocument>();
}

/**
 * Submit a coordinator review action for a compliance log.
 *
 * Steps:
 *   1. Validate input with Zod schema.
 *   2. Load the ComplianceLog from MongoDB.
 *   3. Verify it hasn't already been reviewed.
 *   4. Apply the coordinator action (set coordinatorActionTaken).
 *   5. For OVERRIDE: update overallStatus to overrideStatus.
 *   6. For OVERRIDE / DISMISS: retain a Hindsight correction memory so future
 *      AI evaluations learn from coordinator judgment.
 *   7. If liftSafetyHold: update PatientModel status back to 'active'.
 *   8. Write immutable AuditEvent.
 *   9. Return structured result.
 */
export async function submitCoordinatorReview(
  input: CoordinatorAction
): Promise<CoordinatorReviewResult> {
  // Validate
  const parsed = CoordinatorActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `[feedback-service] Invalid coordinator action: ${parsed.error.message}`
    );
  }

  const { logId, action, coordinatorId, notes, overrideStatus, liftSafetyHold } = parsed.data;

  // ── 1. Connect & load log ──────────────────────────────────────────────────
  let logDoc: IComplianceLogDocument | null = null;
  let dbAvailable = false;

  if (process.env.MONGODB_URI) {
    await connectToDatabase();
    dbAvailable = true;
    logDoc = await ComplianceLogModel.findOne({ logId });
  }

  // Offline / mock mode: synthesise a stub log so the function can still run
  if (!logDoc) {
    if (dbAvailable) {
      throw new Error(`[feedback-service] ComplianceLog not found: ${logId}`);
    }
    logDoc = {
      logId,
      checkInId: 'mock-checkin',
      patientId: 'mock-patient',
      trialId: 'mock-trial',
      evaluatedAt: new Date(),
      overallStatus: 'REQUIRES_HUMAN_REVIEW',
      violations: [],
      hindsightEvidence: [],
      requiresCoordinatorAction: true,
    } as unknown as IComplianceLogDocument;
  }

  // ── 2. Guard against double-review ────────────────────────────────────────
  if (logDoc.coordinatorActionTaken?.action) {
    throw new Error(
      `[feedback-service] ComplianceLog ${logId} has already been reviewed ` +
      `(action: ${logDoc.coordinatorActionTaken.action}).`
    );
  }

  const previousStatus = logDoc.overallStatus;
  const now = new Date();

  // ── 3. Determine new status ────────────────────────────────────────────────
  let newStatus: string;
  if (action === 'OVERRIDE' && overrideStatus) {
    newStatus = overrideStatus;
  } else if (action === 'APPROVE') {
    // Coordinator confirms the AI decision — status unchanged
    newStatus = previousStatus;
  } else if (action === 'ESCALATE') {
    // Escalate keeps the status but bumps it into human tracking
    newStatus = previousStatus;
  } else if (action === 'DISMISS') {
    // Coordinator dismisses the flag as a false positive
    newStatus = 'COMPLIANT';
  } else {
    newStatus = previousStatus;
  }

  // ── 4. Update ComplianceLog ────────────────────────────────────────────────
  const coordinatorActionTaken = {
    action,
    takenBy: coordinatorId,
    takenAt: now,
    notes: notes ?? '',
  };

  if (dbAvailable) {
    await ComplianceLogModel.findOneAndUpdate(
      { logId },
      {
        $set: {
          overallStatus: newStatus,
          coordinatorActionTaken,
          requiresCoordinatorAction: action === 'ESCALATE', // only escalations remain pending
        },
      }
    );
  }

  // ── 5. Hindsight Correction Memory ─────────────────────────────────────────
  let hindsightCorrectionRetained = false;

  if (action === 'OVERRIDE' || action === 'DISMISS') {
    const correctionText = buildCorrectionMemoryText({
      logId,
      patientId: logDoc.patientId,
      trialId: logDoc.trialId,
      action,
      previousStatus,
      newStatus,
      notes,
      violations: (logDoc.violations ?? []).map((v) => `${v.ruleName}: ${v.description}`),
    });

    try {
      await retainPatientObservation(
        logDoc.trialId,
        logDoc.patientId,
        correctionText,
        {
          timestamp: now,
          tags: ['coordinator_correction', `action_${action.toLowerCase()}`, 'feedback_loop'],
          metadata: {
            logId,
            action,
            coordinatorId,
            previousStatus,
            newStatus: newStatus,
          },
        }
      );
      hindsightCorrectionRetained = true;
    } catch (err) {
      console.warn('[feedback-service] Hindsight correction retain warning:', err);
    }
  }

  // ── 6. Patient Status Update ───────────────────────────────────────────────
  let patientStatusChanged = false;

  if (liftSafetyHold && (action === 'APPROVE' || action === 'OVERRIDE') && dbAvailable) {
    try {
      const result = await PatientModel.findOneAndUpdate(
        { patientId: logDoc.patientId, status: 'safety_hold' },
        { $set: { status: 'active' } }
      );
      patientStatusChanged = result !== null;
    } catch (err) {
      console.warn('[feedback-service] Patient status lift warning:', err);
    }
  }

  // ── 7. Immutable Audit Event ───────────────────────────────────────────────
  const auditEventId = `AUD-REVIEW-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (dbAvailable) {
    try {
      await AuditEventModel.create({
        eventId: auditEventId,
        action: `COORDINATOR_${action}`,
        actor: coordinatorId,
        timestamp: now,
        trialId: logDoc.trialId,
        patientId: logDoc.patientId,
        details: {
          logId,
          checkInId: logDoc.checkInId,
          previousStatus,
          newStatus,
          violationCount: logDoc.violations.length,
          notes: notes ?? null,
          liftSafetyHold: liftSafetyHold ?? false,
          patientStatusChanged,
          hindsightCorrectionRetained,
        },
      });
    } catch (err) {
      console.warn('[feedback-service] AuditEvent write warning:', err);
    }
  }

  return {
    ok: true,
    logId,
    action,
    previousStatus,
    newStatus,
    patientStatusChanged,
    hindsightCorrectionRetained,
    auditEventId,
    message: buildActionMessage(action, previousStatus, newStatus, hindsightCorrectionRetained),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCorrectionMemoryText(params: {
  logId: string;
  patientId: string;
  trialId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  notes?: string;
  violations: string[];
}): string {
  const { patientId, trialId, action, previousStatus, newStatus, notes, violations } = params;
  const violationList = violations.length
    ? `Violations flagged: ${violations.join('; ')}.`
    : 'No protocol violations were flagged.';

  return (
    `Coordinator correction for trial ${trialId} patient ${patientId}: ` +
    `The AI compliance engine assessed status as "${previousStatus}". ` +
    `A human clinical coordinator reviewed this assessment and took action "${action}", ` +
    `changing the status to "${newStatus}". ` +
    violationList +
    (notes ? ` Coordinator note: ${notes}` : '')
  );
}

function buildActionMessage(
  action: string,
  previousStatus: string,
  newStatus: string,
  hindsightUpdated: boolean
): string {
  const hindsightNote = hindsightUpdated
    ? ' Hindsight correction memory retained for future AI improvement.'
    : '';

  switch (action) {
    case 'APPROVE':
      return `Coordinator approved AI assessment (status: ${previousStatus}).${hindsightNote}`;
    case 'OVERRIDE':
      return `Coordinator overrode AI decision: ${previousStatus} → ${newStatus}.${hindsightNote}`;
    case 'ESCALATE':
      return `Coordinator escalated log for further clinical review (status remains: ${previousStatus}).`;
    case 'DISMISS':
      return `Coordinator dismissed flag as false positive: ${previousStatus} → ${newStatus}.${hindsightNote}`;
    default:
      return `Action ${action} recorded.`;
  }
}
