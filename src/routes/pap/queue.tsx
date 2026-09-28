import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { usePapOperations } from '@/hooks/usePapOperations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TrackingProgressBar } from '@/components/seller/TrackingProgressBar';
import { 
  Inbox, 
  Search, 
  CheckCheck, 
  Package, 
  MapPin, 
  Phone, 
  Store, 
  RefreshCw, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';

export const Route = createFileRoute('/pap/queue')({
  head: () => ({
    meta: [
      { title: 'Incoming Queue — Pata Parcel Operations Hub' },
      { name: 'description', content: 'Receive and check incoming seller parcels at the Pata Parcel sorting hub.' },
      { property: 'og:title', content: 'Incoming Queue — Pata Parcel Operations Hub' },
      { property: 'og:description', content: 'Receive and check incoming seller parcels at the Pata Parcel sorting hub.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/pap/queue' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/pap/queue' }],
  }),
  component: PapQueuePage,
});

function PapQueuePage() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { parcels, loading, error, receiveParcels, refetch } = usePapOperations(user?.id);

  // Filter & Selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Incoming parcels are those in 'dispatched_to_pap' stage
  const incomingParcels = useMemo(() => {
    return parcels.filter(p => p.tracking_status === 'dispatched_to_pap');
  }, [parcels]);

  // Filtered
  const filteredParcels = useMemo(() => {
    if (!searchQuery.trim()) return incomingParcels;
    const q = searchQuery.toLowerCase();
    return incomingParcels.filter(p => {
      const matchSeller = p.seller?.business_name?.toLowerCase().includes(q) || p.seller?.owner_name?.toLowerCase().includes(q);
      const matchBuyer = p.buyer_name?.toLowerCase().includes(q);
      const matchDest = p.destination?.toLowerCase().includes(q);
      const matchRef = p.reference_number?.toLowerCase().includes(q);
      return matchSeller || matchBuyer || matchDest || matchRef;
    });
  }, [incomingParcels, searchQuery]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredParcels.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParcels.map(p => p.id));
    }
  };

  // Batch receive into Sorting
  const handleReceiveSelected = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setActionSuccess(null);

    const { error: rErr } = await receiveParcels(selectedIds);
    setActionLoading(false);

    if (!rErr) {
      setActionSuccess(`Received ${selectedIds.length} parcel(s) into Sorting!`);
      setSelectedIds([]);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Single receive
  const handleReceiveSingle = async (id: string) => {
    setActionLoading(true);
    const { error: rErr } = await receiveParcels([id]);
    setActionLoading(false);

    if (!rErr) {
      setActionSuccess('Parcel marked as Received at PAP Sorting Hub!');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  return (
    <AppShell role="pap_staff">
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Incoming Parcels Queue
            </h1>
            <p className="text-xs text-muted-foreground">
              {incomingParcels.length} parcels waiting to be received and sorted
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh list"
            onClick={refetch}
            disabled={loading}
            className="h-9 w-9"
            title="Refresh queue"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>

        {/* Action alerts */}
        {actionSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
            {actionSuccess}
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search & Bulk Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Seller, Buyer, Destination, Ref #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          {filteredParcels.length > 0 && (
            <div className="flex items-center justify-between bg-card p-2.5 rounded-xl border border-border/80">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.length === filteredParcels.length && filteredParcels.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-xs font-semibold cursor-pointer">
                  {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'Select All'}
                </label>
              </div>

              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleReceiveSelected}
                  disabled={actionLoading}
                  className="h-8 font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 text-xs flex items-center gap-1"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  Receive Selected ({selectedIds.length})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Parcels List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredParcels.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
            <h2 className="font-semibold text-foreground text-sm">No incoming parcels in queue</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {searchQuery ? 'No parcels match your search query.' : 'When online sellers dispatch parcels, they will appear here for PAP staff to scan or receive.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParcels.map((parcel) => {
              const isSelected = selectedIds.includes(parcel.id);
              const createdDate = new Date(parcel.created_at).toLocaleDateString('en-KE', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Card 
                  key={parcel.id} 
                  className={`overflow-hidden border transition-all ${
                    isSelected 
                      ? 'border-primary bg-secondary/5 ring-1 ring-primary' 
                      : 'border-border/80 bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="p-3.5 space-y-3">
                    {/* Top Row: Checkbox, Ref Number, Seller Name */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(parcel.id)}
                        />
                        <span className="font-mono text-xs font-bold text-primary">
                          {parcel.reference_number || 'PAP-PENDING'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {createdDate}
                      </span>
                    </div>

                    {/* Seller Banner */}
                    <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Store className="h-3.5 w-3.5 text-primary" />
                        <span>{parcel.seller?.business_name || parcel.seller?.owner_name || 'Online Seller'}</span>
                      </div>
                      {parcel.seller?.phone && (
                        <a
                          href={`tel:${parcel.seller.phone}`}
                          className="text-primary hover:underline text-[11px] flex items-center gap-1 font-medium"
                        >
                          <Phone className="h-3 w-3" /> {formatPhoneDisplay(parcel.seller.phone)}
                        </a>
                      )}
                    </div>

                    {/* Buyer & Destination */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Buyer:</span>
                        <p className="font-semibold text-foreground truncate">{parcel.buyer_name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatPhoneDisplay(parcel.buyer_phone)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Destination:</span>
                        <p className="font-semibold text-primary flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {parcel.destination}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {parcel.num_packages}x {parcel.package_type}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <TrackingProgressBar status={parcel.tracking_status} compact />

                    {/* Action Button */}
                    <div className="pt-1 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleReceiveSingle(parcel.id)}
                        disabled={actionLoading}
                        className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Receive & Move to Sorting
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
