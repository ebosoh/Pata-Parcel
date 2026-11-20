import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2, CreditCard, Wallet, Clock, Banknote, TrendingUp, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

export const Route = createFileRoute('/admin/payments')({
  head: () => ({
    meta: [
      { title: 'Payments Overview – Pata Parcel Admin' },
      { name: 'description', content: 'Full payment status breakdown and dispatch details for Pata Parcel.' },
      { property: 'og:title', content: 'Payments Overview – Pata Parcel Admin' },
      { property: 'og:description', content: 'Full payment status breakdown and dispatch details for Pata Parcel.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: PaymentsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParcelPayment {
  id: string;
  reference_number: string;
  payment_status: string;
  total_sending_fee: number;
  platform_fee: number;
  platform_fee_paid: boolean;
  num_packages: number;
  buyer_name: string;
  buyer_phone: string;
  destination: string;
  sending_method: string;
  tracking_status: string;
  created_at: string;
}

type SortField = 'created_at' | 'reference_number' | 'buyer_name' | 'destination' | 'total_sending_fee';
type SortDir = 'asc' | 'desc';

// ── Helpers ───────────────────────────────────────────────────────────────────
const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

const SENDING_METHOD_LABEL: Record<string, string> = {
  pickup_mtaani: 'Pickup Mtaani',
  pata_parcel:   'Pata Parcel',
  door_to_door:  'Door to Door',
  psv:           'PSV',
  psv_driver:    'PSV Driver',
};

const TRACKING_LABEL: Record<string, string> = {
  dispatched_to_pap: 'Dispatched',
  sorting:           'Sorting',
  on_transit:        'On Transit',
  delivered:         'Delivered',
};

// ── Sortable dispatch table ────────────────────────────────────────────────────
function DispatchTable({ parcels }: { parcels: ParcelPayment[] }) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...parcels].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'total_sending_fee') {
        cmp = Number(a.total_sending_fee) - Number(b.total_sending_fee);
      } else {
        cmp = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [parcels, sortField, sortDir]);

  const toggle = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp   className="h-3 w-3 ml-1 inline" />
      : <ChevronDown className="h-3 w-3 ml-1 inline" />;
  };

  if (parcels.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No dispatches found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="px-3 py-2 font-semibold whitespace-nowrap cursor-pointer select-none" onClick={() => toggle('created_at')}>
              Date <SortIcon field="created_at" />
            </th>
            <th className="px-3 py-2 font-semibold whitespace-nowrap cursor-pointer select-none" onClick={() => toggle('reference_number')}>
              Ref # <SortIcon field="reference_number" />
            </th>
            <th className="px-3 py-2 font-semibold whitespace-nowrap cursor-pointer select-none" onClick={() => toggle('buyer_name')}>
              Buyer <SortIcon field="buyer_name" />
            </th>
            <th className="px-3 py-2 font-semibold whitespace-nowrap cursor-pointer select-none" onClick={() => toggle('destination')}>
              Destination <SortIcon field="destination" />
            </th>
            <th className="px-3 py-2 font-semibold whitespace-nowrap">Method</th>
            <th className="px-3 py-2 font-semibold whitespace-nowrap">Tracking</th>
            <th className="px-3 py-2 font-semibold whitespace-nowrap text-right cursor-pointer select-none" onClick={() => toggle('total_sending_fee')}>
              Fee <SortIcon field="total_sending_fee" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map(p => (
            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-3 py-2 font-mono whitespace-nowrap">{p.reference_number}</td>
              <td className="px-3 py-2 max-w-[120px] truncate">
                <span title={`${p.buyer_name} · ${p.buyer_phone}`}>{p.buyer_name}</span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{p.destination}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {SENDING_METHOD_LABEL[p.sending_method] ?? p.sending_method}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  p.tracking_status === 'delivered'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                  p.tracking_status === 'on_transit' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {TRACKING_LABEL[p.tracking_status] ?? p.tracking_status}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{kes(Number(p.total_sending_fee))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/50 font-semibold">
            <td colSpan={6} className="px-3 py-2 text-xs">
              {parcels.length} dispatch{parcels.length !== 1 ? 'es' : ''} · {parcels.reduce((s, p) => s + p.num_packages, 0)} pkg{parcels.reduce((s, p) => s + p.num_packages, 0) !== 1 ? 's' : ''}
            </td>
            <td className="px-3 py-2 text-right text-xs">
              {kes(parcels.reduce((s, p) => s + Number(p.total_sending_fee), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function PaymentsPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<ParcelPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate({ to: '/login', search: { mode: undefined } });
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    supabase
      .from('parcels')
      .select('id, reference_number, payment_status, total_sending_fee, platform_fee, platform_fee_paid, num_packages, buyer_name, buyer_phone, destination, sending_method, tracking_status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setParcels((data as ParcelPayment[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (!authLoading && profile && profile.role !== 'pap_admin' && profile.role !== 'pap_staff') {
    return (
      <AppShell role={profile.role as any}>
        <p className="text-center text-sm text-muted-foreground py-10">Only Pata Parcel staff can view this page.</p>
      </AppShell>
    );
  }

  const paid   = parcels.filter(p => p.payment_status === 'paid');
  const unpaid = parcels.filter(p => p.payment_status === 'unpaid');
  const cod    = parcels.filter(p => p.payment_status === 'pay_on_delivery');

  const totalSendingFees  = parcels.reduce((s, p) => s + Number(p.total_sending_fee ?? 0), 0);
  const paidSendingFees   = paid.reduce((s, p) => s + Number(p.total_sending_fee ?? 0), 0);
  const unpaidSendingFees = unpaid.reduce((s, p) => s + Number(p.total_sending_fee ?? 0), 0);
  const codSendingFees    = cod.reduce((s, p) => s + Number(p.total_sending_fee ?? 0), 0);
  const totalPlatformFees = parcels.reduce((s, p) => s + Number(p.platform_fee ?? 0), 0);
  const collectedPlatform = parcels.filter(p => p.platform_fee_paid).reduce((s, p) => s + Number(p.platform_fee ?? 0), 0);
  const pendingPlatform   = totalPlatformFees - collectedPlatform;

  const statusCards = [
    {
      key: 'paid',
      label: 'Paid',
      count: paid.length,
      amount: paidSendingFees,
      dispatches: paid,
      icon: CreditCard,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      key: 'unpaid',
      label: 'Unpaid',
      count: unpaid.length,
      amount: unpaidSendingFees,
      dispatches: unpaid,
      icon: Wallet,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800',
    },
    {
      key: 'pay_on_delivery',
      label: 'Pay on Delivery',
      count: cod.length,
      amount: codSendingFees,
      dispatches: cod,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
    },
    {
      key: 'total',
      label: 'Total Sending Fees',
      count: parcels.length,
      amount: totalSendingFees,
      dispatches: null,
      icon: Banknote,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800',
    },
  ];

  return (
    <AppShell role={profile?.role ?? null}>
      <div className="space-y-4 max-w-2xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" /> Payments Overview
          </h1>
          <p className="text-xs text-muted-foreground">All-time payment status across all dispatches.</p>
        </div>

        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        ) : (
          <div className="space-y-3">
            {/* Status cards */}
            <div className="grid grid-cols-2 gap-3">
              {statusCards.map(({ key, label, count, amount, dispatches, icon: Icon, color, bg, border }) => {
                const isClickable = dispatches !== null;
                const isOpen = expanded === key;
                return (
                  <Card
                    key={key}
                    className={`p-3.5 border ${border} ${bg} ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                    onClick={() => isClickable && setExpanded(isOpen ? null : key)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</p>
                        <p className={`text-xl font-extrabold mt-0.5 ${color}`}>{count}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{kes(amount)}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className={`shrink-0 p-1.5 rounded-lg ${bg} border ${border}`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        {isClickable && (
                          <span className={`text-[10px] font-medium ${color}`}>
                            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Expandable dispatch tables */}
            {statusCards.map(({ key, label, dispatches }) =>
              dispatches !== null && expanded === key ? (
                <Card key={`detail-${key}`} className="p-3.5 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-foreground">{label} Dispatches</p>
                    <button
                      onClick={() => setExpanded(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <DispatchTable parcels={dispatches} />
                </Card>
              ) : null
            )}

            {/* Platform fee summary */}
            <Card className="p-3.5 border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-primary">Platform Fee Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background rounded-lg p-2.5 border border-border/60">
                  <p className="text-[10px] text-muted-foreground">Total Accrued</p>
                  <p className="text-sm font-bold text-foreground">{kes(totalPlatformFees)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Collected</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{kes(collectedPlatform)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2.5 border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">Pending</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{kes(pendingPlatform)}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                {parcels.filter(p => p.platform_fee_paid).length} of {parcels.length} parcels platform fee collected (all-time)
              </p>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
