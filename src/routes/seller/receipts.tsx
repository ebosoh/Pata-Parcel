import { StorageImage } from '@/components/shared/StorageImage';
import { ReceiptShareButton } from '@/components/shared/ReceiptShareButton';
import { DestinationCombobox } from '@/components/seller/DestinationCombobox';
import { useState, useEffect, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Calendar, ExternalLink, RefreshCw, Truck, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SENDING_METHODS, SACCO_NAMES } from '@/lib/constants';
import { matchesSaccoName } from '@/lib/receiptFilters';
import type { ParcelReceipt } from '@/types/database';

export const Route = createFileRoute('/seller/receipts')({
  head: () => ({
    meta: [
      { title: 'Dispatch Receipts — Pata Parcel Seller Portal' },
      { name: 'description', content: 'View photographed courier receipts for every parcel you have sent with Pata Parcel.' },
      { property: 'og:title', content: 'Dispatch Receipts — Pata Parcel Seller Portal' },
      { property: 'og:description', content: 'View photographed courier receipts for every parcel you have sent with Pata Parcel.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/seller/receipts' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/seller/receipts' }],
  }),
  component: SellerReceiptsPage,
});

interface ReceiptWithParcel {
  id: string;
  receipt_image_url: string;
  created_at: string;
  shared_with_buyer_at: string | null;
  parcel: {
    reference_number: string;
    buyer_name: string;
    buyer_phone: string;
    destination: string;
    sending_method: string;
    psv_sacco: string | null;
  } | null;
}

function SellerReceiptsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState<ReceiptWithParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedSacco, setSelectedSacco] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch receipts for parcels owned by this seller
  const fetchReceipts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // First get seller's parcel IDs
      const { data: parcelsData } = await supabase
        .from('parcels')
        .select('id, reference_number, buyer_name, buyer_phone, destination, sending_method, psv_sacco')
        .eq('seller_id', user.id);

      const typedParcels = (parcelsData as any[]) || [];

      if (typedParcels.length === 0) {
        setReceipts([]);
        setLoading(false);
        return;
      }

      const parcelMap = new Map(typedParcels.map(p => [p.id, p]));
      const parcelIds = typedParcels.map(p => p.id);

      let query = supabase
        .from('parcel_receipts')
        .select('*')
        .in('parcel_id', parcelIds)
        .order('created_at', { ascending: false });

      if (selectedDate) {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      }

      const { data: receiptsData, error } = await query;

      if (!error && receiptsData) {
        const typedReceipts = receiptsData as ParcelReceipt[];
        const mapped = typedReceipts.map(r => ({
          ...r,
          parcel: parcelMap.get(r.parcel_id) || null,
        }));
        setReceipts(mapped);
      }
    } catch (err) {
      console.error('Failed to load receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [user, selectedDate]);

  // Filter by sending method, then by SACCO (only when PSV (SACCO) is chosen)
  const visibleReceipts = useMemo(() => {
    let list = receipts;
    if (selectedMethod !== 'all') {
      list = list.filter(r => r.parcel?.sending_method === selectedMethod);
    }
    if (selectedMethod === 'psv' && selectedSacco.trim()) {
      list = list.filter(r => matchesSaccoName(r.parcel?.psv_sacco, selectedSacco));
    }
    return list;
  }, [receipts, selectedMethod, selectedSacco]);

  const selectedMethodLabel = selectedMethod === 'all'
    ? null
    : SENDING_METHODS.find(m => m.value === selectedMethod)?.label || selectedMethod;

  const sacoFilterActive = selectedMethod === 'psv' && selectedSacco.trim().length > 0;
  const filtersActive = Boolean(selectedDate) || selectedMethod !== 'all' || sacoFilterActive;

  const clearFilters = () => {
    setSelectedDate('');
    setSelectedMethod('all');
    setSelectedSacco('');
  };

  // Keep the card in step with a receipt the buyer has just been sent
  const markShared = (receiptId: string) => {
    setReceipts(prev =>
      prev.map(r => (r.id === receiptId ? { ...r, shared_with_buyer_at: new Date().toISOString() } : r)),
    );
  };

  return (
    <AppShell role="seller">
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dispatch Receipts</h1>
            <p className="text-xs text-muted-foreground">
              Official courier and SACCO receipts uploaded by Pata Parcel staff
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh list"
            onClick={fetchReceipts}
            disabled={loading}
            title="Refresh receipts"
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>

        {/* Filters: Date + Sending Method */}
        <div className="flex flex-wrap items-center gap-2 bg-card p-3 rounded-xl border border-border/80">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <Label htmlFor="receipt_date" className="text-xs font-medium shrink-0">
            Date:
          </Label>
          <Input
            id="receipt_date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 min-w-0 flex-1 text-xs sm:max-w-[160px]"
          />
          <Truck className="h-4 w-4 text-primary shrink-0" />
          <Label htmlFor="receipt_method" className="text-xs font-medium shrink-0">
            Method:
          </Label>
          <select
            id="receipt_method"
            value={selectedMethod}
            onChange={(e) => {
              const next = e.target.value;
              setSelectedMethod(next);
              if (next !== 'psv') setSelectedSacco('');
            }}
            className="h-8 min-w-0 flex-1 sm:max-w-[180px] rounded-md border border-input bg-background px-2 text-xs text-foreground"
          >
            <option value="all">All Methods</option>
            {SENDING_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {selectedMethod === 'psv' && (
            <div className="w-full flex flex-wrap items-center gap-2 sm:w-auto">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <Label htmlFor="receipt_sacco" className="text-xs font-medium shrink-0">
                SACCO Name:
              </Label>
              <div className="min-w-[200px] flex-1 sm:max-w-[240px]">
                <DestinationCombobox
                  id="receipt_sacco"
                  value={selectedSacco}
                  onChange={setSelectedSacco}
                  options={SACCO_NAMES}
                  listHeader="All SACCOs"
                  noun="SACCO"
                  placeholder="Type SACCO name..."
                  className="w-full"
                />
              </div>
            </div>
          )}
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Receipts List */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : visibleReceipts.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
            <h2 className="font-semibold text-foreground text-sm">
              {filtersActive
                ? `No receipts found${selectedMethodLabel ? ` for ${selectedMethodLabel}` : ''}${sacoFilterActive ? ` — SACCO "${selectedSacco.trim()}"` : ''}${selectedDate ? ' on this date' : ''}`
                : 'No receipts uploaded yet'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Once Pata Parcel staff dispatches your parcels at the courier or SACCO office, they will photograph the receipts and upload them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {visibleReceipts.map((r) => (
              <Card key={r.id} className="overflow-hidden border border-border/80 bg-card group hover:shadow-md transition-shadow">
                <div
                  className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden"
                  onClick={() => setPreviewImage(r.receipt_image_url)}
                >
                  <StorageImage
                    src={r.receipt_image_url}
                    alt="Receipt"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <ExternalLink className="h-4 w-4" /> View Full
                  </div>
                </div>

                <div className="p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-primary">
                      {r.parcel?.reference_number || 'PAP-PARCEL'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground truncate">
                    Buyer: {r.parcel?.buyer_name || 'Customer'}
                  </p>
                  <p className="text-muted-foreground truncate">
                    To: {r.parcel?.destination || 'Destination'}
                  </p>
                  {r.parcel && (
                    <div className="pt-1.5">
                      <ReceiptShareButton
                        receiptId={r.id}
                        receiptImageUrl={r.receipt_image_url}
                        sharedAt={r.shared_with_buyer_at}
                        referenceNumber={r.parcel.reference_number}
                        buyerName={r.parcel.buyer_name}
                        buyerPhone={r.parcel.buyer_phone}
                        destination={r.parcel.destination}
                        saco={r.parcel.psv_sacco}
                        onShared={markShared}
                      />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Full Image Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-card p-2" onClick={e => e.stopPropagation()}>
              <StorageImage
                src={previewImage}
                alt="Receipt Preview"
                className="max-h-[80vh] w-auto mx-auto object-contain rounded-lg"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setPreviewImage(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
