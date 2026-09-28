import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ParcelReceipt } from '@/types/database';

export const Route = createFileRoute('/seller/receipts')({
  component: SellerReceiptsPage,
});

interface ReceiptWithParcel {
  id: string;
  receipt_image_url: string;
  created_at: string;
  parcel: {
    reference_number: string;
    buyer_name: string;
    destination: string;
    sending_method: string;
  } | null;
}

function SellerReceiptsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState<ReceiptWithParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
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
        .select('id, reference_number, buyer_name, destination, sending_method')
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
            onClick={fetchReceipts}
            disabled={loading}
            title="Refresh receipts"
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-card p-3 rounded-xl border border-border/80">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <Label htmlFor="receipt_date" className="text-xs font-medium shrink-0">
            Filter by Date:
          </Label>
          <Input
            id="receipt_date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 text-xs max-w-[180px]"
          />
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate('')}
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
        ) : receipts.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-card/50">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="font-semibold text-foreground text-sm">
              {selectedDate ? 'No receipts found for this date' : 'No receipts uploaded yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Once Pata Parcel staff dispatches your parcels at the courier or SACCO office, they will photograph the receipts and upload them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {receipts.map((r) => (
              <Card key={r.id} className="overflow-hidden border border-border/80 bg-card group hover:shadow-md transition-shadow">
                <div
                  className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden"
                  onClick={() => setPreviewImage(r.receipt_image_url)}
                >
                  <img
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
              <img
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
