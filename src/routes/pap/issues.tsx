import { useState, useEffect, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Package, RefreshCw, Store, CheckCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPhoneDisplay } from '@/lib/constants';
import { matchesComplaintFilter, findFraudSuspects, FRAUD_COMPLAINT_THRESHOLD, type ComplaintFilter } from '@/lib/complaints';
import { ComplaintActions } from '@/components/shared/ComplaintActions';
import type { Complaint, ComplaintStatus } from '@/types/database';

export const Route = createFileRoute('/pap/issues')({
  head: () => ({
    meta: [
      { title: 'Buyer Issues — Pata Parcel Operations' },
      { name: 'description', content: 'Review and resolve buyer issues reported by sellers on Pata Parcel.' },
      { property: 'og:title', content: 'Buyer Issues — Pata Parcel Operations' },
      { property: 'og:description', content: 'Review and resolve buyer issues reported by sellers on Pata Parcel.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: PapIssuesPage,
});

type Row = Complaint & { seller_label: string };
const FILTERS: ComplaintFilter[] = ['active', 'open', 'investigating', 'resolved'];
const LABEL: Record<ComplaintFilter, string> = { active: 'Active', open: 'Open', investigating: 'Investigating', resolved: 'Resolved' };

function PapIssuesPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ComplaintFilter>('active');
  const [view, setView] = useState<'issues' | 'fraud'>('issues');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
    const list = (data as Complaint[]) || [];
    const ids = Array.from(new Set(list.map((c) => c.seller_id)));
    const map = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, owner_name, business_name').in('id', ids);
      (profs || []).forEach((p: any) => map.set(p.id, p.business_name || p.owner_name || 'Seller'));
    }
    setRows(list.map((c) => ({ ...c, seller_label: map.get(c.seller_id) || 'Seller' })));
    setLoading(false);
  }, []);

  useEffect(() => { if (profile) load(); }, [profile, load]);

  const setStatus = async (c: Row, status: Exclude<ComplaintStatus, 'resolved'>) => {
    setBusy(c.id);
    const { error } = await supabase
      .from('complaints')
      .update({ status, resolved_at: null })
      .eq('id', c.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(`Issue marked ${LABEL[status]}`); load(); }
  };

  const suspects = findFraudSuspects(rows);
  const shown = rows.filter((r) => matchesComplaintFilter(r.status, filter));
  const onResolved = (id: string) => {
    setRows(current => current.map(row => row.id === id ? { ...row, status: 'resolved' } : row));
  };

  return (
    <AppShell role={profile?.role ?? 'pap_staff'}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Buyer Issues</h1>
            <p className="text-xs text-muted-foreground">Issues sellers logged on behalf of their buyers</p>
          </div>
          <Button variant="outline" size="icon" aria-label="Refresh issues" onClick={load} disabled={loading} className="h-9 w-9">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-0.5">
          <Button onClick={() => setView('issues')} aria-pressed={view === 'issues'} variant={view === 'issues' ? 'default' : 'ghost'} className="h-11 text-xs font-semibold">Buyer Complaints</Button>
          <Button onClick={() => setView('fraud')} aria-pressed={view === 'fraud'} variant={view === 'fraud' ? 'destructive' : 'ghost'} className="h-11 gap-1 text-xs font-semibold">
            <ShieldAlert className="h-4 w-4" /> Fraud Check ({suspects.length})
          </Button>
        </div>

        {view === 'fraud' ? (
          <FraudCheckList suspects={suspects} loading={loading} />
        ) : (<>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-0.5 sm:grid-cols-4">
          {FILTERS.map((f) => (
            <Button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              variant={filter === f ? 'default' : 'ghost'} className="h-11 px-2 text-xs font-semibold">
              {LABEL[f]} ({rows.filter((r) => matchesComplaintFilter(r.status, f)).length})
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-12 text-center">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No issues here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((c) => (
              <Card key={c.id} className="space-y-2.5 border border-border/80 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <h2 className="text-sm font-semibold text-foreground">{c.buyer_name}</h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-primary" />{formatPhoneDisplay(c.buyer_phone)}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{c.destination}</span>
                      <span className="flex items-center gap-1"><Store className="h-3 w-3 text-primary" />{c.seller_label}</span>
                    </div>
                  </div>
                  <Badge variant="outline">{LABEL[c.status] ?? c.status}</Badge>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 text-xs">
                  <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Package className="h-3 w-3" /> Item: {c.package_type}</p>
                  <p className="text-foreground/90">{c.issue_description}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    Reported {new Date(c.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ComplaintActions complaint={c} disabled={busy === c.id} onResolved={onResolved} />
                  {c.status === 'open' && (
                    <Button variant="outline" className="h-11 text-xs" disabled={busy === c.id} onClick={() => setStatus(c, 'investigating')}>Investigate</Button>
                  )}
                  {c.status === 'resolved' && (
                    <Button variant="outline" className="h-11 text-xs" disabled={busy === c.id} onClick={() => setStatus(c, 'open')}>Reopen</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        </>)}
      </div>
    </AppShell>
  );
}

function FraudCheckList({ suspects, loading }: { suspects: ReturnType<typeof findFraudSuspects<Row>>; loading: boolean }) {
  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-muted/40" />;
  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground">
        Buyers with more than {FRAUD_COMPLAINT_THRESHOLD} complaints. Before resolving, always check the buyer name, phone number, parcel and destination against delivery records.
      </p>
      {suspects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-12 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">No suspect buyers</p>
        </div>
      ) : suspects.map((s) => (
        <Card key={s.phoneKey} className="space-y-2.5 border border-destructive/40 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <h2 className="break-words text-sm font-semibold text-foreground">{s.names.join(' / ')}</h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-primary" />{formatPhoneDisplay(s.buyer_phone)}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{s.destinations.join(', ')}</span>
              </div>
              {s.names.length > 1 && <p className="text-[11px] font-medium text-destructive">Different names used with this phone number</p>}
            </div>
            <Badge variant="destructive">{s.complaints.length} complaints</Badge>
          </div>
          <ul className="space-y-1.5">
            {s.complaints.map((c) => (
              <li key={c.id} className="rounded-lg border border-border/50 bg-muted/30 p-2 text-xs">
                <div className="flex flex-wrap justify-between gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" />{c.package_type} · {c.destination}</span>
                  <span>{new Date(c.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="mt-0.5 text-foreground/90">{c.buyer_name} — {c.issue_description}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><Store className="h-3 w-3" />{c.seller_label} · {LABEL[c.status] ?? c.status}</p>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
