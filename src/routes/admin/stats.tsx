import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';

export const Route = createFileRoute('/admin/stats')({
  head: () => ({
    meta: [
      { title: 'Platform Statistics — Pata Parcel Admin' },
      { name: 'description', content: 'Parcel, seller, destination and activity statistics for Pata Parcel admins.' },
      { property: 'og:title', content: 'Platform Statistics — Pata Parcel Admin' },
      { property: 'og:description', content: 'Parcel, seller, destination and activity statistics for Pata Parcel admins.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: StatsPage,
});

type Period = 'day' | 'week' | 'month' | 'year' | 'all';
const PERIODS: { v: Period; label: string; days: number | null }[] = [
  { v: 'day', label: 'Today', days: 1 },
  { v: 'week', label: '7 days', days: 7 },
  { v: 'month', label: '30 days', days: 30 },
  { v: 'year', label: '12 months', days: 365 },
  { v: 'all', label: 'All time', days: null },
];

interface P { id: string; reference_number: string; seller_id: string; destination: string; sending_method: string; num_packages: number; total_sending_fee: number; platform_fee: number; platform_fee_paid: boolean; tracking_status: string; payment_status: string; created_at: string }
interface T { id: string; parcel_id: string; status: string; notes: string | null; created_at: string; updated_by: string }
interface C { id: string; seller_id: string; destination: string; status: string; issue_description: string; created_at: string }
interface Pr { id: string; owner_name: string; business_name: string | null }

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

function countBy<X>(rows: X[], key: (r: X) => string) {
  const m = new Map<string, number>();
  rows.forEach(r => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map(d => d[1]));
  return (
    <Card className="p-4 break-inside-avoid">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {data.length === 0 ? <p className="text-xs text-muted-foreground">No data for this period.</p> : (
        <ul className="space-y-1.5">
          {data.map(([k, v]) => (
            <li key={k} className="text-xs">
              <div className="flex justify-between"><span className="truncate">{k}</span><span className="font-semibold">{v}</span></div>
              <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StatsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [parcels, setParcels] = useState<P[]>([]);
  const [tracking, setTracking] = useState<T[]>([]);
  const [complaints, setComplaints] = useState<C[]>([]);
  const [profiles, setProfiles] = useState<Pr[]>([]);
  const isAdmin = profile?.role === 'pap_admin';
  const [generatedAt, setGeneratedAt] = useState('');
  useEffect(() => { setGeneratedAt(new Date().toLocaleString()); }, [parcels]);

  useEffect(() => {
    if (!isAdmin) return;
    const days = PERIODS.find(p => p.v === period)!.days;
    const since = days ? new Date(Date.now() - days * 86400000).toISOString() : '1970-01-01';
    setLoading(true);
    Promise.all([
      supabase.from('parcels').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
      supabase.from('parcel_tracking').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(200),
      supabase.from('complaints').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
      supabase.from('profiles').select('id, owner_name, business_name'),
    ]).then(([a, b, c, d]) => {
      setParcels((a.data as P[]) ?? []); setTracking((b.data as T[]) ?? []);
      setComplaints((c.data as C[]) ?? []); setProfiles((d.data as Pr[]) ?? []);
      setLoading(false);
    });
  }, [period, isAdmin]);

  const nameOf = useMemo(() => {
    const m = new Map(profiles.map(p => [p.id, p.business_name || p.owner_name || 'Unnamed']));
    return (id: string) => m.get(id) ?? 'Unknown';
  }, [profiles]);
  const refOf = useMemo(() => new Map(parcels.map(p => [p.id, p.reference_number])), [parcels]);

  const daily = useMemo(() => countBy(parcels, p => p.created_at.slice(0, 10)).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 31), [parcels]);
  const activity = useMemo(() => [
    ...parcels.slice(0, 100).map(p => ({ at: p.created_at, text: `${nameOf(p.seller_id)} dispatched ${p.reference_number} to ${p.destination}` })),
    ...tracking.map(t => ({ at: t.created_at, text: `${nameOf(t.updated_by)} set ${refOf.get(t.parcel_id) ?? 'a parcel'} to ${t.status.replace(/_/g, ' ')}${t.notes ? ` — ${t.notes}` : ''}` })),
    ...complaints.slice(0, 100).map(c => ({ at: c.created_at, text: `${nameOf(c.seller_id)} raised an issue (${c.status}): ${c.issue_description}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100), [parcels, tracking, complaints, nameOf, refOf]);

  if (!authLoading && !profile) {
    return <AppShell role="seller"><p className="py-10 text-center text-sm text-muted-foreground">Please sign in with an admin account to view statistics.</p></AppShell>;
  }
  if (!authLoading && profile && !isAdmin) {
    return <AppShell role={profile.role as any}><p className="py-10 text-center text-sm text-muted-foreground">Only Pata Parcel admins can open this page.</p></AppShell>;
  }

  const pkgs = parcels.reduce((s, p) => s + p.num_packages, 0);
  const sumFee = (pred: (p: P) => boolean) => parcels.filter(pred).reduce((s, p) => s + Number(p.total_sending_fee), 0);
  const payStats: [string, string, string][] = [
    ['Paid', kes(sumFee(p => p.payment_status === 'paid')), `${parcels.filter(p => p.payment_status === 'paid').length} parcels`],
    ['Unpaid', kes(sumFee(p => p.payment_status === 'unpaid')), `${parcels.filter(p => p.payment_status === 'unpaid').length} parcels`],
    ['Pay on delivery', kes(sumFee(p => p.payment_status === 'pay_on_delivery')), `${parcels.filter(p => p.payment_status === 'pay_on_delivery').length} parcels`],
    ['Platform fees collected', kes(parcels.filter(p => p.platform_fee_paid).reduce((s, p) => s + Number(p.platform_fee), 0)), `${parcels.filter(p => p.platform_fee_paid).length} parcels`],
    ['Platform fees pending', kes(parcels.filter(p => !p.platform_fee_paid).reduce((s, p) => s + Number(p.platform_fee), 0)), `${parcels.filter(p => !p.platform_fee_paid).length} parcels`],
  ];
  const label = PERIODS.find(p => p.v === period)!.label;
  const kpis: [string, string][] = [
    ['Parcels', String(parcels.length)],
    ['Packages', String(pkgs)],
    ['Delivered', String(parcels.filter(p => p.tracking_status === 'delivered').length)],
    ['Active sellers', String(new Set(parcels.map(p => p.seller_id)).size)],
    ['Sending fees', kes(parcels.reduce((s, p) => s + Number(p.total_sending_fee), 0))],
    ['Platform fees', kes(parcels.reduce((s, p) => s + Number(p.platform_fee), 0))],
    ['Issues raised', String(complaints.length)],
    ['Open issues', String(complaints.filter(c => c.status === 'open').length)],
  ];

  return (
    <AppShell role="pap_admin">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Platform Statistics</h1>
            <p className="text-xs text-muted-foreground">Period: {label} · generated {generatedAt}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {PERIODS.map(p => (
              <Button key={p.v} size="sm" variant={period === p.v ? 'default' : 'outline'} onClick={() => setPeriod(p.v)}>{p.label}</Button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Save as PDF</Button>
          </div>
        </div>
        {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {kpis.map(([k, v]) => <Card key={k} className="p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-lg font-bold">{v}</p></Card>)}
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold">Payments</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {payStats.map(([k, v, sub]) => (
                  <Card key={k} className="p-3">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="text-lg font-bold">{v}</p>
                    <p className="text-[11px] text-muted-foreground">{sub}</p>
                  </Card>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Bars title="Parcels per day" data={daily} />
              <Bars title="Parcels by destination" data={countBy(parcels, p => p.destination)} />
              <Bars title="Parcels by seller" data={countBy(parcels, p => nameOf(p.seller_id)).slice(0, 20)} />
              <Bars title="Parcels by sending method" data={countBy(parcels, p => p.sending_method.replace(/_/g, ' '))} />
              <Bars title="Tracking status" data={countBy(parcels, p => p.tracking_status.replace(/_/g, ' '))} />
              <Bars title="Payment status" data={countBy(parcels, p => p.payment_status)} />
            </div>
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Activity log (latest 100)</h2>
              {activity.length === 0 ? <p className="text-xs text-muted-foreground">No activity in this period.</p> : (
                <ul className="divide-y divide-border">
                  {activity.map((a, i) => (
                    <li key={i} className="flex flex-col gap-0.5 py-1.5 text-xs sm:flex-row sm:gap-3">
                      <span className="shrink-0 text-muted-foreground sm:w-36">{new Date(a.at).toLocaleString()}</span>
                      <span className="min-w-0">{a.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
