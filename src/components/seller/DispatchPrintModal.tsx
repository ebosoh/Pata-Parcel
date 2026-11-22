import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Printer, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import type { Parcel } from '@/types/database';
import { SACCO_NAMES } from '@/lib/constants';

interface DispatchPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcels: Parcel[];
  businessName?: string | null;
}

type PaymentFilter = 'all' | 'paid' | 'pay_on_delivery' | 'unpaid';
type SortField = 'sacco' | 'date' | 'payment' | 'destination' | 'buyer';

export function DispatchPrintModal({
  open,
  onOpenChange,
  parcels,
  businessName,
}: DispatchPrintModalProps) {
  // Filter controls
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSacco, setSelectedSacco] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('sacco');

  // Distinct saccos from actual parcels list + known sacco list
  const availableSaccos = useMemo(() => {
    const fromParcels = parcels
      .map((p) => p.psv_sacco?.trim())
      .filter((s): s is string => Boolean(s));
    const combined = Array.from(new Set([...fromParcels, ...SACCO_NAMES]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [parcels]);

  // Normalized payment status helper
  const getParcelPaymentCategory = (p: Parcel): 'paid' | 'pay_on_delivery' | 'unpaid' => {
    if (p.payment_status === 'paid' && p.goods_paid === true) {
      return 'paid';
    }
    if (p.payment_status === 'pay_on_delivery' || p.sending_method === 'psv_driver') {
      return 'pay_on_delivery';
    }
    if (p.payment_status === 'paid' && !p.goods_paid) {
      return 'unpaid';
    }
    return (p.payment_status as any) || 'unpaid';
  };

  const getPaymentLabel = (p: Parcel) => {
    const cat = getParcelPaymentCategory(p);
    switch (cat) {
      case 'paid':
        return 'Paid';
      case 'pay_on_delivery':
        return 'On Delivery';
      case 'unpaid':
        return 'Unpaid';
      default:
        return 'Unpaid';
    }
  };

  // Filter & Sort parcels for dispatch printout
  const printableParcels = useMemo(() => {
    let list = parcels.filter((p) => {
      // Date filter
      if (selectedDate) {
        const itemDate = p.created_at.slice(0, 10);
        if (itemDate !== selectedDate) return false;
      }

      // SACCO filter
      if (selectedSacco !== 'all') {
        const saccoName = p.psv_sacco?.trim().toLowerCase();
        if (saccoName !== selectedSacco.toLowerCase()) return false;
      }

      // Payment filter: paid, on delivery, unpaid
      if (selectedPayment !== 'all') {
        const cat = getParcelPaymentCategory(p);
        if (cat !== selectedPayment) return false;
      }

      return true;
    });

    // Sorting: SACCO then payment status then date
    return list.sort((a, b) => {
      if (sortBy === 'sacco') {
        const sA = (a.psv_sacco || a.sending_method || 'ZZZ').toLowerCase();
        const sB = (b.psv_sacco || b.sending_method || 'ZZZ').toLowerCase();
        const cmpSacco = sA.localeCompare(sB);
        if (cmpSacco !== 0) return cmpSacco;

        // Subsort by payment: Paid -> On Delivery -> Unpaid
        const rank = { paid: 1, pay_on_delivery: 2, unpaid: 3 };
        const rA = rank[getParcelPaymentCategory(a)] || 4;
        const rB = rank[getParcelPaymentCategory(b)] || 4;
        if (rA !== rB) return rA - rB;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      if (sortBy === 'payment') {
        const rank = { paid: 1, pay_on_delivery: 2, unpaid: 3 };
        const rA = rank[getParcelPaymentCategory(a)] || 4;
        const rB = rank[getParcelPaymentCategory(b)] || 4;
        if (rA !== rB) return rA - rB;
        return (a.psv_sacco || '').localeCompare(b.psv_sacco || '');
      }

      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      if (sortBy === 'destination') {
        return a.destination.localeCompare(b.destination);
      }

      if (sortBy === 'buyer') {
        return a.buyer_name.localeCompare(b.buyer_name);
      }

      return 0;
    });
  }, [parcels, selectedDate, selectedSacco, selectedPayment, sortBy]);

  const handlePrint = () => {
    window.print();
  };

  const resetFilters = () => {
    setSelectedDate('');
    setSelectedSacco('all');
    setSelectedPayment('all');
    setSortBy('sacco');
  };

  const totalSendingFees = printableParcels.reduce((s, p) => s + Number(p.total_sending_fee || 0), 0);
  const totalGoodsValue = printableParcels.reduce((s, p) => s + Number(p.goods_amount || 0), 0);

  return (
    <>
      {/* ── Dialog visible on screen for filters & preview ─────────────────── */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Printer className="h-5 w-5 text-primary" />
              Dispatch Manifest &amp; Offline Sorting Sheet
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Filter by date, SACCO, and payment status to print an offline sorting manifest table for dispatch to Pata Parcel.
            </DialogDescription>
          </DialogHeader>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-muted/40 p-3.5 rounded-xl border border-border/70 text-xs">
            {/* Date filter */}
            <div className="space-y-1">
              <Label htmlFor="manifest_date" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Date:
              </Label>
              <Input
                id="manifest_date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* SACCO Filter */}
            <div className="space-y-1">
              <Label htmlFor="manifest_sacco" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Filter className="h-3.5 w-3.5 text-primary" /> SACCO:
              </Label>
              <select
                id="manifest_sacco"
                value={selectedSacco}
                onChange={(e) => setSelectedSacco(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All SACCOs / Methods</option>
                {availableSaccos.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="space-y-1">
              <Label htmlFor="manifest_payment" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Filter className="h-3.5 w-3.5 text-primary" /> Payment Status:
              </Label>
              <select
                id="manifest_payment"
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value as PaymentFilter)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="pay_on_delivery">On Delivery</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            {/* Sort order */}
            <div className="space-y-1">
              <Label htmlFor="manifest_sort" className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" /> Sort Order:
              </Label>
              <select
                id="manifest_sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="sacco">SACCO &rarr; Payment &rarr; Date</option>
                <option value="payment">Payment Status &rarr; SACCO</option>
                <option value="date">Date (Newest first)</option>
                <option value="destination">Destination Town</option>
                <option value="buyer">Buyer Name</option>
              </select>
            </div>
          </div>

          {/* Quick stats counter */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1">
            <div>
              Showing <strong className="text-foreground">{printableParcels.length}</strong> of{' '}
              {parcels.length} total parcels
              {selectedDate && ` for ${selectedDate}`}
              {selectedSacco !== 'all' && ` · SACCO: ${selectedSacco}`}
              {selectedPayment !== 'all' && ` · Status: ${selectedPayment.replace(/_/g, ' ')}`}
            </div>
            {(selectedDate || selectedSacco !== 'all' || selectedPayment !== 'all') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-2 w-8">#</th>
                  <th className="p-2">Tracking / Ref</th>
                  <th className="p-2">Buyer</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Destination</th>
                  <th className="p-2">SACCO / Method</th>
                  <th className="p-2">Package</th>
                  <th className="p-2">Payment</th>
                  <th className="p-2 text-right">Fee (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {printableParcels.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      No parcels match the selected filters.
                    </td>
                  </tr>
                ) : (
                  printableParcels.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground font-mono">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold">{p.reference_number || 'PENDING'}</td>
                      <td className="p-2 font-medium">{p.buyer_name}</td>
                      <td className="p-2 font-mono text-[11px]">{p.buyer_phone}</td>
                      <td className="p-2">{p.destination}</td>
                      <td className="p-2">
                        {p.psv_sacco ? (
                          <span className="font-semibold text-primary">{p.psv_sacco}</span>
                        ) : (
                          p.sending_method.replace(/_/g, ' ')
                        )}
                      </td>
                      <td className="p-2 truncate max-w-[120px]">{p.package_type}</td>
                      <td className="p-2 font-semibold">
                        {getPaymentLabel(p)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {p.sending_method === 'psv_driver'
                          ? 'On Delivery'
                          : Number(p.total_sending_fee || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground text-center sm:text-left">
              Plain black-and-white table format optimized for printing &amp; Save as PDF.
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button size="sm" onClick={handlePrint} disabled={printableParcels.length === 0} className="font-bold gap-1.5">
                <Printer className="h-4 w-4" />
                Print / Save as PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Print-only plain table layout (No graphics, no styling decorations) ── */}
      <div className="hidden print:block font-sans text-black bg-white w-full">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            }
            .print-clean-table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 10pt !important;
            }
            .print-clean-table th, .print-clean-table td {
              border: 1px solid #000000 !important;
              padding: 5px 6px !important;
              text-align: left !important;
              color: black !important;
              background: transparent !important;
            }
            .print-clean-table th {
              font-weight: bold !important;
              background-color: #f0f0f0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .text-right {
              text-align: right !important;
            }
            .text-center {
              text-align: center !important;
            }
          }
        `}} />

        <div className="mb-4 pb-2 border-b-2 border-black">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide">
                {businessName || 'Pata Parcel Seller'} — Dispatch Manifest
              </h1>
              <p className="text-xs mt-0.5">
                Sorted for Dispatch to Pata Parcel Operations
              </p>
            </div>
            <div className="text-right text-xs">
              <p><strong>Date Printed:</strong> {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p><strong>Filter Date:</strong> {selectedDate || 'All Dates'}</p>
              <p><strong>Total Parcels:</strong> {printableParcels.length}</p>
            </div>
          </div>
          {(selectedSacco !== 'all' || selectedPayment !== 'all') && (
            <div className="text-xs mt-1">
              <strong>Active Filters:</strong>{' '}
              {selectedSacco !== 'all' && `SACCO: ${selectedSacco} | `}
              {selectedPayment !== 'all' && `Payment Status: ${selectedPayment.replace(/_/g, ' ')}`}
            </div>
          )}
        </div>

        <table className="print-clean-table">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>#</th>
              <th>Tracking No.</th>
              <th>Buyer Name</th>
              <th>Phone</th>
              <th>Destination</th>
              <th>SACCO / Method</th>
              <th>Package</th>
              <th>Payment Status</th>
              <th className="text-right">Sending Fee</th>
              <th className="text-right">Goods Total</th>
              <th style={{ width: '45px' }} className="text-center">Checked</th>
            </tr>
          </thead>
          <tbody>
            {printableParcels.map((p, index) => {
              const paymentCat = getPaymentLabel(p);
              const saccoOrMethod = p.psv_sacco || p.sending_method.replace(/_/g, ' ');
              return (
                <tr key={p.id}>
                  <td className="text-center">{index + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{p.reference_number || 'PENDING'}</td>
                  <td>{p.buyer_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{p.buyer_phone}</td>
                  <td>{p.destination}</td>
                  <td><strong>{saccoOrMethod}</strong></td>
                  <td>{p.package_type}</td>
                  <td><strong>{paymentCat}</strong></td>
                  <td className="text-right">
                    {p.sending_method === 'psv_driver'
                      ? 'On Delivery'
                      : Number(p.total_sending_fee || 0).toLocaleString()}
                  </td>
                  <td className="text-right">
                    {p.goods_amount != null ? Number(p.goods_amount).toLocaleString() : '-'}
                  </td>
                  <td className="text-center">[ &nbsp; ]</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
              <td colSpan={8} className="text-right">Total:</td>
              <td className="text-right">KES {totalSendingFees.toLocaleString()}</td>
              <td className="text-right">KES {totalGoodsValue.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 pt-4 text-xs flex justify-between border-t border-black">
          <div>
            <p>Dispatched by: ________________________</p>
            <p className="mt-1">Signature &amp; Date: ____________________</p>
          </div>
          <div>
            <p>Received at Pata Parcel: ________________________</p>
            <p className="mt-1">Signature &amp; Date: ____________________</p>
          </div>
        </div>
      </div>
    </>
  );
}
