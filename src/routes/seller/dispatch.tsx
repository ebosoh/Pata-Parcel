import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useParcels } from '@/hooks/useParcels';
import { ParcelCard } from '@/components/seller/ParcelCard';
import { DispatchForm } from '@/components/seller/DispatchForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Package, 
  RefreshCw, 
  Clock, 
  Truck, 
  CheckCircle, 
  AlertCircle,
  Store,
  ArrowRight
} from 'lucide-react';
import type { TrackingStatus } from '@/types/database';

export const Route = createFileRoute('/seller/dispatch' as any)({
  component: SellerDispatchPage,
});

function SellerDispatchPage() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { 
    parcels, 
    destinations, 
    saccos, 
    loading: parcelsLoading, 
    error: parcelsError, 
    createParcel, 
    refetch 
  } = useParcels(user?.id);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = parcels.length;
    const sorting = parcels.filter(p => p.tracking_status === 'sorting').length;
    const onTransit = parcels.filter(p => p.tracking_status === 'on_transit').length;
    const delivered = parcels.filter(p => p.tracking_status === 'delivered').length;
    return { total, sorting, onTransit, delivered };
  }, [parcels]);

  // Filtered parcels
  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      // Status filter
      if (selectedStatus !== 'all' && p.tracking_status !== selectedStatus) {
        return false;
      }
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.buyer_name?.toLowerCase().includes(q);
        const matchPhone = p.buyer_phone?.includes(q);
        const matchDest = p.destination?.toLowerCase().includes(q);
        const matchRef = p.reference_number?.toLowerCase().includes(q);
        return matchName || matchPhone || matchDest || matchRef;
      }
      return true;
    });
  }, [parcels, selectedStatus, searchQuery]);

  const isProfileComplete = !!(profile?.business_name && profile?.owner_name && profile?.phone);

  return (
    <AppShell role="seller">
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Profile Completion Reminder Banner */}
        {!isProfileComplete && !authLoading && (
          <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <Store className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold">Complete your business profile</p>
                <p className="text-[11px] text-muted-foreground">
                  Add your TikTok / IG handle and location so receipts show your brand.
                </p>
              </div>
            </div>
            <Link to={'/seller/profile' as any}>
              <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/50 bg-background hover:bg-amber-50">
                Setup <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* Top Header & New Dispatch Action */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              {profile?.business_name || 'My Dispatches'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {stats.total} total {stats.total === 1 ? 'parcel' : 'parcels'} sent through Pata Parcel
            </p>
          </div>

          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-4 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>New Dispatch</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Dispatch New Parcel
                </DialogTitle>
              </DialogHeader>
              <DispatchForm
                destinations={destinations}
                saccos={saccos}
                onSubmit={createParcel}
                onSuccess={() => setIsNewDialogOpen(false)}
                onCancel={() => setIsNewDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick KPI Stat Pills */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
              selectedStatus === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border/80 text-foreground hover:bg-muted/40'
            }`}
          >
            <span className="text-base font-extrabold">{stats.total}</span>
            <span className="text-[10px] font-medium leading-tight">All</span>
          </button>

          <button
            onClick={() => setSelectedStatus('sorting')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
              selectedStatus === 'sorting'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border/80 text-foreground hover:bg-muted/40'
            }`}
          >
            <span className="text-base font-extrabold">{stats.sorting}</span>
            <span className="text-[10px] font-medium leading-tight flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> Sorting
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('on_transit')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
              selectedStatus === 'on_transit'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border/80 text-foreground hover:bg-muted/40'
            }`}
          >
            <span className="text-base font-extrabold">{stats.onTransit}</span>
            <span className="text-[10px] font-medium leading-tight flex items-center gap-0.5">
              <Truck className="h-2.5 w-2.5" /> Transit
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('delivered')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
              selectedStatus === 'delivered'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border/80 text-foreground hover:bg-muted/40'
            }`}
          >
            <span className="text-base font-extrabold">{stats.delivered}</span>
            <span className="text-[10px] font-medium leading-tight flex items-center gap-0.5">
              <CheckCircle className="h-2.5 w-2.5" /> Delivered
            </span>
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by buyer, phone, town..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            disabled={refreshing || parcelsLoading}
            title="Refresh list"
            className="h-10 w-10 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>

        {/* Error State */}
        {parcelsError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{parcelsError}</span>
          </div>
        )}

        {/* Parcel List */}
        {parcelsLoading && parcels.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredParcels.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-foreground text-sm">
              {searchQuery ? 'No parcels match your search' : 'No parcels dispatched yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery 
                ? 'Try a different buyer name, phone number, or destination.'
                : 'Finished your live sell show? Click "New Dispatch" to send packages to Pata Parcel!'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsNewDialogOpen(true)}
                className="mt-4 font-bold bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Dispatch First Parcel
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParcels.map((parcel) => (
              <ParcelCard key={parcel.id} parcel={parcel} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
