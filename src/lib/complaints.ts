import type { ComplaintStatus } from '@/types/database';

export type ComplaintFilter = ComplaintStatus | 'active';

export function matchesComplaintFilter(status: ComplaintStatus, filter: ComplaintFilter): boolean {
  return filter === 'active' ? status !== 'resolved' : status === filter;
}

/** Buyers with more complaints than this are flagged for fraud review. */
export const FRAUD_COMPLAINT_THRESHOLD = 2;

export function normalizeBuyerPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('254')) return d.slice(3);
  if (d.startsWith('0')) return d.slice(1);
  return d;
}

export interface FraudComplaint {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  destination: string;
  package_type: string;
  created_at: string;
}

export interface FraudSuspect<T extends FraudComplaint> {
  phoneKey: string;
  buyer_phone: string;
  names: string[];
  destinations: string[];
  complaints: T[];
}

export function findFraudSuspects<T extends FraudComplaint>(list: T[]): FraudSuspect<T>[] {
  const groups = new Map<string, T[]>();
  for (const c of list) {
    const key = normalizeBuyerPhone(c.buyer_phone);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return Array.from(groups.entries())
    .filter(([, cs]) => cs.length > FRAUD_COMPLAINT_THRESHOLD)
    .map(([phoneKey, cs]) => ({
      phoneKey,
      buyer_phone: cs[0]?.buyer_phone ?? '',
      names: Array.from(new Set(cs.map((c) => c.buyer_name.trim()))),
      destinations: Array.from(new Set(cs.map((c) => c.destination))),
      complaints: [...cs].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }))
    .sort((a, b) => b.complaints.length - a.complaints.length);
}
