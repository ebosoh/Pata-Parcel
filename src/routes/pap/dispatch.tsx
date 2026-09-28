import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { usePapOperations, type PapDispatchType, type DispatchOptions } from '@/hooks/usePapOperations';
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
  DialogTitle 
} from '@/components/ui/dialog';
import { TrackingProgressBar } from '@/components/seller/TrackingProgressBar';
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
  AlertCircle
} from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';

export const Route = createFileRoute('/pap/dispatch')({
  head: () => ({
    meta: [
      { title: 'Sorting & Dispatch — Pata Parcel Operations Hub' },
      { name: 'description', content: 'Sort parcels and hand them to PSV, Pick-up Mtaani and door-to-door couriers.' },
      { property: 'og:title', content: 'Sorting & Dispatch — Pata Parcel Operations Hub' },
      { property: 'og:description', content: 'Sort parcels and hand them to PSV, Pick-up Mtaani and door-to-door couriers.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/pap/dispatch' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/pap/dispatch' }],
  }),
  component: PapDispatchPage,
});

export function PapDispatchPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { parcels, loading, error, dispatchParcel, deliverParcel, uploadReceipt, refetch } = usePapOperations(user?.id);

  // Tabs: 'sorting' (Ready to Dispatch) vs 'transit' (On Transit)
  const [activeTab, setActiveTab] = useState<'sorting' | 'transit'>('sorting');
  const [searchQuery, setSearchQuery] = useState('');

  // Dispatch Modal state
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
  const [dispatchType, setDispatchType] = useState<PapDispatchType>('psv_official');
  const [saccoName, setSaccoName] = useState('2NK Sacco');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [pickupStation, setPickupStation] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Receipt Modal state (after dispatch)
  const [receiptModalParcel, setReceiptModalParcel] = useState<any | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Sorting parcels (Ready to Dispatch)
  const sortingParcels = useMemo(() => {
    return parcels.filter(p => p.tracking_status === 'sorting');
  }, [parcels]);

  // On Transit parcels
  const transitParcels = useMemo(() => {
    return parcels.filter(p => p.tracking_status === 'on_transit');
  }, [parcels]);

  const displayList = useMemo(() => {
    const list = activeTab === 'sorting' ? sortingParcels : transitParcels;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => {
      const matchBuyer = p.buyer_name?.toLowerCase().includes(q);
      const matchDest = p.destination?.toLowerCase().includes(q);
      const matchRef = p.reference_number?.toLowerCase().includes(q);
      const matchSeller = p.seller?.business_name?.toLowerCase().includes(q);
      return matchBuyer || matchDest || matchRef || matchSeller;
    });
  }, [activeTab, sortingParcels, transitParcels, searchQuery]);

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
      } else {
        setFeedback(`Parcel ${dispatchedP.reference_number || ''} dispatched on transit!`);
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  };

  // Handle immediate receipt upload
  const handleUploadReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModalParcel || !receiptFile) return;

    setUploadingReceipt(true);
    const { error: uErr } = await uploadReceipt(receiptModalParcel.id, receiptFile);
    setUploadingReceipt(false);

    if (!uErr) {
      setFeedback(`Receipt uploaded & shared with online seller!`);
      setReceiptModalParcel(null);
      setReceiptFile(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Handle Mark as Delivered
  const handleMarkDelivered = async (parcelId: string, refNum: string) => {
    setSubmitting(true);
    const { error: delErr } = await deliverParcel(parcelId);
    setSubmitting(false);
    if (!delErr) {
      setFeedback(`Parcel ${refNum} marked as Delivered!`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <AppShell role="pap_staff">
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              PAP Dispatch & Sorting Hub
            </h1>
            <p className="text-xs text-muted-foreground">
              Dispatch parcels to PSV, Pick-up Mtaani, Door-to-Door, or PAP points
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh list"
            onClick={refetch}
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">
            {feedback}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 rounded-xl bg-muted p-1 border border-border/60">
          <button
            onClick={() => setActiveTab('sorting')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'sorting'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Ready to Dispatch ({sortingParcels.length})
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'transit'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            Active Transit ({transitParcels.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Buyer, Town, Ref #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

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
            ) : (
              <>
                <Truck className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
                <h2 className="font-semibold text-foreground text-sm">No parcels on transit</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Parcels dispatched to SACCOs or couriers will appear here until delivered.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayList.map((parcel) => (
              <Card key={parcel.id} className="p-4 border border-border/80 bg-card space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">
                    {parcel.reference_number || 'PAP-PARCEL'}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize font-semibold">
                    {parcel.sending_method.replace(/_/g, ' ')}
                  </Badge>
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
                    <p className="text-[11px] text-muted-foreground">
                      Seller: {parcel.seller?.business_name || 'Online Seller'}
                    </p>
                  </div>
                </div>

                <TrackingProgressBar status={parcel.tracking_status} compact />

                <div className="pt-1 flex justify-end gap-2 border-t border-border/50">
                  {activeTab === 'sorting' ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedParcel(parcel);
                        if (parcel.sending_method === 'psv') setDispatchType('psv_official');
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
                </div>
              </Card>
            ))}
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
                    You will be prompted to take a photo of the office receipt after dispatch.
                  </p>
                </div>
              )}

              {dispatchType === 'psv_unofficial' && (
                <div className="space-y-2 rounded-lg bg-amber-500/10 p-3 border border-amber-500/30">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Driver Handover Details (No receipt issued)
                  </p>
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
        <Dialog open={!!receiptModalParcel} onOpenChange={(open) => !open && setReceiptModalParcel(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-primary flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Upload Receipt for {receiptModalParcel?.reference_number}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUploadReceiptSubmit} className="space-y-3.5 pt-2">
              <p className="text-xs text-muted-foreground">
                Photograph the official courier or SACCO receipt so the online seller can verify proof of dispatch.
              </p>

              <div className="space-y-2">
                <Label htmlFor="modal-rcpt-file" className="block cursor-pointer">
                  <div className="border-2 border-dashed border-primary/40 rounded-xl p-4 text-center hover:bg-primary/5 transition-colors">
                    <Camera className="h-8 w-8 mx-auto text-primary mb-2" />
                    <span className="text-xs font-semibold text-primary block">
                      {receiptFile ? receiptFile.name : 'Take Photo or Choose File'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">JPG, PNG supported</span>
                  </div>
                </Label>
                <input
                  id="modal-rcpt-file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  required
                  className="hidden"
                />
              </div>

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
                  ) : (
                    'Upload & Share'
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
