import { AdminParcelControls } from '@/components/pap/AdminParcelControls';
import { isInternalPickup } from '@/lib/internalPickup';
import { PapDispatchTable } from '@/components/pap/PapDispatchTable';
import { StorageImage } from '@/components/shared/StorageImage';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { openReceiptInWhatsApp } from '@/lib/shareReceiptWhatsApp';
import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ReceiptScanner } from '@/components/shared/ReceiptScanner';
import { useAuth } from '@/hooks/useAuth';
import { usePapOperations, type PapDispatchType, type DispatchOptions } from '@/hooks/usePapOperations';
import { getDispatchDrivers } from '@/lib/drivers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { TrackingProgressBar } from '@/components/seller/TrackingProgressBar';
import { DispatchForm } from '@/components/seller/DispatchForm';
import { DispatchPrintModal } from '@/components/seller/DispatchPrintModal';
import { 
  Truck, 
  Search, 
  Package, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  Send, 
  Loader2, 
  Camera, 
  FileText,
  AlertCircle,
  MessageCircle,
  LayoutGrid,
  Table2,
  Plus,
  Printer,
  RotateCcw
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';

const SENT_TO_BUYER_KEY = 'pap:receipts-sent-to-buyer';

export const Route = createFileRoute('/pap/dispatch')({
  validateSearch: (s: Record<string, unknown>): { tab?: 'transit' | 'sorting' | 'internal' | undefined } => ({
    tab: s['tab'] === 'transit' || s['tab'] === 'sorting' || s['tab'] === 'internal' ? s['tab'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Sorting & Dispatch — Pata Parcel Operations Hub' },
      { name: 'description', content: 'Sort parcels and hand them to PSV, Pick-up Mtaani and door-to-door couriers.' },
      { property: 'og:title', content: 'Sorting & Dispatch — Pata Parcel Operations Hub' },
      { property: 'og:description', content: 'Sort parcels and hand them to PSV, Pick-up Mtaani and door-to-door couriers.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://www.pata-parcel.com/pap/dispatch' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://www.pata-parcel.com/pap/dispatch' }],
  }),
  component: PapDispatchPage,
});

function getStayInfo(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);
  const stayLabel = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  const totalDue = days >= 3 ? 100 : 50;
  return { stayLabel, totalDue, days };
}

export function PapDispatchPage() {
  const { user, profile, isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isAssistant = profile?.role === 'assistant_staff';

  const {
    parcels,
    destinations,
    loading,
    error,
    dispatchParcel,
    deliverParcel,
    reversePickup,
    batchReversePickup,
    uploadReceipt,
    receiptsByParcel,
    refetch,
    createParcel,
  } = usePapOperations(user?.id);

  // Modal states for New Dispatch and Offline Sorting/Print Manifest
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Tabs: 'sorting' (Ready to Dispatch) vs 'transit' (On Transit) vs 'internal' (Internal Pick-up)
  const [activeTab, setActiveTab] = useState<'sorting' | 'transit' | 'internal'>('sorting');
  const { tab: tabParam } = Route.useSearch();
  useEffect(() => {
    if (isAssistant) {
      setActiveTab('internal');
    } else if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [isAssistant, tabParam]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pap_dispatch_view_mode') as 'card' | 'table') || 'card';
    }
    return 'card';
  });

  const handleSetViewMode = (mode: 'card' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pap_dispatch_view_mode', mode);
    }
  };

  // Dispatch Modal state
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
  const [dispatchType, setDispatchType] = useState<PapDispatchType>('psv_official');
  const [saccoName, setSaccoName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [pickupStation, setPickupStation] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Saved drivers for lookup/autocomplete
  const [savedDrivers, setSavedDrivers] = useState<Array<{ id: string; driver_name: string; driver_phone: string; vehicle_plate: string; sacco_name?: string | null }>>([]);

  // Fetch recent drivers for reuse
  useEffect(() => {
    async function loadSavedDrivers() {
      try {
        const data = await getDispatchDrivers();
        if (data && data.length > 0) {
          // De-duplicate by phone or plate
          const seen = new Set<string>();
          const unique: typeof data = [];
          for (const d of data) {
            const key = `${d.driver_phone}_${d.vehicle_plate}`.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(d);
            }
          }
          setSavedDrivers(unique);
        }
      } catch (err) {
        console.warn('Could not load saved drivers:', err);
      }
    }
    loadSavedDrivers();
  }, []);

  // Receipt Modal state (after dispatch)
  const [receiptModalParcel, setReceiptModalParcel] = useState<any | null>(null);
  const [sentToBuyerIds, setSentToBuyerIds] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SENT_TO_BUYER_KEY);
      if (saved) setSentToBuyerIds(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      // Nothing remembered on this device.
    }
  }, []);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  // Parcels whose delivery was just confirmed — their button is hidden at once
  const [deliveredIds, setDeliveredIds] = useState<Record<string, boolean>>({});
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Internal Pick-up parcels (staff-created dispatches or hub pick-ups)
  const internalParcels = useMemo(() => {
    return parcels.filter(
      p => isInternalPickup(p) || p.sending_method === 'pata_parcel'
    );
  }, [parcels]);

  // Sub-filter for Internal Pick-up tab: 'all' | 'pending' | 'completed'
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const pendingInternalCount = useMemo(() => {
    return internalParcels.filter(p => !deliveredIds[p.id] && p.tracking_status !== 'delivered').length;
  }, [internalParcels, deliveredIds]);

  const completedInternalCount = useMemo(() => {
    return internalParcels.filter(p => deliveredIds[p.id] || p.tracking_status === 'delivered').length;
  }, [internalParcels, deliveredIds]);

  const filteredInternalParcels = useMemo(() => {
    if (internalStatusFilter === 'pending') {
      return internalParcels.filter(p => !deliveredIds[p.id] && p.tracking_status !== 'delivered');
    }
    if (internalStatusFilter === 'completed') {
      return internalParcels.filter(p => deliveredIds[p.id] || p.tracking_status === 'delivered');
    }
    return internalParcels;
  }, [internalParcels, internalStatusFilter, deliveredIds]);

  // Sorting parcels (Ready to Dispatch - external sellers)
  const sortingParcels = useMemo(() => {
    return parcels.filter(
      p => p.tracking_status === 'sorting' && !isInternalPickup(p) && p.sending_method !== 'pata_parcel'
    );
  }, [parcels]);

  // On Transit parcels
  const transitParcels = useMemo(() => {
    return parcels.filter(
      p => p.tracking_status === 'on_transit' && !isInternalPickup(p) && p.sending_method !== 'pata_parcel'
    );
  }, [parcels]);

  // Receipt already shared for the parcel open in the receipt modal, if any
  const receiptModalExisting = receiptModalParcel
    ? receiptsByParcel[receiptModalParcel.id]
    : undefined;

  // Always fill the SACCO name from the SACCO the seller selected on the dispatch
  // form; clear it when the seller left it blank so no stale name carries over.
  useEffect(() => {
    setSaccoName(selectedParcel?.psv_sacco ?? '');
  }, [selectedParcel]);

  const displayList = useMemo(() => {
    const list = isAssistant
      ? filteredInternalParcels
      : activeTab === 'sorting'
        ? sortingParcels
        : activeTab === 'transit'
          ? transitParcels
          : filteredInternalParcels;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => {
      const matchBuyer = p.buyer_name?.toLowerCase().includes(q);
      const matchBuyerPhone = p.buyer_phone?.includes(q);
      const matchDest = p.destination?.toLowerCase().includes(q);
      const matchRef = p.reference_number?.toLowerCase().includes(q);
      const matchSeller = p.seller?.business_name?.toLowerCase().includes(q);
      return matchBuyer || matchBuyerPhone || matchDest || matchRef || matchSeller;
    });
  }, [isAssistant, activeTab, sortingParcels, transitParcels, filteredInternalParcels, searchQuery]);

  // Handle Dispatch submission
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel) return;
    setSubmitting(true);
    setFeedback(null);

    const options: DispatchOptions = {
      dispatchType,
      saccoName: dispatchType === 'psv_official' ? saccoName : undefined,
      driverName: dispatchType === 'psv_unofficial' ? driverName : undefined,
      driverPhone: dispatchType === 'psv_unofficial' ? driverPhone : undefined,
      vehiclePlate: dispatchType === 'psv_unofficial' ? vehiclePlate : undefined,
      pickupStation: (dispatchType === 'pickup_mtaani' || dispatchType === 'pata_parcel') ? pickupStation : undefined,
      riderName: dispatchType === 'door_to_door' ? riderName : undefined,
      riderPhone: dispatchType === 'door_to_door' ? riderPhone : undefined,
      notes: dispatchNotes.trim() || undefined,
    };

    const { error: dErr } = await dispatchParcel(selectedParcel.id, options);
    setSubmitting(false);

    if (!dErr) {
      const dispatchedP = selectedParcel;
      setSelectedParcel(null);

      // If method issues a receipt, prompt receipt upload modal
      if (dispatchType === 'psv_official' || dispatchType === 'pickup_mtaani') {
        setReceiptModalParcel(dispatchedP);
      } else if (dispatchType === 'psv_unofficial') {
        setFeedback(`Parcel ${dispatchedP.reference_number || ''} handed to driver and marked as Delivered! Driver details saved.`);
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback(`Parcel ${dispatchedP.reference_number || ''} dispatched on transit!`);
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  };

  // Share Receipt: with a receipt on file, open WhatsApp on the buyer's chat with
  // the receipt ready for staff to send; with none yet, go and scan it first.
  const receiptSentToBuyer = (parcelId: string) =>
    !!sentToBuyerIds[parcelId] || !!receiptsByParcel[parcelId]?.shared_with_buyer_at;

  const handleShareReceipt = async (parcel: any) => {
    const receipt = receiptsByParcel[parcel.id];
    if (!receipt) {
      navigate({ to: '/pap/receipts', search: { code: parcel.reference_number || '' } });
      return;
    }
    const result = await openReceiptInWhatsApp({
      receiptImageUrl: receipt.receipt_image_url,
      referenceNumber: parcel.reference_number || '',
      buyerName: parcel.buyer_name,
      buyerPhone: parcel.buyer_phone,
      destination: parcel.destination,
      saco: parcel.psv_sacco ?? null,
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    // Remembered on this device only: recording it in the database would also
    // mark the parcel delivered, which staff confirm separately.
    setSentToBuyerIds(prev => {
      const next = { ...prev, [parcel.id]: true };
      try {
        window.localStorage.setItem(SENT_TO_BUYER_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the button still updates for this visit.
      }
      return next;
    });
  };

  // Handle immediate receipt upload
  const handleUploadReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModalParcel || !receiptFile) return;

    setUploadingReceipt(true);
    const { error: uErr } = await uploadReceipt(receiptModalParcel.id, receiptFile);
    setUploadingReceipt(false);

    if (!uErr) {
      const { data: prof } = await supabase.from('profiles').select('owner_name, business_name').eq('id', receiptModalParcel.seller_id).maybeSingle();
      const msg = `Receipt shared successfully with ${prof?.owner_name || prof?.business_name || 'the seller'}`;
      toast.success(msg, { description: receiptModalParcel.reference_number });
      setFeedback(msg);
      setReceiptModalParcel(null);
      setReceiptFile(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Handle Mark as Delivered
  const handleMarkDelivered = async (parcelId: string, refNum?: string) => {
    setSubmitting(true);
    setDeliveryError(null);
    // Hide the button the moment it is pressed, before the list refreshes
    setDeliveredIds(prev => ({ ...prev, [parcelId]: true }));

    const { error: delErr } = await deliverParcel(parcelId);
    setSubmitting(false);

    if (delErr) {
      // Save failed — bring the button back and say why
      setDeliveredIds(prev => {
        const next = { ...prev };
        delete next[parcelId];
        return next;
      });
      setDeliveryError(`Could not mark ${refNum || 'parcel'} as delivered. Please try again.`);
      setTimeout(() => setDeliveryError(null), 5000);
      return;
    }

    setFeedback(`Parcel ${refNum || ''} marked as Delivered!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Handle Reverse Pick-up
  const handleReversePickup = async (parcelId: string, refNum?: string) => {
    setSubmitting(true);
    setDeliveryError(null);
    setDeliveredIds(prev => {
      const next = { ...prev };
      delete next[parcelId];
      return next;
    });

    const { error: revErr } = await reversePickup(parcelId);
    setSubmitting(false);

    if (revErr) {
      setDeliveryError(`Could not reverse pick-up for ${refNum || 'parcel'}. Please try again.`);
      setTimeout(() => setDeliveryError(null), 5000);
      return;
    }

    setFeedback(`Pick-up for ${refNum || 'parcel'} reversed — returned to pending.`);
    toast.success(`Pick-up reversed for ${refNum || 'parcel'}`);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Handle Reverse All Completed
  const handleReverseAllCompleted = async () => {
    const completedParcels = internalParcels.filter(p => deliveredIds[p.id] || p.tracking_status === 'delivered');
    if (completedParcels.length === 0) return;
    setSubmitting(true);
    setDeliveryError(null);
    setDeliveredIds({});

    const { error: revErr } = await batchReversePickup(completedParcels.map(p => p.id));
    setSubmitting(false);

    if (revErr) {
      setDeliveryError('Could not reverse completed pick-ups. Please try again.');
      setTimeout(() => setDeliveryError(null), 5000);
      return;
    }

    setFeedback(`All ${completedParcels.length} completed pick-up(s) reversed back to pending.`);
    toast.success(`Reversed ${completedParcels.length} pick-up(s) back to pending`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <AppShell role={profile?.role ?? 'pap_staff'}>
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <span>{isAssistant ? 'PAP Internal Pick-up Hub' : 'PAP Dispatch & Sorting Hub'}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAssistant
                ? 'Manage customer pick-ups and collections at the Pata Parcel hub'
                : 'Dispatch parcels to PSV, Pick-up Mtaani, Door-to-Door, or PAP points'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAssistant ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsNewDialogOpen(true)}
                className="h-10 shrink-0 px-3 font-bold bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5"
                title="Create New Parcel"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create New Parcel</span>
                <span className="sm:hidden">New</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="h-10 shrink-0 px-3 font-semibold text-xs flex items-center gap-1.5"
                  title="Print offline sorting manifest table"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </Button>

                <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
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
                        toast.success('New dispatch created successfully');
                      }}
                      onCancel={() => setIsNewDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}

            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh list"
              onClick={refetch}
              disabled={loading}
              className="h-10 w-10 shrink-0"
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">
            {feedback}
          </div>
        )}

        {/* Delivery save failed */}
        {deliveryError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300 font-semibold">
            {deliveryError}
          </div>
        )}

        {/* Tab Switcher — hidden for assistant staff (they only see Internal Pick-up) */}
        {!isAssistant && (
          <div className="grid grid-cols-3 rounded-xl bg-muted p-1 border border-border/60">
            <button
              onClick={() => setActiveTab('sorting')}
              className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'sorting'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Ready to Dispatch ({sortingParcels.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('transit')}
              className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'transit'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Active Transit ({transitParcels.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('internal')}
              className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'internal'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Internal Pick-up ({internalParcels.length})</span>
            </button>
          </div>
        )}

        {/* Search Input & View Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Buyer, Town, Ref #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 shrink-0 h-10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSetViewMode('card')}
              className={`h-8 px-2.5 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'card'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
              title="Card view"
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSetViewMode('table')}
              className={`h-8 px-2.5 text-xs rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
          </div>
        </div>

        {/* Internal Pick-up Sub-filter & Actions Bar */}
        {activeTab === 'internal' && !loading && internalParcels.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border border-border/60">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInternalStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  internalStatusFilter === 'all'
                    ? 'bg-background text-primary shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({internalParcels.length})
              </button>
              <button
                type="button"
                onClick={() => setInternalStatusFilter('pending')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  internalStatusFilter === 'pending'
                    ? 'bg-background text-primary shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending Pick-up ({pendingInternalCount})
              </button>
              <button
                type="button"
                onClick={() => setInternalStatusFilter('completed')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  internalStatusFilter === 'completed'
                    ? 'bg-background text-primary shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Completed ({completedInternalCount})
              </button>
            </div>

            {completedInternalCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReverseAllCompleted}
                disabled={submitting}
                className="h-8 text-xs font-bold border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40 flex items-center gap-1.5"
                title="Reverse all completed pick-ups back to pending"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reverse All Completed ({completedInternalCount})</span>
              </Button>
            )}
          </div>
        )}

        {/* List of Parcels */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
            {activeTab === 'sorting' ? (
              <>
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
                <h2 className="font-semibold text-foreground text-sm">No parcels in Sorting</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Receive parcels from the Incoming Queue first to start sorting.
                </p>
              </>
            ) : activeTab === 'transit' ? (
              <>
                <Truck className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
                <h2 className="font-semibold text-foreground text-sm">No parcels on transit</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Parcels dispatched to SACCOs or couriers will appear here until delivered.
                </p>
              </>
            ) : (
              <>
                <Package className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
                <h2 className="font-semibold text-foreground text-sm">No internal pick-ups pending</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Staff-created dispatches and hub pick-ups will appear here for management.
                </p>
              </>
            )}
          </div>
        ) : activeTab === 'internal' && viewMode === 'table' ? (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="bg-muted/40 px-3 py-2 border-b border-border flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span>Internal Pick-up — {displayList.length} parcel{displayList.length === 1 ? '' : 's'}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/20 border-b border-border text-muted-foreground">
                    <th className="text-left px-3 py-2 font-semibold">Ref #</th>
                    <th className="text-left px-3 py-2 font-semibold">Buyer</th>
                    <th className="text-left px-3 py-2 font-semibold">Date Created</th>
                    <th className="text-left px-3 py-2 font-semibold">Stay</th>
                    <th className="text-left px-3 py-2 font-semibold">Total Due</th>
                    <th className="text-right px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayList.map((parcel) => {
                    const { stayLabel, totalDue, days } = getStayInfo(parcel.created_at);
                    const dateCreated = new Date(parcel.created_at).toLocaleString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isDelivered = deliveredIds[parcel.id] || parcel.tracking_status === 'delivered';
                    return (
                      <tr key={parcel.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-primary text-[11px]">
                            {parcel.reference_number || 'PAP-PENDING'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-foreground truncate max-w-[140px]">{parcel.buyer_name}</p>
                          <p className="text-muted-foreground text-[10px]">{formatPhoneDisplay(parcel.buyer_phone)}</p>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{dateCreated}</td>
                        <td className="px-3 py-2.5">
                          <Badge className={`font-semibold text-[10px] ${days >= 3 ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                            {stayLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold text-sm ${days >= 3 ? 'text-red-600' : 'text-primary'}`}>
                            KES {totalDue}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <AdminParcelControls parcel={parcel} onChanged={refetch} />
                            {!isDelivered ? (
                              <Button
                                size="sm"
                                onClick={() => handleMarkDelivered(parcel.id, parcel.reference_number)}
                                disabled={submitting}
                                className="h-7 text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer px-2"
                                title="Customer picked up parcel"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete Pick-up
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Picked Up
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReversePickup(parcel.id, parcel.reference_number)}
                                  disabled={submitting}
                                  className="h-7 text-[11px] font-bold border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40 cursor-pointer px-2 flex items-center gap-1"
                                  title="Reverse completed pick-up action"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reverse Pick-up
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <PapDispatchTable
            parcels={displayList}
            activeTab={activeTab}
            receiptSentToBuyer={receiptSentToBuyer}
            onShareReceipt={handleShareReceipt}
            deliveredIds={deliveredIds}
            submitting={submitting}
            onDispatchClick={(parcel) => {
              setSelectedParcel(parcel);
              if (parcel.sending_method === 'psv') setDispatchType('psv_official');
              else if (parcel.sending_method === 'psv_driver') setDispatchType('psv_unofficial');
              else if (parcel.sending_method === 'pickup_mtaani') setDispatchType('pickup_mtaani');
              else if (parcel.sending_method === 'door_to_door') setDispatchType('door_to_door');
              else setDispatchType('pata_parcel');
            }}
            onMarkDelivered={handleMarkDelivered}
            onRefetch={refetch}
          />
        ) : (
          <div className="space-y-3">
            {displayList.map((parcel) => {
              const stayInfo = activeTab === 'internal' ? getStayInfo(parcel.created_at) : null;
              const isDelivered = deliveredIds[parcel.id] || parcel.tracking_status === 'delivered';
              return (
              <Card key={parcel.id} className="p-4 border border-border/80 bg-card space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">
                    {parcel.reference_number || 'PAP-PARCEL'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {stayInfo && (
                      <Badge className={`font-semibold text-[10px] ${stayInfo.days >= 3 ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                        Stay: {stayInfo.stayLabel}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize font-semibold">
                      {parcel.sending_method.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

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
                    {stayInfo ? (
                      <p className={`text-[11px] font-bold ${stayInfo.days >= 3 ? 'text-red-600' : 'text-primary'}`}>
                        Total Due: KES {stayInfo.totalDue}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Seller: {parcel.seller?.business_name || 'Online Seller'}
                      </p>
                    )}
                  </div>
                </div>

                <TrackingProgressBar status={parcel.tracking_status} compact />

                <div className="pt-1 flex flex-wrap justify-end gap-2 border-t border-border/50">
                  <AdminParcelControls parcel={parcel} onChanged={refetch} />
                  {activeTab === 'internal' ? (
                    <>
                      <a
                        href={`https://wa.me/${(() => { const c = parcel.buyer_phone.replace(/\D/g, ''); return c.startsWith('0') ? `254${c.slice(1)}` : c.startsWith('254') ? c : `254${c}`; })()}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat with buyer on WhatsApp"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 font-bold text-xs flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      </a>
                      {!isDelivered ? (
                        <Button
                          size="sm"
                          onClick={() => handleMarkDelivered(parcel.id, parcel.reference_number)}
                          disabled={submitting}
                          className="h-8 font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Complete Pick-up
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Picked Up
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReversePickup(parcel.id, parcel.reference_number)}
                            disabled={submitting}
                            className="h-8 font-bold text-xs border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/40 flex items-center gap-1.5"
                            title="Reverse completed pick-up action"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reverse Pick-up
                          </Button>
                        </div>
                      )}
                    </>
                  ) : activeTab === 'sorting' ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedParcel(parcel);
                        if (parcel.sending_method === 'psv') setDispatchType('psv_official');
                        else if (parcel.sending_method === 'psv_driver') setDispatchType('psv_unofficial');
                        else if (parcel.sending_method === 'pickup_mtaani') setDispatchType('pickup_mtaani');
                        else if (parcel.sending_method === 'door_to_door') setDispatchType('door_to_door');
                        else setDispatchType('pata_parcel');
                      }}
                      className="h-8 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Dispatch Parcel
                    </Button>
                  ) : (
                    <>
                      <a
                        href={`https://wa.me/${(() => { const c = parcel.buyer_phone.replace(/\D/g, ''); return c.startsWith('0') ? `254${c.slice(1)}` : c.startsWith('254') ? c : `254${c}`; })()}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat with buyer on WhatsApp"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 font-bold text-xs flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                      </a>
                      {parcel.sending_method === 'psv' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareReceipt(parcel)}
                          className={`h-8 font-bold text-xs flex items-center gap-1.5 ${
                            receiptSentToBuyer(parcel.id)
                              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300'
                              : 'border-primary/40 text-primary hover:bg-primary/5'
                          }`}
                        >
                          {receiptSentToBuyer(parcel.id) ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Receipt Shared
                            </>
                          ) : (
                            <>
                              <FileText className="h-3.5 w-3.5" />
                              Share Receipt
                            </>
                          )}
                        </Button>
                      )}
                      {!deliveredIds[parcel.id] && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkDelivered(parcel.id, parcel.reference_number)}
                          disabled={submitting}
                          className="h-8 font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Confirm Delivered
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </Card>
              );
            })}
          </div>
        )}

        {/* 1. Modal: Dispatch Options Selection */}
        <Dialog open={!!selectedParcel} onOpenChange={(open) => !open && setSelectedParcel(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Dispatch {selectedParcel?.reference_number}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleConfirmDispatch} className="space-y-4 pt-2">
              <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1 border border-border/60">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buyer:</span>
                  <span className="font-semibold text-foreground">{selectedParcel?.buyer_name} ({selectedParcel?.destination})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package:</span>
                  <span className="text-foreground">{selectedParcel?.num_packages}x {selectedParcel?.package_type}</span>
                </div>
              </div>

              {/* 4 Dispatch Methods from Requirements */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Choose Dispatch Method *</Label>
                <div className="space-y-1.5">
                  {[
                    { type: 'psv_official', label: '1a. PSV Officially (Office Receipt Issued)' },
                    { type: 'psv_unofficial', label: '1b. PSV Unofficially (Driver Direct - No Receipt)' },
                    { type: 'pickup_mtaani', label: '2. Pick-up Mtaani (Slip Issued)' },
                    { type: 'door_to_door', label: '3. Door to Door (Nairobi Direct)' },
                    { type: 'pata_parcel', label: '4. PAP Pick-up Point (Town Station)' },
                  ].map((item) => (
                    <label
                      key={item.type}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        dispatchType === item.type
                          ? 'border-primary bg-primary/5 font-semibold text-primary'
                          : 'border-border bg-card text-foreground hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dispatch_type"
                        checked={dispatchType === item.type}
                        onChange={() => setDispatchType(item.type as PapDispatchType)}
                        className="text-primary"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Method Specific Fields */}
              {dispatchType === 'psv_official' && (
                <div className="space-y-1.5">
                  <Label htmlFor="psv_sacco" className="text-xs font-medium">SACCO Name *</Label>
                  <Input
                    id="psv_sacco"
                    value={saccoName}
                    onChange={(e) => setSaccoName(e.target.value)}
                    placeholder="e.g. 2NK Sacco, Guardian Angel"
                    required
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Prefilled from the SACCO the seller selected — edit only if it changed. You will be prompted to take a photo of the office receipt after dispatch.
                  </p>
                </div>
              )}

              {dispatchType === 'psv_unofficial' && (
                <div className="space-y-2 rounded-lg bg-amber-500/10 p-3 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Driver Handover Details (Saved to system & marked Delivered)
                    </p>
                  </div>
                  {savedDrivers.length > 0 && (
                    <div className="space-y-1">
                      <Label htmlFor="saved_driver_select" className="text-[11px] font-medium text-muted-foreground">
                        Select Previous Driver (or type below)
                      </Label>
                      <select
                        id="saved_driver_select"
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                        defaultValue=""
                        onChange={(e) => {
                          const chosen = savedDrivers.find(d => d.id === e.target.value);
                          if (chosen) {
                            setDriverName(chosen.driver_name);
                            setDriverPhone(chosen.driver_phone);
                            setVehiclePlate(chosen.vehicle_plate);
                            if (chosen.sacco_name) setSaccoName(chosen.sacco_name);
                          }
                        }}
                      >
                        <option value="">-- Choose saved driver --</option>
                        {savedDrivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.driver_name} · {d.vehicle_plate} ({d.driver_phone}){d.sacco_name ? ` · ${d.sacco_name}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="dr_name" className="text-xs font-medium">Driver Name *</Label>
                    <Input
                      id="dr_name"
                      placeholder="e.g. Mwangi Driver"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="dr_phone" className="text-xs font-medium">Driver Phone *</Label>
                      <Input
                        id="dr_phone"
                        placeholder="07XX XXX XXX"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        required
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dr_plate" className="text-xs font-medium">Vehicle Plate *</Label>
                      <Input
                        id="dr_plate"
                        placeholder="e.g. KDC 123X"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        required
                        className="h-8 text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(dispatchType === 'pickup_mtaani' || dispatchType === 'pata_parcel') && (
                <div className="space-y-1.5">
                  <Label htmlFor="station" className="text-xs font-medium">Pick-up Station / Agent Name *</Label>
                  <Input
                    id="station"
                    placeholder="e.g. Eldoret Main Stage / CBD Branch"
                    value={pickupStation}
                    onChange={(e) => setPickupStation(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {dispatchType === 'door_to_door' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="rider_n" className="text-xs font-medium">Rider Name</Label>
                    <Input
                      id="rider_n"
                      placeholder="Rider John"
                      value={riderName}
                      onChange={(e) => setRiderName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rider_p" className="text-xs font-medium">Rider Phone</Label>
                    <Input
                      id="rider_p"
                      placeholder="07XX XXX XXX"
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="d_notes" className="text-xs font-medium">Additional Dispatch Notes</Label>
                <Textarea
                  id="d_notes"
                  placeholder="Optional tracking or parcel location notes"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedParcel(null)}
                  className="flex-1 text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 text-xs h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submitting ? (
                    <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Dispatching...</>
                  ) : (
                    'Confirm Dispatch'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. Modal: Prompt to Upload Receipt Photo */}
        <Dialog
          open={!!receiptModalParcel}
          onOpenChange={(open) => {
            if (!open) {
              setReceiptModalParcel(null);
              setReceiptFile(null);
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Share Receipt for {receiptModalParcel?.reference_number}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUploadReceiptSubmit} className="space-y-3.5 pt-2">
              <p className="text-xs text-muted-foreground">
                Scan the official courier or SACCO receipt to share proof of dispatch with the buyer.
              </p>

              {receiptModalExisting && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <StorageImage
                    src={receiptModalExisting.receipt_image_url}
                    alt="Receipt already shared"
                    className="h-16 w-14 shrink-0 rounded-md border border-border object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Receipt already shared
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(receiptModalExisting.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}

              <ReceiptScanner file={receiptFile} onChange={(f) => setReceiptFile(f)} />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReceiptModalParcel(null)}
                  className="flex-1 text-xs h-9"
                >
                  Skip for Now
                </Button>
                <Button
                  type="submit"
                  disabled={uploadingReceipt || !receiptFile}
                  className="flex-1 text-xs h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {uploadingReceipt ? (
                    <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Uploading...</>
                  ) : receiptModalExisting ? (
                    'Share Another Receipt'
                  ) : (
                    'Upload & Share'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Offline Sorting & Print Manifest Modal */}
        <DispatchPrintModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          parcels={parcels}
          businessName={profile?.business_name || profile?.owner_name || 'Pata Parcel Sorting Hub'}
        />
      </div>
    </AppShell>
  );
}
