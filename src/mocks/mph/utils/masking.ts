import { MPHRole } from '../types';

export type MaskRule = 'last4' | 'last4-spaced' | 'email-partial' | 'mobile-partial' | 'redact' | 'none';

export type FieldMaskMap = Record<string, MaskRule>;

// Default masking rules per role for the common sensitive field names
const ROLE_DEFAULT_MASKS: Record<MPHRole, FieldMaskMap> = {
  'super-admin': {
    accountNumber: 'last4',
    bankAccountNumber: 'last4',
    pan: 'none',
    aadhaarLast4: 'none',
    claimantPan: 'none',
  },
  'approver': {
    accountNumber: 'last4',
    bankAccountNumber: 'last4',
    pan: 'last4',
    aadhaarLast4: 'none',
    claimantPan: 'last4',
  },
  'maker': {
    accountNumber: 'last4',
    bankAccountNumber: 'last4',
    pan: 'last4',
    aadhaarLast4: 'redact',
    claimantPan: 'last4',
  },
  'viewer': {
    accountNumber: 'last4',
    bankAccountNumber: 'last4',
    pan: 'redact',
    aadhaarLast4: 'redact',
    claimantPan: 'redact',
  },
  'member': {
    accountNumber: 'last4',
    bankAccountNumber: 'last4',
    pan: 'none',
    aadhaarLast4: 'none',
    claimantPan: 'none',
  },
  'insurer-ops': {
    accountNumber: 'none',
    bankAccountNumber: 'none',
    pan: 'none',
    aadhaarLast4: 'none',
    claimantPan: 'none',
  },
};

function applyRule(value: any, rule: MaskRule): any {
  if (value === null || value === undefined) return value;
  const str = String(value);

  switch (rule) {
    case 'none':
      return value;
    case 'redact':
      return '***REDACTED***';
    case 'last4': {
      if (str.length <= 4) return str;
      return 'X'.repeat(str.length - 4) + str.slice(-4);
    }
    case 'last4-spaced': {
      const digits = str.replace(/\s/g, '');
      if (digits.length <= 4) return str;
      return 'XXXX XXXX XXXX ' + digits.slice(-4);
    }
    case 'email-partial': {
      const [local, domain] = str.split('@');
      if (!domain) return str;
      const visible = local.slice(0, 2);
      return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
    }
    case 'mobile-partial': {
      if (str.length < 7) return '***';
      return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
    }
    default:
      return value;
  }
}

/**
 * Recursively mask fields in a data object based on role and optional override map.
 * The override map takes precedence over role defaults.
 */
export function maskFields<T extends Record<string, any>>(
  data: T,
  role: MPHRole,
  overrides: FieldMaskMap = {}
): T {
  const effectiveMap: FieldMaskMap = {
    ...ROLE_DEFAULT_MASKS[role],
    ...overrides,
  };

  function maskValue(obj: any): any {
    if (Array.isArray(obj)) return obj.map(maskValue);
    if (obj && typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(obj)) {
        const rule = effectiveMap[key];
        if (rule && rule !== 'none') {
          result[key] = applyRule(val, rule);
        } else {
          result[key] = maskValue(val);
        }
      }
      return result;
    }
    return obj;
  }

  return maskValue(data) as T;
}

/** Mask a single value directly */
export function maskValue(value: any, rule: MaskRule): any {
  return applyRule(value, rule);
}
