import { StorageImage } from '@/components/shared/StorageImage';
import { ReceiptScanner } from '@/components/shared/ReceiptScanner';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { usePapOperations } from '@/hooks/usePapOperations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Camera, 
  Upload, 
  Search, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { ParcelReceipt } from '@/types/database';

export const Route = createFileRoute('/pap/receipts')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search['code'] === 'string' && search['code'].trim() ? search['code'].trim() : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Courier Receipts — Pata Parcel Operations Hub' },
      { name: 'description', content: 'Upload courier slip photos so sellers get instant proof of dispatch.' },
      { property: 'og:title', content: 'Courier Receipts — Pata Parcel Operations Hub' },
      { property: 'og:description', content: 'Upload courier slip photos so sellers get instant proof of dispatch.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/pap/receipts' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/pap/receipts' }],
  }),
  component: PapReceiptsPage,
});

interface StaffReceiptWithParcel extends ParcelReceipt {
  parcel?: {
    reference_number: string;
    buyer_name: string;
    destination: string;
    sending_method: string;
  } | null;
}

function PapReceiptsPage() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { code } = Route.useSearch();

  const { parcels, loading: parcelsLoading, uploadReceipt } = usePapOperations(user?.id);

  // Upload Form State — tracking code prefilled when arriving from a parcel
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [parcelSearch, setParcelSearch] = useState(code ?? '');
  const appliedCodeRef = useRef<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewLocalUrl, setPreviewLocalUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Receipts Feed
  const [recentReceipts, setRecentReceipts] = useState<StaffReceiptWithParcel[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Auto-select the parcel whose tracking code arrived in the link
  useEffect(() => {
    if (!code || appliedCodeRef.current === code) return;
    const match = parcels.find(
      p => p.sending_method === 'psv' && p.reference_number?.toLowerCase() === code.toLowerCase(),
    );
    if (match) {
      setSelectedParcelId(match.id);
      setParcelSearch(match.reference_number || code);
      appliedCodeRef.current = code;
    }
  }, [code, parcels]);

  const selectedParcel = useMemo(
    () => parcels.find(p => p.id === selectedParcelId) || null,
    [parcels, selectedParcelId],
  );

  // Handle local image preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const url = URL.createObjectURL(file);
      setPreviewLocalUrl(url);
    }
  };

  // Filter parcels for dropdown selector
  const selectableParcels = useMemo(() => {
    const psv = parcels.filter(p => p.sending_method === 'psv');
    if (!parcelSearch.trim()) return psv.slice(0, 30);
    const q = parcelSearch.trim().toLowerCase();
    const exact = psv.filter(p => p.reference_number?.toLowerCase() === q);
    if (exact.length) return exact;
    return psv.filter(p => 
      p.reference_number?.toLowerCase().includes(q) ||
      p.buyer_name?.toLowerCase().includes(q) ||
      p.destination?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [parcels, parcelSearch]);

  // Fetch all recent uploaded receipts
  const fetchRecentReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const { data, error } = await supabase
        .from('parcel_receipts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40);

      if (!error && data) {
        const parcelIds = Array.from(new Set(data.map(r => r.parcel_id)));
        let parcelMap = new Map();

        if (parcelIds.length > 0) {
          const { data: pData } = await supabase
            .from('parcels')
            .select('id, reference_number, buyer_name, destination, sending_method')
            .in('id', parcelIds);

          if (pData) {
            pData.forEach(p => parcelMap.set(p.id, p));
          }
        }

        const combined = data.map(r => ({
          ...r,
          parcel: parcelMap.get(r.parcel_id) || null,
        }));

        setRecentReceipts(combined);
      }
    } catch (err) {
      console.error('Failed to load recent receipts:', err);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    fetchRecentReceipts();
  }, []);

  // Submit Receipt Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    let targetId = selectedParcelId;
    if (!targetId && selectableParcels.length === 1 && parcelSearch.trim()) targetId = selectableParcels[0]!.id;
    if (!targetId) {
      setErrorMsg('Enter the parcel tracking code (e.g. HudsonEboso-012548)');
      return;
    }
    const target = parcels.find(p => p.id === targetId);
    if (target && target.sending_method !== 'psv') {
      setErrorMsg('Receipts are only for PSV (SACCO) parcels');
      return;
    }

    if (!receiptFile) {
      setErrorMsg('Please choose or take a receipt photo');
      return;
    }

    setUploading(true);
    const { error: uErr } = await uploadReceipt(targetId, receiptFile);
    setUploading(false);

    if (uErr) {
      setErrorMsg(uErr.message || 'Failed to upload receipt');
    } else {
      let sellerName = 'the seller';
      if (target?.seller_id) {
        const { data: prof } = await supabase.from('profiles').select('owner_name, business_name').eq('id', target.seller_id).maybeSingle();
        sellerName = prof?.owner_name || prof?.business_name || sellerName;
      }
      const msg = `Receipt shared successfully with ${sellerName}`;
      toast.success(msg, { description: target?.reference_number });
      setSuccessMsg(msg);
      setParcelSearch('');
      setSelectedParcelId('');
      setReceiptFile(null);
      setPreviewLocalUrl(null);
      appliedCodeRef.current = null;
      navigate({ to: '/pap/receipts', search: { code: undefined }, replace: true });
      await fetchRecentReceipts();
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <AppShell role="pap_staff">
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Upload & Manage Receipts
            </h1>
            <p className="text-xs text-muted-foreground">
              Photographs of courier and SACCO receipts sent directly to online sellers
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh list"
            onClick={fetchRecentReceipts}
            disabled={loadingReceipts}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loadingReceipts ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Upload Card */}
        <Card className="p-4 border border-border/80 bg-card space-y-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Upload className="h-4 w-4" />
            New Receipt Upload
          </h2>

          <form onSubmit={handleUploadSubmit} className="space-y-3.5">
            {/* Parcel Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Parcel Tracking Code * (PSV / SACCO only)</Label>
              <Input
                placeholder="e.g. HudsonEboso-012548"
                value={parcelSearch}
                onChange={(e) => {
                  const v = e.target.value; setParcelSearch(v);
                  const m = parcels.find(p => p.sending_method === 'psv' && p.reference_number?.toLowerCase() === v.trim().toLowerCase());
                  setSelectedParcelId(m ? m.id : '');
                }}
                className="h-9 text-xs mb-1"
              />
              <select
                value={selectedParcelId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedParcelId(id);
                  const chosen = parcels.find(p => p.id === id);
                  if (chosen?.reference_number) setParcelSearch(chosen.reference_number);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Or choose PSV parcel ({selectableParcels.length} available) --</option>
                {selectableParcels.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.reference_number || 'PAP-PARCEL'} - {p.buyer_name} ({p.destination}) - [{p.tracking_status}]
                  </option>
                ))}
              </select>
              {selectedParcel && (
                <p className="text-[11px] text-muted-foreground">
                  Receipt goes to <span className="font-semibold text-foreground">{selectedParcel.buyer_name}</span>
                  {' '}· {selectedParcel.destination} · Seller{' '}
                  <span className="font-semibold text-foreground">
                    {selectedParcel.seller?.business_name || selectedParcel.seller?.owner_name || 'Online Seller'}
                  </span>
                </p>
              )}
              {!selectedParcel && code && !parcelsLoading && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  No PSV parcel matches "{code}". Pick the parcel from the list above.
                </p>
              )}
            </div>

            {/* Photo Capture / Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Receipt Scan *</Label>
              <ReceiptScanner file={receiptFile} onChange={(f, url) => { setReceiptFile(f); setPreviewLocalUrl(url); }} />
            </div>

            <Button
              type="submit"
              disabled={uploading || !selectedParcelId || !receiptFile}
              className="w-full h-10 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Upload & Share with Seller</>
              )}
            </Button>
          </form>
        </Card>

        {/* 2. Recent Uploads Feed */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" />
            Recent Uploaded Receipts ({recentReceipts.length})
          </h2>

          {loadingReceipts ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : recentReceipts.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-card/40 text-xs text-muted-foreground">
              No receipts uploaded yet today.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recentReceipts.map((r) => (
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
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </div>
                  </div>

                  <div className="p-2.5 text-xs space-y-0.5">
                    <p className="font-mono font-bold text-primary truncate">
                      {r.parcel?.reference_number || 'PAP-PARCEL'}
                    </p>
                    <p className="text-[11px] text-foreground truncate">
                      To: {r.parcel?.destination} ({r.parcel?.buyer_name})
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Full Image Preview Modal */}
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
