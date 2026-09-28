import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrackingProgressBar } from './TrackingProgressBar';
import { 
  Package, 
  MapPin, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  Truck, 
  Calendar 
} from 'lucide-react';
import type { Parcel, SendingMethod, PaymentStatus } from '@/types/database';
import { formatPhoneDisplay } from '@/lib/constants';

interface ParcelCardProps {
  parcel: Parcel;
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
    default:
      return method;
  }
}

function getPaymentBadge(status: PaymentStatus) {
  switch (status) {
    case 'paid':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
          Paid
        </Badge>
      );
    case 'unpaid':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
          Unpaid
        </Badge>
      );
    case 'pay_on_delivery':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400">
          Pay on Delivery
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ParcelCard({ parcel }: ParcelCardProps) {
  const [expanded, setExpanded] = useState(false);

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
        <div>
          {getPaymentBadge(parcel.payment_status)}
        </div>
      </div>

      {/* Main Info */}
      <div className="p-4 space-y-3">
        {/* Buyer & Destination */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-base text-foreground leading-snug">
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
          <div className="flex items-center gap-1 bg-secondary/30 text-foreground px-2.5 py-1 rounded-full text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{parcel.destination}</span>
          </div>
        </div>

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
            <span className="font-medium text-foreground flex items-center gap-1">
              <Package className="h-3 w-3 text-primary shrink-0" />
              {parcel.num_packages}x {parcel.package_type}
            </span>
          </div>
        </div>

        {/* Live Tracking Progress Bar */}
        <div className="pt-1">
          <TrackingProgressBar status={parcel.tracking_status} />
        </div>

        {/* Expandable Financial Details */}
        {expanded && (
          <div className="pt-2 border-t border-dashed border-border/80 text-xs space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Fee per Package:</span>
              <span className="font-medium text-foreground">KES {parcel.sending_fee_per_package}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Sending Fee:</span>
              <span className="font-bold text-foreground">KES {parcel.total_sending_fee}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform Service Fee:</span>
              <span className="text-foreground">KES {parcel.platform_fee} (KES 10/pkg)</span>
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
