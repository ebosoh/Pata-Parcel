import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { TrackingProgressBar } from './TrackingProgressBar';
import { PLATFORM_FEE_RATE } from '@/lib/constants';
import { 
  Package, 
  MapPin, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  Truck, 
  Calendar,
  ShieldCheck
} from 'lucide-react';
import type { Parcel, SendingMethod } from '@/types/database';
import { formatPhoneDisplay } from '@/lib/constants';

interface ParcelCardProps {
  parcel: Parcel;
  /** Called after the seller changes a payment status or dispatches. */
  onChanged?: () => void;
}

function getMethodLabel(method: SendingMethod, sacco?: string | null): string {
  switch (method) {
    case 'pickup_mtaani':
      return 'Pick-up Mtaani';
    case 'pata_parcel':
      return 'Pata Parcel (PAP Points)';
    case 'door_to_door':
      return 'Door to Door (Nairobi)';
    case 'psv':
      return sacco ? `PSV (${sacco})` : 'PSV (SACCO)';
    case 'psv_driver':
      return sacco ? `PSV-Driver (${sacco})` : 'PSV-Driver';
    default:
      return method;
  }
}

const PAID_PILL = 'bg-emerald-600 text-white border-emerald-700';
const NOT_PAID_PILL = 'bg-red-600 text-white border-red-700';
const ON_DELIVERY_PILL = 'bg-amber-300 text-amber-950 border-amber-400';

export function ParcelCard({ parcel, onChanged }: ParcelCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const awaiting = parcel.tracking_status === 'awaiting_verification';
  const goodsPaid = parcel.goods_paid === true;
  const feeOnDelivery = parcel.payment_status !== 'paid';
  const isPsvDriver = parcel.sending_method === 'psv_driver';

  const setPayment = async (nextGoodsPaid: boolean, nextFeeStatus: 'paid' | 'pay_on_delivery') => {
    setBusy(true);
    const { error } = await supabase.rpc('seller_set_parcel_payment', {
      _parcel_id: parcel.id, _goods_paid: nextGoodsPaid, _fee_status: nextFeeStatus,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else onChanged?.();
  };

  const verifyAndDispatch = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('seller_verify_and_dispatch', { _parcel_id: parcel.id });
    setBusy(false);
    setConfirmOpen(false);
    if (error) toast.error(error.message);
    else { toast.success(`${parcel.buyer_name}'s parcel dispatched to Pata Parcel`); onChanged?.(); }
  };

  // Format WhatsApp link for Kenyan phone
  const cleanPhone = parcel.buyer_phone.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('0')
    ? `254${cleanPhone.slice(1)}`
    : cleanPhone.startsWith('254')
    ? cleanPhone
    : `254${cleanPhone}`;

  const createdDate = new Date(parcel.created_at).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const goodsVal = Number(parcel.goods_amount ?? 0);
  const sendingFeeVal = isPsvDriver || feeOnDelivery ? 0 : Number(parcel.total_sending_fee ?? 0);
  const totalExpectedPayment = goodsVal + sendingFeeVal;

  return (
    <Card className="overflow-hidden border border-border/80 bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-primary">
            {parcel.reference_number || 'PAP-PENDING'}
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {createdDate}
          </span>
        </div>
        {awaiting && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            Awaiting verification
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="p-4 space-y-3">
        {/* Buyer & Destination */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <h3 className="truncate font-semibold text-base text-foreground leading-snug">
              {parcel.buyer_name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 text-primary" />
              <span>{formatPhoneDisplay(parcel.buyer_phone)}</span>
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-emerald-600 hover:text-emerald-700 inline-flex items-center"
                title="Chat on WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Destination Badge */}
          <div className="flex shrink-0 items-center gap-1 bg-secondary/30 text-foreground px-2.5 py-1 rounded-full text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="max-w-[7rem] truncate">{parcel.destination}</span>
          </div>
        </div>

        {parcel.pick_point && (
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-muted-foreground">Pick-point:</span>
            <span className="truncate font-semibold text-foreground">{parcel.pick_point}</span>
          </div>
        )}

        {/* Method & Package Details */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/40">
          <div>
            <span className="text-muted-foreground block text-[10px]">Method</span>
            <span className="font-medium text-foreground flex items-center gap-1">
              <Truck className="h-3 w-3 text-primary shrink-0" />
              {getMethodLabel(parcel.sending_method, parcel.psv_sacco)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Package</span>
            <span className="font-medium text-foreground flex items-start gap-1 break-words">
              <Package className="h-3 w-3 text-primary shrink-0" />
              {parcel.package_type}
            </span>
          </div>
        </div>

        {parcel.package_description && (
          <div className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs">
            <span className="block text-[10px] text-muted-foreground">Short Description</span>
            <p className="break-words whitespace-pre-wrap font-medium text-foreground">{parcel.package_description}</p>
          </div>
        )}

        {/* Payment statuses (tap to change) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="mb-1 block text-[10px] text-muted-foreground">Goods Status{parcel.goods_amount != null ? ` · KES ${parcel.goods_amount}` : ''}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPayment(!goodsPaid, feeOnDelivery ? 'pay_on_delivery' : 'paid')}
              className={`h-9 w-full rounded-lg border font-bold ${goodsPaid ? PAID_PILL : NOT_PAID_PILL}`}
              title="Tap to change"
            >
              {goodsPaid ? 'Paid' : 'Not Paid'}
            </button>
          </div>
          <div>
            <span className="mb-1 block text-[10px] text-muted-foreground">Sending Fee Status{!feeOnDelivery && !isPsvDriver ? ` · KES ${parcel.total_sending_fee}` : ''}</span>
            <button
              type="button"
              disabled={busy || isPsvDriver}
              onClick={() => setPayment(goodsPaid, feeOnDelivery ? 'paid' : 'pay_on_delivery')}
              className={`h-9 w-full rounded-lg border font-bold ${feeOnDelivery ? ON_DELIVERY_PILL : PAID_PILL}`}
              title={isPsvDriver ? 'PSV-Driver is always paid on delivery' : 'Tap to change'}
            >
              {feeOnDelivery ? 'On Delivery' : 'Paid'}
            </button>
          </div>
        </div>
        {parcel.payment_code && (
          <p className="text-xs text-muted-foreground">
            M-Pesa / Airtel code: <span className="font-mono font-bold text-foreground">{parcel.payment_code}</span>
            {parcel.order_source === 'buyer_link' && <span className="ml-1">· sent by buyer</span>}
          </p>
        )}

        {awaiting && (
          <Button
            type="button"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
            className="h-11 w-full bg-red-600 font-bold text-white hover:bg-red-700"
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> Verify Payment &amp; Dispatch
          </Button>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Have you verified the payment?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 pt-2 text-xs text-muted-foreground">
                  <p>
                    Check your M-Pesa / Airtel Money messages from{' '}
                    <strong className="text-foreground">{parcel.buyer_name}</strong>
                    {parcel.payment_code ? (
                      <>
                        {' '}with transaction code <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{parcel.payment_code}</span>
                      </>
                    ) : null}.
                  </p>

                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span>Goods Total:</span>
                      <span className="font-semibold text-foreground">
                        {parcel.goods_amount != null ? `KES ${goodsVal.toLocaleString()}` : 'Not specified'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>Sending Fee:</span>
                      <span className="font-semibold text-foreground">
                        {isPsvDriver
                          ? 'Pay on Delivery (KES 0 now)'
                          : feeOnDelivery
                          ? `Pay on Delivery (KES ${Number(parcel.total_sending_fee || 0).toLocaleString()} on delivery)`
                          : `KES ${Number(parcel.total_sending_fee || 0).toLocaleString()}`}
                      </span>
                    </div>

                    <div className="border-t border-border/80 pt-1.5 flex justify-between items-center text-xs font-bold text-foreground">
                      <span>Total Payment Expected:</span>
                      <span className="text-sm text-primary">
                        {totalExpectedPayment > 0 ? `KES ${totalExpectedPayment.toLocaleString()}` : 'KES 0'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Dispatching marks the goods as <strong className="text-foreground">Paid</strong> and sends the parcel to Pata Parcel for processing.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Not yet</AlertDialogCancel>
              <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void verifyAndDispatch(); }} className="bg-red-600 text-white hover:bg-red-700 font-bold">
                Verified — Dispatch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Live Tracking Progress Bar */}
        <div className="pt-1">
          <TrackingProgressBar status={parcel.tracking_status} />
        </div>

        {/* Expandable Financial Details */}
        {expanded && (
          <div className="pt-2 border-t border-dashed border-border/80 text-xs space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Sending Fee:</span>
              <span className="font-bold text-foreground">{isPsvDriver ? 'Pay on Delivery' : `KES ${parcel.total_sending_fee}`}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform Service Fee:</span>
              <span className="text-foreground">KES {parcel.platform_fee} ({Math.round(PLATFORM_FEE_RATE * 100)}% of sending fee)</span>
            </div>
          </div>
        )}

        {/* Toggle details button */}
        <div className="flex justify-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {expanded ? (
              <>Less details <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Fee breakdown <ChevronDown className="h-3 w-3" /></>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
