import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toStoragePath } from '@/components/shared/StorageImage';
import { getReceiptSellerName } from '@/lib/receiptFilters';
import { toast } from 'sonner';

export interface PrintableReceipt {
  id: string;
  receipt_image_url: string;
  created_at: string;
  shared_with_buyer_at?: string | null;
  parcel?: {
    reference_number?: string;
    buyer_name?: string;
    buyer_phone?: string;
    destination?: string;
    sending_method?: string;
    psv_sacco?: string | null;
    seller?: {
      business_name?: string | null;
      owner_name?: string | null;
    } | null;
  } | null;
}

interface ReceiptBulkPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: PrintableReceipt[];
}

export function ReceiptBulkPrintModal({
  open,
  onOpenChange,
  receipts,
}: ReceiptBulkPrintModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = async () => {
    if (receipts.length === 0) {
      toast.error('No receipts selected to print');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Resolve signed URLs for each receipt image
      const resolvedReceipts = await Promise.all(
        receipts.map(async (r) => {
          let imageUrl = r.receipt_image_url;
          const storagePath = toStoragePath(r.receipt_image_url);
          if (storagePath) {
            try {
              const { data } = await supabase.storage
                .from('receipts')
                .createSignedUrl(storagePath, 3600);
              if (data?.signedUrl) {
                imageUrl = data.signedUrl;
              }
            } catch (err) {
              console.warn('Could not generate signed URL for receipt:', err);
            }
          }
          return {
            ...r,
            resolvedImageUrl: imageUrl,
            sellerName: getReceiptSellerName(r),
          };
        }),
      );

      // 2. Open print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Pop-up was blocked. Please allow pop-ups for this site to print receipts.');
        setIsGenerating(false);
        return;
      }

      const printDate = new Date().toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const receiptsHtml = resolvedReceipts
        .map((r, index) => {
          const parcel = r.parcel;
          const ref = parcel?.reference_number || 'PAP-PARCEL';
          const buyer = parcel?.buyer_name || 'Customer';
          const phone = parcel?.buyer_phone || '-';
          const dest = parcel?.destination || '-';
          const method = parcel?.psv_sacco
            ? `PSV SACCO: ${parcel.psv_sacco}`
            : (parcel?.sending_method || 'Standard Courier').replace(/_/g, ' ');
          const dateStr = new Date(r.created_at).toLocaleDateString('en-KE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const shareStatus = r.shared_with_buyer_at
            ? `Shared with Buyer (${new Date(r.shared_with_buyer_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })})`
            : 'Pending Share with Buyer';

          return `
            <div class="receipt-card">
              <div class="receipt-header">
                <div class="receipt-title">
                  <span class="receipt-index">#${index + 1}</span>
                  <span class="receipt-ref">${ref}</span>
                </div>
                <div class="receipt-date">${dateStr}</div>
              </div>

              <div class="receipt-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Seller:</span>
                  <span class="meta-value">${r.sellerName}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Buyer:</span>
                  <span class="meta-value">${buyer} (${phone})</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Destination:</span>
                  <span class="meta-value">${dest}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Courier / SACCO:</span>
                  <span class="meta-value">${method}</span>
                </div>
                <div class="meta-item full-width">
                  <span class="meta-label">Status:</span>
                  <span class="meta-value">${shareStatus}</span>
                </div>
              </div>

              <div class="receipt-image-container">
                <img src="${r.resolvedImageUrl}" alt="Courier Receipt ${ref}" class="receipt-img" />
              </div>
            </div>
          `;
        })
        .join('');

      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Pata Parcel - Official Courier Receipts (${resolvedReceipts.length})</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 10mm 12mm 10mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                margin: 0;
                padding: 15px;
                color: #0f172a;
                background: #ffffff;
                font-size: 11px;
                line-height: 1.4;
              }
              .report-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 10px;
                margin-bottom: 16px;
              }
              .brand-title {
                font-size: 18px;
                font-weight: 800;
                letter-spacing: -0.5px;
                color: #0f172a;
              }
              .brand-subtitle {
                font-size: 11px;
                color: #64748b;
                margin-top: 2px;
              }
              .report-info {
                text-align: right;
                font-size: 10px;
                color: #475569;
              }
              .receipt-card {
                page-break-inside: avoid;
                break-inside: avoid;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 18px;
                background: #f8fafc;
              }
              .receipt-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px dashed #cbd5e1;
                padding-bottom: 6px;
                margin-bottom: 8px;
              }
              .receipt-title {
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .receipt-index {
                background: #0f172a;
                color: #fff;
                padding: 1px 6px;
                border-radius: 4px;
                font-weight: 700;
                font-size: 10px;
              }
              .receipt-ref {
                font-family: "Courier New", Courier, monospace;
                font-weight: 700;
                font-size: 13px;
                color: #0f172a;
              }
              .receipt-date {
                font-size: 10px;
                color: #64748b;
              }
              .receipt-meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4px 12px;
                margin-bottom: 10px;
                font-size: 11px;
              }
              .meta-item {
                display: flex;
                gap: 4px;
              }
              .meta-item.full-width {
                grid-column: span 2;
              }
              .meta-label {
                font-weight: 600;
                color: #475569;
                min-width: 65px;
              }
              .meta-value {
                color: #0f172a;
                font-weight: 500;
              }
              .receipt-image-container {
                display: flex;
                justify-content: center;
                align-items: center;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 6px;
                min-height: 200px;
                max-height: 480px;
                overflow: hidden;
              }
              .receipt-img {
                max-width: 100%;
                max-height: 460px;
                object-fit: contain;
                display: block;
                border-radius: 4px;
              }
              @media print {
                body {
                  padding: 0;
                }
                .no-print {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <div>
                <div class="brand-title">PATA PARCEL DISPATCH RECEIPTS</div>
                <div class="brand-subtitle">Official Courier & SACCO Proof of Dispatch Records</div>
              </div>
              <div class="report-info">
                <div>Printed: ${printDate}</div>
                <div>Total Receipts: <strong>${resolvedReceipts.length}</strong></div>
              </div>
            </div>

            <div class="receipts-list">
              ${receiptsHtml}
            </div>

            <script>
              // Wait for all images to fully load before triggering print
              window.onload = function() {
                var images = document.querySelectorAll('img');
                var loaded = 0;
                var total = images.length;
                if (total === 0) {
                  window.focus();
                  window.print();
                  return;
                }
                function checkReady() {
                  loaded++;
                  if (loaded >= total) {
                    setTimeout(function() {
                      window.focus();
                      window.print();
                    }, 300);
                  }
                }
                images.forEach(function(img) {
                  if (img.complete) {
                    checkReady();
                  } else {
                    img.addEventListener('load', checkReady);
                    img.addEventListener('error', checkReady);
                  }
                });
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      toast.success(`Prepared ${resolvedReceipts.length} receipt(s) for printing. Select 'Save as PDF' in the print dialog.`);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error preparing receipts for PDF print:', err);
      toast.error('Failed to prepare receipts for printing: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Bulk Print Receipts to PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-lg bg-muted/60 p-3 border border-border space-y-1.5">
            <div className="flex justify-between items-center font-medium">
              <span>Receipts ready to print:</span>
              <span className="text-sm font-bold text-primary">{receipts.length}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Each receipt is printed with the parcel reference number, date, seller, buyer details, and high-resolution photo proof.
            </p>
          </div>

          <div className="rounded-lg border border-border p-2.5 max-h-48 overflow-y-auto space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Included Parcels:
            </p>
            {receipts.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                <span className="font-mono font-medium">{r.parcel?.reference_number || 'PAP-PARCEL'}</span>
                <span className="text-muted-foreground truncate max-w-[150px]">{getReceiptSellerName(r)}</span>
                <span className="text-foreground">{r.parcel?.buyer_name || 'Buyer'}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Tip: In your browser's print dialog, choose destination <strong>Save as PDF</strong> to generate a PDF file.
            </span>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            disabled={isGenerating || receipts.length === 0}
            className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Preparing PDF...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" /> Print {receipts.length} to PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
