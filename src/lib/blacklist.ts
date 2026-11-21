import defaultBlacklist from '@/data/blacklisted_phones.json';
import { normalizeBuyerPhone } from './complaints';
import { isValidKenyanPhone } from './constants';

export type BlacklistStatus = 'blacklisted' | 'under_review' | 'whitelisted';

export interface BlacklistedPhone {
  id: string;
  phone: string;
  normalizedPhone: string;
  name: string;
  reason: string;
  mpesaCode?: string | undefined;
  incidentCount: number;
  flaggedAt: string;
  status: BlacklistStatus;
  notes?: string | undefined;
  addedBy: string;
}

const STORAGE_KEY = 'pap_blacklisted_phones_v1';

/**
 * Standard Safaricom M-Pesa transaction code pattern:
 * Usually 10 characters alphanumeric (e.g. QGH7892KLM, SHG478KJH9, PKL6218XYZ).
 * Starts with letters, ends with alphanumeric.
 */
export const MPESA_CODE_REGEX = /^[A-Z0-9]{8,12}$/i;

/**
 * Normalizes phone number to 9 digits without country code or leading 0.
 */
export function normalizePhone(phone: string): string {
  return normalizeBuyerPhone(phone);
}

/**
 * Loads all blacklisted phone records from localStorage or initial seed data.
 */
export function getBlacklistedPhones(): BlacklistedPhone[] {
  if (typeof window === 'undefined') {
    return defaultBlacklist as BlacklistedPhone[];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBlacklist));
      return defaultBlacklist as BlacklistedPhone[];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return defaultBlacklist as BlacklistedPhone[];
  } catch (err) {
    console.error('Failed to read blacklisted phones from storage:', err);
    return defaultBlacklist as BlacklistedPhone[];
  }
}

/**
 * Saves blacklisted phone records to persistent storage.
 */
export function saveBlacklistedPhones(list: BlacklistedPhone[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save blacklisted phones to storage:', err);
  }
}

/**
 * Adds a new phone number to the blacklist.
 */
export function addBlacklistedPhone(input: {
  phone: string;
  name: string;
  reason: string;
  mpesaCode?: string;
  notes?: string;
  status?: BlacklistStatus;
  addedBy?: string;
}): { data: BlacklistedPhone | null; error: Error | null } {
  const norm = normalizePhone(input.phone);
  if (!norm || norm.length < 9) {
    return { data: null, error: new Error('Please enter a valid Kenyan phone number') };
  }

  const current = getBlacklistedPhones();
  const existingIndex = current.findIndex(b => b.normalizedPhone === norm);

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    if (!existing) return { data: null, error: new Error('Failed to access existing record') };
    // Update existing record with new incident
    const updated: BlacklistedPhone = {
      ...existing,
      incidentCount: existing.incidentCount + 1,
      reason: input.reason || existing.reason,
      notes: input.notes ? `${existing.notes ? existing.notes + ' | ' : ''}${input.notes}` : existing.notes,
      mpesaCode: input.mpesaCode || existing.mpesaCode,
      status: input.status || 'blacklisted',
      flaggedAt: new Date().toISOString(),
    };
    current[existingIndex] = updated;
    saveBlacklistedPhones(current);
    return { data: updated, error: null };
  }

  const newRecord: BlacklistedPhone = {
    id: `bl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    phone: input.phone.trim(),
    normalizedPhone: norm,
    name: input.name.trim() || 'Unknown Subject',
    reason: input.reason.trim() || 'M-Pesa Code Misuse',
    mpesaCode: input.mpesaCode?.trim().toUpperCase(),
    incidentCount: 1,
    flaggedAt: new Date().toISOString(),
    status: input.status || 'blacklisted',
    notes: input.notes?.trim() || '',
    addedBy: input.addedBy || 'Admin',
  };

  const updated = [newRecord, ...current];
  saveBlacklistedPhones(updated);
  return { data: newRecord, error: null };
}

/**
 * Updates status of a blacklisted number.
 */
export function updateBlacklistStatus(id: string, status: BlacklistStatus): boolean {
  const current = getBlacklistedPhones();
  const index = current.findIndex(b => b.id === id);
  if (index === -1) return false;
  const target = current[index];
  if (!target) return false;
  target.status = status;
  saveBlacklistedPhones(current);
  return true;
}

/**
 * Updates full details of a blacklisted number.
 */
export function updateBlacklistRecord(id: string, updates: Partial<BlacklistedPhone>): boolean {
  const current = getBlacklistedPhones();
  const index = current.findIndex(b => b.id === id);
  if (index === -1) return false;
  const target = current[index];
  if (!target) return false;
  current[index] = { ...target, ...updates };
  saveBlacklistedPhones(current);
  return true;
}

/**
 * Removes a record permanently from blacklist.
 */
export function removeBlacklistedPhone(id: string): boolean {
  const current = getBlacklistedPhones();
  const filtered = current.filter(b => b.id !== id);
  if (filtered.length === current.length) return false;
  saveBlacklistedPhones(filtered);
  return true;
}

/**
 * Checks if a phone number is currently blacklisted.
 */
export function isPhoneBlacklisted(phone: string): {
  blacklisted: boolean;
  status: BlacklistStatus | null;
  record?: BlacklistedPhone;
} {
  const norm = normalizePhone(phone);
  if (!norm) return { blacklisted: false, status: null };

  const current = getBlacklistedPhones();
  const found = current.find(b => b.normalizedPhone === norm);

  if (!found) {
    return { blacklisted: false, status: null };
  }

  return {
    blacklisted: found.status === 'blacklisted',
    status: found.status,
    record: found,
  };
}

/**
 * Checks an M-Pesa code against known misuse patterns and existing blacklist records.
 */
export function checkMpesaCodeMisuse(code: string, phone?: string): {
  isMisused: boolean;
  isFormatValid: boolean;
  riskLevel: 'clean' | 'suspicious' | 'blacklisted';
  reason?: string;
  matchedRecord?: BlacklistedPhone;
} {
  const cleanCode = (code || '').trim().toUpperCase();

  // 1. Check basic code format
  const isFormatValid = MPESA_CODE_REGEX.test(cleanCode) && cleanCode.length >= 8 && cleanCode.length <= 12;

  // 2. Check if this M-Pesa code was already flagged in blacklist
  const current = getBlacklistedPhones();
  const codeMatch = current.find(
    b => b.mpesaCode && b.mpesaCode.toUpperCase() === cleanCode
  );

  if (codeMatch) {
    return {
      isMisused: true,
      isFormatValid,
      riskLevel: 'blacklisted',
      reason: `M-Pesa code ${cleanCode} was previously flagged for misuse (${codeMatch.reason}) by ${codeMatch.name}.`,
      matchedRecord: codeMatch,
    };
  }

  // 3. Check if phone is blacklisted
  if (phone) {
    const phoneCheck = isPhoneBlacklisted(phone);
    if (phoneCheck.blacklisted && phoneCheck.record) {
      return {
        isMisused: true,
        isFormatValid,
        riskLevel: 'blacklisted',
        reason: `Phone number ${phone} is currently blacklisted: ${phoneCheck.record.reason}`,
        matchedRecord: phoneCheck.record,
      };
    }
  }

  // 4. Check for mock/obviously fake patterns
  const mockPatterns = ['TEST', 'MOCK', 'FAKE', '123456', '000000', 'DEMO', 'AAAA', 'MPESA'];
  if (mockPatterns.some(p => cleanCode.includes(p))) {
    return {
      isMisused: true,
      isFormatValid: false,
      riskLevel: 'suspicious',
      reason: `M-Pesa code "${cleanCode}" contains prohibited or mock test characters.`,
    };
  }

  if (!isFormatValid && cleanCode.length > 0) {
    return {
      isMisused: true,
      isFormatValid: false,
      riskLevel: 'suspicious',
      reason: `Invalid M-Pesa transaction code format. Must be 8-12 alphanumeric characters (e.g. QGH7892KLM).`,
    };
  }

  return {
    isMisused: false,
    isFormatValid,
    riskLevel: 'clean',
  };
}
