import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2, Loader2, ShieldCheck, CreditCard, Wallet, Clock, Banknote, TrendingUp } from 'lucide-react';

export const Route = createFileRoute('/admin/dashboard')({
  head: () => ({
    meta: [
      { title: 'Staff Management — Pata Parcel Admin' },
      { name: 'description', content: 'Add Pata Parcel operations staff and admins and manage their roles.' },
      { property: 'og:title', content: 'Staff Management — Pata Parcel Admin' },
      { property: 'og:description', content: 'Add Pata Parcel operations staff and admins and manage their roles.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AdminDashboard,
});

type StaffRole = 'pap_admin' | 'pap_staff';
interface StaffRow { user_id: string; email: string; owner_name: string; role: StaffRole }

interface ParcelPayment {
  id: string;
  payment_status: string;
  total_sending_fee: number;
  platform_fee: number;
  platform_fee_paid: boolean;
  num_packages: number;
}

const ROLE_LABEL: Record<StaffRole, string> = { pap_admin: 'Admin', pap_staff: 'Staff' };
const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

function PaymentSummary() {
  const [parcels, setParcels] = useState<ParcelPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('parcels')
      .select('id, payment_status, total_sending_fee, platform_fee, platform_fee_paid, num_packages')
      .then(({ data }) => {
        setParcels((data as ParcelPayment[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />;

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
      label: 'Paid',
      count: paid.length,
      amount: paidSendingFees,
      icon: CreditCard,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      label: 'Unpaid',
      count: unpaid.length,
      amount: unpaidSendingFees,
      icon: Wallet,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800',
    },
    {
      label: 'Pay on Delivery',
      count: cod.length,
      amount: codSendingFees,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
    },
    {
      label: 'Total Sending Fees',
      count: parcels.length,
      amount: totalSendingFees,
      icon: Banknote,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Payment Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statusCards.map(({ label, count, amount, icon: Icon, color, bg, border }) => (
          <Card key={label} className={`p-3.5 border ${border} ${bg}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</p>
                <p className={`text-xl font-extrabold mt-0.5 ${color}`}>{count}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{kes(amount)}</p>
              </div>
              <div className={`shrink-0 p-1.5 rounded-lg ${bg} border ${border}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Platform Fee Breakdown */}
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
  );
}

function AdminDashboard() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('pap_staff');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate({ to: '/login', search: { mode: undefined } });
  }, [authLoading, isAuthenticated, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_staff');
    if (error) toast.error(error.message);
    setStaff((data as StaffRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (profile?.role === 'pap_admin') load(); }, [profile?.role, load]);

  const setStaffRole = async (targetEmail: string, newRole: StaffRole) => {
    const { error } = await supabase.rpc('admin_set_staff_role', { _email: targetEmail, _role: newRole });
    if (error) { toast.error(error.message); return false; }
    toast.success(`${targetEmail} is now ${ROLE_LABEL[newRole]}`);
    await load();
    return true;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    if (await setStaffRole(email, role)) setEmail('');
    setSaving(false);
  };

  const handleRemove = async (row: StaffRow) => {
    if (!confirm(`Remove ${row.email} from staff? They will become a regular seller.`)) return;
    const { error } = await supabase.rpc('admin_remove_staff', { _user_id: row.user_id });
    if (error) toast.error(error.message); else { toast.success('Removed'); load(); }
  };

  if (!authLoading && profile && profile.role !== 'pap_admin') {
    return (
      <AppShell role={profile.role as any}>
        <p className="text-center text-sm text-muted-foreground py-10">Only Pata Parcel admins can open this page.</p>
      </AppShell>
    );
  }

  return (
    <AppShell role="pap_admin">
      <div className="space-y-4 max-w-2xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">Payments overview and team management.</p>
        </div>

        {/* Payments Section */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Banknote className="h-4 w-4" /> Payments Overview
          </h2>
          <PaymentSummary />
        </div>

        {/* Staff Management Section */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Staff Management
          </h2>
          <Card className="p-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add staff member</h2>
            <p className="text-xs text-muted-foreground">They must create an account first using this email.</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="staff-email">Email</Label>
                <Input id="staff-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={role} onValueChange={v => setRole(v as StaffRole)}>
                  <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pap_staff">Staff</SelectItem>
                    <SelectItem value="pap_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</Button>
            </div>
          </form>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Team ({staff.length})</h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : staff.length === 0 ? (
            <p className="text-xs text-muted-foreground">No staff yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {staff.map(row => (
                <li key={row.user_id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.owner_name || row.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                  </div>
                  {row.user_id === user?.id ? (
                    <Badge>{ROLE_LABEL[row.role]} (you)</Badge>
                  ) : (
                    <>
                      <Select value={row.role} onValueChange={v => setStaffRole(row.email, v as StaffRole)}>
                        <SelectTrigger className="w-28 h-8 text-xs" aria-label={`Role for ${row.email}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pap_staff">Staff</SelectItem>
                          <SelectItem value="pap_admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" aria-label={`Remove ${row.email}`} onClick={() => handleRemove(row)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        </div> {/* end staff section */}
      </div>
    </AppShell>
  );
}
