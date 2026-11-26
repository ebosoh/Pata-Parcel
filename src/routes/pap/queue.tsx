import { AdminParcelControls } from '@/components/pap/AdminParcelControls';
import { isInternalPickup } from '@/lib/internalPickup';
import { PapQueueTable } from '@/components/pap/PapQueueTable';
import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { usePapOperations, type ParcelWithSeller } from '@/hooks/usePapOperations';
import { DispatchForm } from '@/components/seller/DispatchForm';
import { DispatchPrintModal } from '@/components/seller/DispatchPrintModal';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
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
  Clock,
  AlertCircle,
  Layers,
  List,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Shield,
  CreditCard,
  Building2,
  CheckCircle2,
  LayoutGrid,
  Table2,
  Plus,
  Printer
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
      { property: 'og:url', content: 'https://www.pata-parcel.com/pap/queue' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://www.pata-parcel.com/pap/queue' }],
  }),
  component: PapQueuePage,
});

type SortOrder = 'newest' | 'oldest';
type ViewMode = 'by_seller' | 'list';

interface SellerGroup {
  sellerId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  parcels: ParcelWithSeller[];
  totalPackages: number;
  latestArrival: number;
  earliestArrival: number;
}

function formatArrivalTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  let relative = 'Just now';
  if (diffSec >= 60 && diffSec < 3600) {
    const min = Math.floor(diffSec / 60);
    relative = `${min}m ago`;
  } else if (diffSec >= 3600 && diffSec < 86400) {
    const hr = Math.floor(diffSec / 3600);
    relative = `${hr}h ago`;
  } else if (diffSec >= 86400) {
    const days = Math.floor(diffSec / 86400);
    relative = days === 1 ? '1d ago' : `${days}d ago`;
  }

  const exact = date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateFormatted = date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
  });

  return { relative, exact, full: `${dateFormatted}, ${exact}` };
}

function getPaymentBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-semibold">
          Paid
        </Badge>
      );
    case 'pay_on_delivery':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-semibold">
          COD
        </Badge>
      );
    default:
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 text-[10px] font-semibold">
          Unpaid
        </Badge>
      );
  }
}

function PapQueuePage() {
  const { user, profile, isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { parcels, destinations, loading, error, receiveParcels, refetch, createParcel } = usePapOperations(user?.id);

  // Modal states for New Dispatch and Offline Sorting/Print Manifest
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filter & Selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [timeSort, setTimeSort] = useState<SortOrder>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('by_seller');
  const [displayFormat, setDisplayFormat] = useState<'card' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pap_queue_display_format') as 'card' | 'table') || 'card';
    }
    return 'card';
  });

  const handleSetDisplayFormat = (format: 'card' | 'table') => {
    setDisplayFormat(format);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pap_queue_display_format', format);
    }
  };
  const [collapsedSellers, setCollapsedSellers] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Incoming parcels are those in 'dispatched_to_pap' stage from external sellers
  const incomingParcels = useMemo(() => {
    return parcels.filter(p => p.tracking_status === 'dispatched_to_pap' && !isInternalPickup(p));
  }, [parcels]);

  // Unique list of sellers with incoming dispatches
  const sellerList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    incomingParcels.forEach(p => {
      const id = p.seller_id;
      const name = p.seller?.business_name || p.seller?.owner_name || 'Online Seller';
      const existing = map.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(id, { id, name, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [incomingParcels]);

  // Filtered parcels with search and seller filter
  const filteredParcels = useMemo(() => {
    let result = incomingParcels;

    if (sellerFilter !== 'all') {
      result = result.filter(p => p.seller_id === sellerFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const matchSeller = p.seller?.business_name?.toLowerCase().includes(q) || p.seller?.owner_name?.toLowerCase().includes(q);
        const matchBuyer = p.buyer_name?.toLowerCase().includes(q);
        const matchBuyerPhone = p.buyer_phone?.includes(q);
        const matchDest = p.destination?.toLowerCase().includes(q);
        const matchRef = p.reference_number?.toLowerCase().includes(q);
        return matchSeller || matchBuyer || matchBuyerPhone || matchDest || matchRef;
      });
    }

    // Sort by arrival time
    return [...result].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeSort === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [incomingParcels, sellerFilter, searchQuery, timeSort]);

  // Group filtered parcels by seller
  const sellerGroups = useMemo(() => {
    const groupsMap = new Map<string, SellerGroup>();

    filteredParcels.forEach(parcel => {
      const id = parcel.seller_id;
      const time = new Date(parcel.created_at).getTime();
      let group = groupsMap.get(id);

      if (!group) {
        group = {
          sellerId: id,
          businessName: parcel.seller?.business_name || parcel.seller?.owner_name || 'Online Seller',
          ownerName: parcel.seller?.owner_name || '',
          phone: parcel.seller?.phone || '',
          parcels: [],
          totalPackages: 0,
          latestArrival: time,
          earliestArrival: time,
        };
        groupsMap.set(id, group);
      }

      group.parcels.push(parcel);
      group.totalPackages += parcel.num_packages || 1;
      if (time > group.latestArrival) group.latestArrival = time;
      if (time < group.earliestArrival) group.earliestArrival = time;
    });

    const groups = Array.from(groupsMap.values());

    // Sort seller groups based on arrival time order
    groups.sort((a, b) => {
      if (timeSort === 'newest') {
        return b.latestArrival - a.latestArrival;
      }
      return a.earliestArrival - b.earliestArrival;
    });

    return groups;
  }, [filteredParcels, timeSort]);

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

  // Batch receive selected into Sorting
  const handleReceiveSelected = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setActionSuccess(null);

    const { error: rErr } = await receiveParcels(selectedIds);
    setActionLoading(false);

    if (!rErr) {
      setActionSuccess(`Received ${selectedIds.length} parcel(s) into Sorting!`);
      setSelectedIds([]);
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  // Receive all parcels belonging to a single seller
  const handleReceiveSellerGroup = async (group: SellerGroup) => {
    const ids = group.parcels.map(p => p.id);
    if (ids.length === 0) return;
    setActionLoading(true);
    setActionSuccess(null);

    const { error: rErr } = await receiveParcels(ids);
    setActionLoading(false);

    if (!rErr) {
      setActionSuccess(`Received all ${ids.length} parcel(s) from ${group.businessName} into Sorting!`);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  // Single receive
  const handleReceiveSingle = async (id: string) => {
    setActionLoading(true);
    const { error: rErr } = await receiveParcels([id]);
    setActionLoading(false);

    if (!rErr) {
      setActionSuccess('Parcel marked as Received at PAP Sorting Hub!');
      setSelectedIds(prev => prev.filter(x => x !== id));
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const toggleSellerCollapse = (sellerId: string) => {
    setCollapsedSellers(prev => ({ ...prev, [sellerId]: !prev[sellerId] }));
  };

  const expandAll = () => setCollapsedSellers({});
  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    sellerGroups.forEach(g => { collapsed[g.sellerId] = true; });
    setCollapsedSellers(collapsed);
  };

  const sortingCount = parcels.filter((p) => p.tracking_status === 'sorting').length;
  const transitCount = parcels.filter((p) => p.tracking_status === 'on_transit').length;

  return (
    <AppShell role={profile?.role ?? 'pap_staff'}>
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Next Stage Banner */}
        {(sortingCount > 0 || transitCount > 0) && (
          <Link
            to="/pap/dispatch"
            className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs"
          >
            <span className="min-w-0 text-foreground">
              <b>{sortingCount}</b> in Sorting · <b>{transitCount}</b> On Transit — move them to the next stage
            </span>
            <span className="shrink-0 font-bold text-primary hover:underline">Open Dispatch →</span>
          </Link>
        )}

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Inbox className="h-5 w-5 shrink-0 text-primary" />
                Incoming Parcels Queue
              </h1>
              {isAdmin && (
                <Badge className="bg-primary text-secondary font-bold text-[10px] uppercase tracking-wide gap-1">
                  <Shield className="h-3 w-3" /> Admin View
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {incomingParcels.length} parcel{incomingParcels.length === 1 ? '' : 's'} waiting · {sellerList.length} seller{sellerList.length === 1 ? '' : 's'}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="h-9 shrink-0 px-3 font-semibold text-xs flex items-center gap-1.5"
              title="Print offline sorting manifest table"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>

            <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 shrink-0 px-3 font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center gap-1.5 sm:px-4">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Dispatch</span>
                  <span className="sm:hidden">New</span>
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
                  mode="staff"
                  destinations={destinations}
                  onSubmit={createParcel}
                  onSuccess={() => {
                    setIsNewDialogOpen(false);
                    toast.success('New dispatch created — view in Dispatch Hub under Internal Pick-up');
                  }}
                  onCancel={() => setIsNewDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh list"
              onClick={refetch}
              disabled={loading}
              className="h-9 w-9 shrink-0 cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Action success / error alerts */}
        {actionSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters & Sorting Controls */}
        <div className="bg-card p-3 rounded-xl border border-border/80 shadow-xs space-y-3">
          {/* Row 1: Search & Seller Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Seller, Buyer, Destination, Ref #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Seller Account Filter Dropdown */}
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="h-9 text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {sellerFilter === 'all'
                      ? `All Sellers (${sellerList.length})`
                      : sellerList.find(s => s.id === sellerFilter)?.name || 'Filter by Seller'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Sellers ({incomingParcels.length} total parcels)
                </SelectItem>
                {sellerList.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.count} parcel{s.count === 1 ? '' : 's'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Arrival Time Sort & View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
            {/* Arrival Time Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="h-3.5 w-3.5 text-primary" /> Arrival Time:
              </span>
              <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setTimeSort('newest')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    timeSort === 'newest'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Newest First
                </button>
                <button
                  type="button"
                  onClick={() => setTimeSort('oldest')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    timeSort === 'oldest'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Oldest First (FIFO)
                </button>
              </div>
            </div>

            {/* View Format Switcher (Cards vs Table) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5">
                <button
                  type="button"
                  onClick={() => handleSetDisplayFormat('card')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    displayFormat === 'card'
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Card view"
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-3 w-3" /> Cards
                </button>
                <button
                  type="button"
                  onClick={() => handleSetDisplayFormat('table')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    displayFormat === 'table'
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Table view"
                  aria-label="Table view"
                >
                  <Table2 className="h-3 w-3" /> Table
                </button>
              </div>

              {displayFormat === 'card' && (
                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('by_seller')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      viewMode === 'by_seller'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers className="h-2.5 w-2.5" /> By Seller
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <List className="h-2.5 w-2.5" /> Flat List
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Selection Bar */}
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

            <div className="flex items-center gap-2">
              {viewMode === 'by_seller' && sellerGroups.length > 1 && (
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                  <button onClick={expandAll} className="hover:underline cursor-pointer">Expand all</button>
                  <span>·</span>
                  <button onClick={collapseAll} className="hover:underline cursor-pointer">Collapse all</button>
                </div>
              )}

              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleReceiveSelected}
                  disabled={actionLoading}
                  className="h-8 font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 text-xs flex items-center gap-1.5 cursor-pointer"
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
          </div>
        )}

        {/* Parcels Content */}
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
              {searchQuery || sellerFilter !== 'all'
                ? 'No parcels match your search or seller filter.'
                : 'When online sellers dispatch parcels, they will appear here for PAP staff and admins to receive.'}
            </p>
            {(searchQuery || sellerFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearchQuery(''); setSellerFilter('all'); }}
                className="mt-3 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : displayFormat === 'table' ? (
          <PapQueueTable
            parcels={filteredParcels}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleSelectAll}
            onReceiveSingle={handleReceiveSingle}
            actionLoading={actionLoading}
            onRefetch={refetch}
          />
        ) : viewMode === 'by_seller' ? (
          /* ========================================================================= */
          /* GROUPED BY SELLER ACCOUNT VIEW                                            */
          /* ========================================================================= */
          <div className="space-y-4">
            {sellerGroups.map((group) => {
              const isCollapsed = collapsedSellers[group.sellerId];
              const latestArrivalFormatted = formatArrivalTime(new Date(group.latestArrival).toISOString());
              const groupIds = group.parcels.map(p => p.id);
              const allGroupSelected = groupIds.every(id => selectedIds.includes(id));

              return (
                <Card key={group.sellerId} className="overflow-hidden border border-border shadow-xs">
                  {/* Seller Header Section */}
                  <div className="bg-muted/40 p-3 sm:p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary text-secondary flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-bold text-sm text-foreground truncate">
                            {group.businessName}
                          </h2>
                          {group.ownerName && group.ownerName !== group.businessName && (
                            <span className="text-[11px] text-muted-foreground">({group.ownerName})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {group.phone && (
                            <a
                              href={`tel:${group.phone}`}
                              className="text-primary hover:underline text-[11px] flex items-center gap-1 font-medium"
                            >
                              <Phone className="h-3 w-3" /> {formatPhoneDisplay(group.phone)}
                            </a>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                            <Clock className="h-3 w-3" /> Latest: {latestArrivalFormatted.relative} ({latestArrivalFormatted.exact})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Group Badges & Quick Action */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge variant="secondary" className="font-semibold text-xs">
                        {group.parcels.length} parcel{group.parcels.length === 1 ? '' : 's'} ({group.totalPackages} pkgs)
                      </Badge>

                      <Button
                        size="sm"
                        onClick={() => handleReceiveSellerGroup(group)}
                        disabled={actionLoading}
                        className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                        title={`Receive all ${group.parcels.length} parcels from this seller`}
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5 mr-1" />}
                        Receive All ({group.parcels.length})
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSellerCollapse(group.sellerId)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={isCollapsed ? 'Expand seller parcels' : 'Collapse seller parcels'}
                      >
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Parcels under this seller */}
                  {!isCollapsed && (
                    <div className="p-3 sm:p-4 space-y-3 bg-card/60 divide-y divide-border/60">
                      {group.parcels.map((parcel) => {
                        const isSelected = selectedIds.includes(parcel.id);
                        const arrival = formatArrivalTime(parcel.created_at);

                        return (
                          <div
                            key={parcel.id}
                            className={`pt-3 first:pt-0 transition-colors rounded-lg p-2.5 ${
                              isSelected ? 'bg-secondary/10 border border-primary/30' : 'hover:bg-muted/30'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Top row: Checkbox, Reference Number, Arrival Timestamp Pill */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleSelect(parcel.id)}
                                  />
                                  <span className="font-mono text-xs font-bold text-primary">
                                    {parcel.reference_number || 'PAP-PENDING'}
                                  </span>
                                  {getPaymentBadge(parcel.payment_status)}
                                </div>

                                {/* Arrival Time Pill */}
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 flex items-center gap-1 font-semibold">
                                    <Clock className="h-2.5 w-2.5" />
                                    Arrived: {arrival.relative} ({arrival.exact})
                                  </Badge>
                                </div>
                              </div>

                              {/* Buyer & Destination Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="bg-muted/20 p-2 rounded-lg">
                                  <span className="text-[10px] text-muted-foreground block font-medium">Buyer Details:</span>
                                  <p className="font-semibold text-foreground truncate">{parcel.buyer_name}</p>
                                  <p className="text-[11px] text-muted-foreground">{formatPhoneDisplay(parcel.buyer_phone)}</p>
                                </div>
                                <div className="bg-muted/20 p-2 rounded-lg">
                                  <span className="text-[10px] text-muted-foreground block font-medium">Destination & Packages:</span>
                                  <p className="font-semibold text-primary flex items-center gap-1 truncate">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    {parcel.destination}
                                    {parcel.pick_point && <span className="text-muted-foreground font-normal">({parcel.pick_point})</span>}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {parcel.num_packages}x {parcel.package_type} · {parcel.sending_method.replace(/_/g, ' ')}
                                  </p>
                                </div>
                              </div>

                              {/* Tracking Progress */}
                              <TrackingProgressBar status={parcel.tracking_status} compact />

                              {/* Action Buttons */}
                              <div className="pt-1 flex flex-wrap items-center justify-end gap-2">
                                <AdminParcelControls parcel={parcel} onChanged={refetch} />
                                <Button
                                  size="sm"
                                  onClick={() => handleReceiveSingle(parcel.id)}
                                  disabled={actionLoading}
                                  className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                                >
                                  Receive & Move to Sorting
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* FLAT LIST VIEW (ALL PARCELS SORTED BY ARRIVAL TIME)                      */
          /* ========================================================================= */
          <div className="space-y-3">
            {filteredParcels.map((parcel) => {
              const isSelected = selectedIds.includes(parcel.id);
              const arrival = formatArrivalTime(parcel.created_at);

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
                    {/* Top Row: Checkbox, Ref Number, Arrival Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(parcel.id)}
                        />
                        <span className="font-mono text-xs font-bold text-primary">
                          {parcel.reference_number || 'PAP-PENDING'}
                        </span>
                        {getPaymentBadge(parcel.payment_status)}
                      </div>

                      {/* Arrival Time */}
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 flex items-center gap-1 font-semibold">
                        <Clock className="h-3 w-3" />
                        Arrived: {arrival.relative} ({arrival.exact})
                      </Badge>
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
                        {parcel.pick_point && (
                          <p className="text-[11px] font-medium text-foreground">Pick-point: {parcel.pick_point}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {parcel.num_packages}x {parcel.package_type} · {parcel.sending_method.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <TrackingProgressBar status={parcel.tracking_status} compact />

                    {/* Action Button */}
                    <div className="pt-1 flex flex-wrap justify-end gap-2">
                      <AdminParcelControls parcel={parcel} onChanged={refetch} />
                      <Button
                        size="sm"
                        onClick={() => handleReceiveSingle(parcel.id)}
                        disabled={actionLoading}
                        className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
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

        {/* Offline Sorting & Print Manifest Modal */}
        <DispatchPrintModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          parcels={parcels}
          businessName={profile?.business_name || profile?.owner_name || 'Pata Parcel'}
        />
      </div>
    </AppShell>
  );
}
