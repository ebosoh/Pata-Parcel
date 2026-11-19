import type { ComplaintStatus } from '@/types/database';

export type ComplaintFilter = ComplaintStatus | 'active';

export function matchesComplaintFilter(status: ComplaintStatus, filter: ComplaintFilter): boolean {
  return filter === 'active' ? status !== 'resolved' : status === filter;
}