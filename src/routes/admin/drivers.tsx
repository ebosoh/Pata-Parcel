import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getDispatchDrivers, saveDispatchDriver, updateDispatchDriverRecord, deleteDispatchDriverRecord } from '@/lib/drivers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Calendar,
  RefreshCw,
  Edit2,
  Trash2,
  Package,
  Building2,
  Car,
  User,
  Loader2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';
import type { DispatchDriver } from '@/types/database';

export const Route = createFileRoute('/admin/drivers')({
  head: () => ({
    meta: [
      { title: 'Drivers Directory — Pata Parcel Admin' },
      { name: 'description', content: 'Database of drivers used for PSV-Driver on-delivery dispatches.' },
      { property: 'og:title', content: 'Drivers Directory — Pata Parcel Admin' },
      { property: 'og:description', content: 'Database of drivers used for PSV-Driver on-delivery dispatches.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AdminDriversPage,
});

interface DriverWithDetails extends DispatchDriver {
  parcel?: {
    reference_number: string;
    destination: string;
    buyer_name: string;
    buyer_phone: string;
  } | null;
  creator?: {
    owner_name: string;
    business_name: string | null;
  } | null;
}

export function AdminDriversPage() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState<DriverWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DispatchDriver | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formSacco, setFormSacco] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [saving, setSaving] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const rows: DispatchDriver[] = await getDispatchDrivers();

      const parcelIds = rows.map(r => r.parcel_id).filter((id): id is string => !!id);
      const creatorIds = rows.map(r => r.created_by).filter((id): id is string => !!id);

      let parcelMap = new Map<string, any>();
      let creatorMap = new Map<string, any>();

      if (parcelIds.length > 0) {
        const { data: pData } = await supabase
          .from('parcels')
          .select('id, reference_number, destination, buyer_name, buyer_phone')
          .in('id', parcelIds);
        pData?.forEach(p => parcelMap.set(p.id, p));
      }

      if (creatorIds.length > 0) {
        const { data: cData } = await supabase
          .from('profiles')
          .select('id, owner_name, business_name')
          .in('id', creatorIds);
        cData?.forEach(c => creatorMap.set(c.id, c));
      }

      const enriched: DriverWithDetails[] = rows.map(d => ({
        ...d,
        parcel: d.parcel_id ? parcelMap.get(d.parcel_id) || null : null,
        creator: d.created_by ? creatorMap.get(d.created_by) || null : null,
      }));

      setDrivers(enriched);
    } catch (err: any) {
      console.warn('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'pap_admin' || profile?.role === 'pap_staff') {
      fetchDrivers();
    }
  }, [profile?.role, fetchDrivers]);

  const openAddModal = () => {
    setEditingDriver(null);
    setFormName('');
    setFormPhone('');
    setFormPlate('');
    setFormSacco('');
    setFormDestination('');
    setModalOpen(true);
  };

  const openEditModal = (driver: DispatchDriver) => {
    setEditingDriver(driver);
    setFormName(driver.driver_name);
    setFormPhone(driver.driver_phone);
    setFormPlate(driver.vehicle_plate);
    setFormSacco(driver.sacco_name || '');
    setFormDestination(driver.destination || '');
    setModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formPlate.trim()) {
      toast.error('Driver name, phone and vehicle plate are required');
      return;
    }

    setSaving(true);
    try {
      if (editingDriver) {
        await updateDispatchDriverRecord(editingDriver.id, {
          driver_name: formName.trim(),
          driver_phone: formPhone.trim(),
          vehicle_plate: formPlate.trim().toUpperCase(),
          sacco_name: formSacco.trim() || null,
          destination: formDestination.trim() || null,
        });
        toast.success(`Driver ${formName.trim()} updated successfully`);
      } else {
        await saveDispatchDriver({
          driver_name: formName.trim(),
          driver_phone: formPhone.trim(),
          vehicle_plate: formPlate.trim().toUpperCase(),
          sacco_name: formSacco.trim() || null,
          destination: formDestination.trim() || null,
          created_by: user?.id || null,
          parcel_id: null,
        });
        toast.success(`Driver ${formName.trim()} added to records`);
      }

      setModalOpen(false);
      await fetchDrivers();
    } catch (err: any) {
      toast.error('Failed to save driver: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDriver = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete driver record "${name}"?`)) return;

    try {
      await deleteDispatchDriverRecord(id);
      toast.success(`Driver record removed`);
      setDrivers(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete driver: ' + (err.message || 'Unknown error'));
    }
  };

  // Filtered driver list
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    const q = searchQuery.toLowerCase();
    return drivers.filter(d =>
      d.driver_name.toLowerCase().includes(q) ||
      d.driver_phone.toLowerCase().includes(q) ||
      d.vehicle_plate.toLowerCase().includes(q) ||
      (d.sacco_name && d.sacco_name.toLowerCase().includes(q)) ||
      (d.destination && d.destination.toLowerCase().includes(q)) ||
      (d.parcel?.reference_number && d.parcel.reference_number.toLowerCase().includes(q))
    );
  }, [drivers, searchQuery]);

  if (!authLoading && profile && profile.role !== 'pap_admin') {
    return (
      <AppShell role={profile.role as any}>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Truck className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-bold">Admin Access Required</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The drivers directory is restricted to Pata Parcel administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="pap_admin">
      <div className="space-y-5 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Drivers Directory
            </h1>
            <p className="text-xs text-muted-foreground">
              Reference table of drivers used for PSV-Driver on-delivery dispatches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDrivers}
              disabled={loading}
              className="h-9 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={openAddModal}
              className="h-9 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Driver
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by driver name, phone, plate, SACCO or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-10 bg-card border-border/80"
          />
        </div>

        {/* Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 bg-card border-border/80">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Total Records</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{drivers.length}</p>
          </Card>
          <Card className="p-3 bg-card border-border/80">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Unique Vehicles</p>
            <p className="text-xl font-extrabold text-primary mt-0.5">
              {new Set(drivers.map(d => d.vehicle_plate.toUpperCase())).size}
            </p>
          </Card>
          <Card className="p-3 bg-card border-border/80">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Unique Phones</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">
              {new Set(drivers.map(d => d.driver_phone)).size}
            </p>
          </Card>
          <Card className="p-3 bg-card border-border/80">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">SACCOs Represented</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
              {new Set(drivers.map(d => d.sacco_name).filter(Boolean)).size}
            </p>
          </Card>
        </div>

        {/* Drivers Table / Cards */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredDrivers.length === 0 ? (
          <Card className="py-12 px-4 text-center border-dashed border-border bg-card/50">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-foreground text-sm">
              {searchQuery ? 'No drivers match your search' : 'No drivers recorded yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Drivers entered during PSV-Driver on-delivery dispatches will automatically be saved and listed here.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border/80 bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Driver Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Vehicle Plate</th>
                    <th className="p-3">SACCO / Route</th>
                    <th className="p-3">Last Linked Parcel</th>
                    <th className="p-3">Recorded On</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredDrivers.map(d => (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{d.driver_name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                          <a
                            href={`tel:${d.driver_phone}`}
                            className="hover:underline hover:text-emerald-600"
                          >
                            {formatPhoneDisplay(d.driver_phone)}
                          </a>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground">
                        <Badge variant="outline" className="font-mono text-xs uppercase bg-background">
                          {d.vehicle_plate}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {d.sacco_name || d.destination ? (
                          <div className="flex flex-col">
                            {d.sacco_name && <span className="font-medium text-foreground">{d.sacco_name}</span>}
                            {d.destination && <span className="text-[10px] text-muted-foreground">{d.destination}</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {d.parcel ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-primary">{d.parcel.reference_number}</span>
                            <span className="text-[10px] text-muted-foreground">To: {d.parcel.destination}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {new Date(d.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(d)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Edit Driver"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDriver(d.id, d.driver_name)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Delete Driver Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2.5">
              {filteredDrivers.map(d => (
                <Card key={d.id} className="p-3 bg-card border-border/80 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary shrink-0" />
                        {d.driver_name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                        <a href={`tel:${d.driver_phone}`} className="hover:underline font-mono">
                          {formatPhoneDisplay(d.driver_phone)}
                        </a>
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs uppercase bg-muted/30">
                      {d.vehicle_plate}
                    </Badge>
                  </div>

                  {(d.sacco_name || d.destination) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/40">
                      <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span>{d.sacco_name || 'Independent'}{d.destination ? ` · ${d.destination}` : ''}</span>
                    </div>
                  )}

                  {d.parcel && (
                    <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg flex items-center justify-between">
                      <span className="font-mono font-semibold text-primary">{d.parcel.reference_number}</span>
                      <span>To: {d.parcel.destination}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                    <span>Added {new Date(d.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(d)}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDriver(d.id, d.driver_name)}
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Driver */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {editingDriver ? 'Edit Driver Details' : 'Add New Driver to System'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveDriver} className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="driver_name" className="text-xs font-medium">Driver Full Name *</Label>
                <Input
                  id="driver_name"
                  placeholder="e.g. Peter Mwangi"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="driver_phone" className="text-xs font-medium">Driver Phone *</Label>
                  <Input
                    id="driver_phone"
                    placeholder="07XX XXX XXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="driver_plate" className="text-xs font-medium">Vehicle Plate *</Label>
                  <Input
                    id="driver_plate"
                    placeholder="e.g. KDC 123X"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    required
                    className="h-9 text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="driver_sacco" className="text-xs font-medium">SACCO Name (Optional)</Label>
                <Input
                  id="driver_sacco"
                  placeholder="e.g. 2NK, Super Metro, North Rift"
                  value={formSacco}
                  onChange={(e) => setFormSacco(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="driver_dest" className="text-xs font-medium">Frequent Route / Destination (Optional)</Label>
                <Input
                  id="driver_dest"
                  placeholder="e.g. Nyeri, Eldoret, Kisumu"
                  value={formDestination}
                  onChange={(e) => setFormDestination(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 text-xs h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? (
                    <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Saving...</>
                  ) : editingDriver ? (
                    'Update Driver'
                  ) : (
                    'Save Driver'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
