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
import { UserPlus, Trash2, Loader2, ShieldCheck } from 'lucide-react';

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

const ROLE_LABEL: Record<StaffRole, string> = { pap_admin: 'Admin', pap_staff: 'Staff' };

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
          <h1 className="text-xl font-bold text-foreground">Staff Management</h1>
          <p className="text-xs text-muted-foreground">Add team members and choose what they can do.</p>
        </div>

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
      </div>
    </AppShell>
  );
}
