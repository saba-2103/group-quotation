// Mock CensusSubmission fixtures: one INGESTED with mixed-status rows, one COMPLETED.

import type {
  CensusSubmission,
  CensusSubmissionRow,
} from '@/types/group-pas/issuance';

const POLICY_ID = 'POL-2026-0001';

export const CENSUS_SUBMISSIONS: CensusSubmission[] = [
  {
    id: 'CSB-0001',
    policyId: POLICY_ID,
    file: {
      fileRef: 'census/POL-2026-0001/2026-05-04-batch-01.xlsx',
      sizeBytes: 184_320,
      contentHash: 'sha256:7f1c…b04a',
    },
    status: 'INGESTED',
    totalRows: 18,
    acceptedRows: 14,
    rejectedRows: 4,
    createdMemberCount: 0,
  },
  {
    id: 'CSB-0002',
    policyId: POLICY_ID,
    file: {
      fileRef: 'census/POL-2026-0001/2026-04-12-initial.xlsx',
      sizeBytes: 248_900,
      contentHash: 'sha256:91d2…f773',
    },
    status: 'COMPLETED',
    totalRows: 12,
    acceptedRows: 12,
    rejectedRows: 0,
    createdMemberCount: 12,
  },
];

export const CENSUS_ROWS: CensusSubmissionRow[] = [
  {
    id: 'CSB-0001-R-001',
    submissionId: 'CSB-0001',
    rowNumber: 1,
    status: 'ACCEPTED',
    ingestionErrors: [],
    policyMemberId: 'PMB-0015',
  },
  {
    id: 'CSB-0001-R-002',
    submissionId: 'CSB-0001',
    rowNumber: 2,
    status: 'ACCEPTED',
    ingestionErrors: [],
    policyMemberId: 'PMB-0016',
  },
  {
    id: 'CSB-0001-R-003',
    submissionId: 'CSB-0001',
    rowNumber: 3,
    status: 'INGESTED',
    ingestionErrors: [],
  },
  {
    id: 'CSB-0001-R-004',
    submissionId: 'CSB-0001',
    rowNumber: 4,
    status: 'REJECTED',
    ingestionErrors: [
      { field: 'dob', code: 'ROW_DOB_FMT', message: 'Invalid date format' },
    ],
  },
  {
    id: 'CSB-0001-R-005',
    submissionId: 'CSB-0001',
    rowNumber: 5,
    status: 'REJECTED',
    ingestionErrors: [
      { field: 'salary', code: 'ROW_NUM', message: 'Salary must be numeric' },
      { field: 'planNo', code: 'ROW_REF', message: 'Plan PLAN-XYZ not in quote' },
    ],
  },
];
