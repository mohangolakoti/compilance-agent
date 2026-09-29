/**
 * Unit tests — Phase 7: Human Feedback Loop (feedback-service.ts)
 */

// Mock external dependencies so tests run without live DB or Hindsight
jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/models', () => ({
  ComplianceLogModel: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  AuditEventModel: {
    create: jest.fn().mockResolvedValue({}),
  },
  PatientModel: {
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('@/services/hindsight-memory', () => ({
  retainPatientObservation: jest.fn().mockResolvedValue({
    ok: true,
    bankId: 'trial_CT-2026-X_patient_PT-001',
    mode: 'mock',
    message: 'Mock retain',
  }),
}));

import {
  submitCoordinatorReview,
  getPendingCoordinatorReviews,
  CoordinatorActionSchema,
} from '@/services/feedback-service';

import { ComplianceLogModel, PatientModel } from '@/models';
import { retainPatientObservation } from '@/services/hindsight-memory';

// ─── Shared mock compliance log ────────────────────────────────────────────────
const mockComplianceLog = {
  logId: 'LOG-TEST-001',
  checkInId: 'CHK-PT-001-1',
  patientId: 'PT-001',
  trialId: 'CT-2026-X',
  evaluatedAt: new Date('2026-09-29T12:00:00Z'),
  overallStatus: 'REQUIRES_HUMAN_REVIEW',
  violations: [
    {
      ruleId: 'RULE-MED-001',
      ruleName: 'Prohibited NSAIDs',
      category: 'PROHIBITED_MEDICATION',
      severity: 'CRITICAL',
      description: 'Patient reported ibuprofen.',
      evidence: 'Raw text: took ibuprofen.',
      recommendation: 'Contact patient immediately.',
    },
  ],
  hindsightEvidence: ['Patient mentioned pain 2 days ago.'],
  reflectionsSummary: 'Patient showing escalating pain management concerns.',
  requiresCoordinatorAction: true,
  coordinatorActionTaken: undefined,
};

// ─── Zod schema validation ─────────────────────────────────────────────────────
describe('CoordinatorActionSchema', () => {
  it('accepts valid APPROVE action', () => {
    const result = CoordinatorActionSchema.safeParse({
      logId: 'LOG-001',
      action: 'APPROVE',
      coordinatorId: 'dr.test@trial.org',
    });
    expect(result.success).toBe(true);
  });

  it('accepts OVERRIDE with overrideStatus', () => {
    const result = CoordinatorActionSchema.safeParse({
      logId: 'LOG-001',
      action: 'OVERRIDE',
      coordinatorId: 'dr.test@trial.org',
      overrideStatus: 'COMPLIANT',
    });
    expect(result.success).toBe(true);
  });

  it('accepts DISMISS action', () => {
    const result = CoordinatorActionSchema.safeParse({
      logId: 'LOG-001',
      action: 'DISMISS',
      coordinatorId: 'dr.test@trial.org',
      notes: 'False positive',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing logId', () => {
    const result = CoordinatorActionSchema.safeParse({
      action: 'APPROVE',
      coordinatorId: 'dr.test@trial.org',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid action value', () => {
    const result = CoordinatorActionSchema.safeParse({
      logId: 'LOG-001',
      action: 'ACCEPT', // not a valid enum value
      coordinatorId: 'dr.test@trial.org',
    });
    expect(result.success).toBe(false);
  });
});

// ─── getPendingCoordinatorReviews ──────────────────────────────────────────────
describe('getPendingCoordinatorReviews', () => {
  it('returns empty array when MONGODB_URI is not set', async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    const result = await getPendingCoordinatorReviews();
    expect(result).toEqual([]);

    process.env.MONGODB_URI = originalUri;
  });

  it('queries MongoDB and maps documents correctly when URI is set', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    (ComplianceLogModel.find as jest.Mock).mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve([mockComplianceLog]),
        }),
      }),
    });

    const result = await getPendingCoordinatorReviews();
    expect(result).toHaveLength(1);
    expect(result[0].logId).toBe('LOG-TEST-001');
    expect(result[0].violationCount).toBe(1);
    expect(result[0].overallStatus).toBe('REQUIRES_HUMAN_REVIEW');

    delete process.env.MONGODB_URI;
  });
});

// ─── submitCoordinatorReview — offline mode ────────────────────────────────────
describe('submitCoordinatorReview (offline / mock DB)', () => {
  beforeEach(() => {
    // Ensure no MONGODB_URI so the service uses offline path
    delete process.env.MONGODB_URI;
  });

  it('APPROVE action returns ok result with unchanged status', async () => {
    const result = await submitCoordinatorReview({
      logId: 'LOG-OFFLINE-APPROVE',
      action: 'APPROVE',
      coordinatorId: 'dr.test@trial.org',
      notes: 'Confirmed.',
    });

    expect(result.ok).toBe(true);
    expect(result.action).toBe('APPROVE');
    // APPROVE doesn't change status
    expect(result.previousStatus).toBe(result.newStatus);
    expect(result.hindsightCorrectionRetained).toBe(false); // APPROVE never retains correction
  });

  it('OVERRIDE action resolves to overrideStatus and retains Hindsight correction', async () => {
    const result = await submitCoordinatorReview({
      logId: 'LOG-OFFLINE-OVERRIDE',
      action: 'OVERRIDE',
      coordinatorId: 'dr.test@trial.org',
      overrideStatus: 'COMPLIANT',
      notes: 'Physician approved deviation.',
    });

    expect(result.ok).toBe(true);
    expect(result.newStatus).toBe('COMPLIANT');
    // Hindsight retain should have been called
    expect(retainPatientObservation).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.stringContaining('Coordinator correction'),
      expect.objectContaining({
        tags: expect.arrayContaining(['coordinator_correction', 'action_override']),
      })
    );
    expect(result.hindsightCorrectionRetained).toBe(true);
  });

  it('DISMISS action resolves status to COMPLIANT and retains Hindsight correction', async () => {
    const result = await submitCoordinatorReview({
      logId: 'LOG-OFFLINE-DISMISS',
      action: 'DISMISS',
      coordinatorId: 'dr.test@trial.org',
      notes: 'NLP false positive on supplement name.',
    });

    expect(result.ok).toBe(true);
    expect(result.newStatus).toBe('COMPLIANT');
    expect(result.hindsightCorrectionRetained).toBe(true);
  });

  it('ESCALATE action keeps status unchanged and does NOT retain Hindsight correction', async () => {
    const result = await submitCoordinatorReview({
      logId: 'LOG-OFFLINE-ESCALATE',
      action: 'ESCALATE',
      coordinatorId: 'coordinator.jones@trial.org',
      notes: 'Needs PI review.',
    });

    expect(result.ok).toBe(true);
    expect(result.newStatus).toBe(result.previousStatus);
    expect(result.hindsightCorrectionRetained).toBe(false);
  });

  it('throws on invalid Zod input', async () => {
    await expect(
      submitCoordinatorReview({
        logId: '',
        action: 'APPROVE',
        coordinatorId: 'dr.test@trial.org',
      })
    ).rejects.toThrow(/Invalid coordinator action/);
  });
});

// ─── submitCoordinatorReview — live DB mode ────────────────────────────────────
describe('submitCoordinatorReview (live DB mode)', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    (ComplianceLogModel.findOne as jest.Mock).mockResolvedValue({
      ...mockComplianceLog,
      coordinatorActionTaken: undefined,
    });
    (ComplianceLogModel.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    (PatientModel.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 'abc' });
  });

  afterEach(() => {
    delete process.env.MONGODB_URI;
    jest.clearAllMocks();
  });

  it('APPROVE updates DB and creates audit event', async () => {
    const result = await submitCoordinatorReview({
      logId: 'LOG-TEST-001',
      action: 'APPROVE',
      coordinatorId: 'dr.live@trial.org',
    });

    expect(result.ok).toBe(true);
    expect(ComplianceLogModel.findOne).toHaveBeenCalledWith({ logId: 'LOG-TEST-001' });
    expect(ComplianceLogModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('OVERRIDE with liftSafetyHold updates patient status', async () => {
    const result = await submitCoordinatorReview({
      logId: 'LOG-TEST-001',
      action: 'OVERRIDE',
      coordinatorId: 'dr.live@trial.org',
      overrideStatus: 'COMPLIANT',
      liftSafetyHold: true,
    });

    expect(result.ok).toBe(true);
    expect(PatientModel.findOneAndUpdate).toHaveBeenCalledWith(
      { patientId: 'PT-001', status: 'safety_hold' },
      { $set: { status: 'active' } }
    );
    expect(result.patientStatusChanged).toBe(true);
  });

  it('throws when log has already been reviewed', async () => {
    (ComplianceLogModel.findOne as jest.Mock).mockResolvedValue({
      ...mockComplianceLog,
      coordinatorActionTaken: { action: 'APPROVE', takenBy: 'dr.first@trial.org', takenAt: new Date() },
    });

    await expect(
      submitCoordinatorReview({
        logId: 'LOG-TEST-001',
        action: 'DISMISS',
        coordinatorId: 'dr.second@trial.org',
      })
    ).rejects.toThrow(/already been reviewed/);
  });

  it('throws when log is not found', async () => {
    (ComplianceLogModel.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      submitCoordinatorReview({
        logId: 'LOG-NOT-FOUND',
        action: 'APPROVE',
        coordinatorId: 'dr.live@trial.org',
      })
    ).rejects.toThrow(/not found/);
  });
});
