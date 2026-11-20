import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TRACKING_STAGES, SENDING_METHODS, PACKAGE_TYPES } from '@/lib/constants';
import type { Parcel } from '@/types/database';

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function AdminParcelControls({ parcel, onChanged }: { parcel: Parcel; onChanged: () => void }) {
  const { user, isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => toForm(parcel));

  if (!isAdmin) return null;

  const set = (k: keyof ReturnType<typeof toForm>, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('parcels')
      .update({
        buyer_name: form.buyer_name.trim(),
        buyer_phone: form.buyer_phone.trim(),
        destination: form.destination.trim(),
        pick_point: form.pick_point.trim() || null,
        sending_method: form.sending_method,
        psv_sacco: form.psv_sacco.trim() || null,
        package_type: form.package_type,
        num_packages: Math.max(1, Number(form.num_packages) || 1),
        sending_fee_per_package: Math.max(0, Number(form.sending_fee_per_package) || 0),
        payment_status: form.payment_status,
        tracking_status: form.tracking_status,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', parcel.id);
    if (!error && form.tracking_status !== parcel.tracking_status && user) {
      await supabase.from('parcel_tracking').insert({
        parcel_id: parcel.id, status: form.tracking_status, updated_by: user.id,
        notes: 'Stage changed by admin',
      } as any);
    }
    setBusy(false);
    if (error) return void toast.error(`Could not save: ${error.message}`);
    toast.success(`Saved changes to ${parcel.reference_number}`);
    setEditOpen(false);
    onChanged();
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('admin_delete_parcel', { _parcel_id: parcel.id });
    setBusy(false);
    if (error) return void toast.error(`Could not delete: ${error.message}`);
    toast.success(`Deleted ${parcel.reference_number}`);
    setDeleteOpen(false);
    onChanged();
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
        onClick={() => { setForm(toForm(parcel)); setEditOpen(true); }}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive border-destructive/40"
        onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit {parcel.reference_number}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Stage">
              <select className={selectCls} value={form.tracking_status} onChange={(e) => set('tracking_status', e.target.value)}>
                {TRACKING_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Payment">
              <select className={selectCls} value={form.payment_status} onChange={(e) => set('payment_status', e.target.value)}>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="pay_on_delivery">Pay on delivery</option>
              </select>
            </Field>
            <Field label="Buyer name"><Input value={form.buyer_name} onChange={(e) => set('buyer_name', e.target.value)} /></Field>
            <Field label="Buyer phone"><Input inputMode="tel" value={form.buyer_phone} onChange={(e) => set('buyer_phone', e.target.value)} /></Field>
            <Field label="Destination"><Input value={form.destination} onChange={(e) => set('destination', e.target.value)} /></Field>
            <Field label="Pick-point"><Input value={form.pick_point} onChange={(e) => set('pick_point', e.target.value)} /></Field>
            <Field label="Sending method">
              <select className={selectCls} value={form.sending_method} onChange={(e) => set('sending_method', e.target.value)}>
                {SENDING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="SACCO"><Input value={form.psv_sacco} onChange={(e) => set('psv_sacco', e.target.value)} /></Field>
            <Field label="Package type">
              <select className={selectCls} value={form.package_type} onChange={(e) => set('package_type', e.target.value)}>
                {[...new Set<string>([form.package_type, ...PACKAGE_TYPES])].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Packages"><Input type="number" min={1} value={form.num_packages} onChange={(e) => set('num_packages', e.target.value)} /></Field>
            <Field label="Fee per package (KES)"><Input type="number" min={0} value={form.sending_fee_per_package} onChange={(e) => set('sending_fee_per_package', e.target.value)} /></Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="gap-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {parcel.reference_number}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the parcel, its tracking history and receipt links. It cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function toForm(p: Parcel) {
  return {
    buyer_name: p.buyer_name ?? '', buyer_phone: p.buyer_phone ?? '', destination: p.destination ?? '',
    pick_point: p.pick_point ?? '', sending_method: (p.sending_method ?? 'psv') as string, psv_sacco: p.psv_sacco ?? '',
    package_type: (p.package_type ?? 'Other') as string, num_packages: String(p.num_packages ?? 1),
    sending_fee_per_package: String(p.sending_fee_per_package ?? 0),
    payment_status: (p.payment_status ?? 'unpaid') as string, tracking_status: (p.tracking_status ?? 'dispatched_to_pap') as string,
  };
}
