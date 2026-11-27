import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  ArrowRight,
  AlertCircle,
  Loader2,
  PackageCheck,
  ScanLine,
  Home,
  PhoneCall,
} from 'lucide-react';
import type { TrackingStatus } from '@/types/database';
import { trackParcelTrackSearch } from '@/lib/analytics';

export const Route = createFileRoute('/track/$code')({
  head: () => ({
    meta: [
      { title: 'Track Your Parcel – Pata Parcel' },
      { name: 'description', content: 'Track your parcel delivery status in real time with Pata Parcel Kenya.' },
      { property: 'og:title', content: 'Track Your Parcel – Pata Parcel' },
      { property: 'og:description', content: 'Track your parcel delivery status in real time with Pata Parcel Kenya.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: TrackParcelPage,
});

type ParcelInfo = {
  reference_number: string;
  buyer_name: string;
  destination: string;
  sending_method: string;
  psv_sacco: string | null;
  pick_point: string | null;
  tracking_status: TrackingStatus;
  payment_status: string;
  package_type: string;
  created_at: string;
  updated_at: string;
  seller_name: string | null;
  receipt_url: string | null;
};

const STATUS_STEPS: { key: TrackingStatus; label: string; icon: React.ElementType; desc: string }[] = [
  {
    key: 'awaiting_verification',
    label: 'Order Received',
    icon: ScanLine,
    desc: 'Your order details have been received. Waiting for seller to verify payment.',
  },
  {
    key: 'dispatched_to_pap',
    label: 'Dispatched to Pata Parcel',
    icon: Package,
    desc: 'Your parcel has been handed over to Pata Parcel for processing.',
  },
  {
    key: 'sorting',
    label: 'Sorting',
    icon: PackageCheck,
    desc: 'Your parcel is being sorted at our facility and assigned to a route.',
  },
  {
    key: 'on_transit',
    label: 'On Transit',
    icon: Truck,
    desc: 'Your parcel is on the way to your pickup point or destination.',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
    desc: 'Your parcel has been delivered successfully. Thank you for using Pata Parcel!',
  },
];

const STATUS_ORDER: TrackingStatus[] = [
  'awaiting_verification',
  'dispatched_to_pap',
  'sorting',
  'on_transit',
  'delivered',
];

function statusIndex(s: TrackingStatus) {
  return STATUS_ORDER.indexOf(s);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function maskName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p, i) =>
      i === 0 ? p : p.length > 1 ? p[0] + '*'.repeat(p.length - 1) : p
    )
    .join(' ');
}

function sendingMethodLabel(method: string) {
  const map: Record<string, string> = {
    pickup_mtaani: 'Pickup Mtaani',
    pata_parcel: 'Pata Parcel Office',
    door_to_door: 'Door-to-Door',
    psv: 'PSV / Matatu',
    psv_driver: 'PSV Driver',
  };
  return map[method] ?? method;
}

function TrackParcelPage() {
  const { code } = Route.useParams();
  const [parcel, setParcel] = useState<ParcelInfo | null | undefined>(undefined);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 1. Query parcel by reference_number
      const { data: parcelData } = await supabase
        .from('parcels')
        .select(
          'reference_number, buyer_name, destination, sending_method, psv_sacco, pick_point, tracking_status, payment_status, package_type, created_at, updated_at, seller_id'
        )
        .eq('reference_number', code)
        .maybeSingle();

      if (!parcelData) {
        setParcel(null);
        trackParcelTrackSearch({ tracking_code: code, status: null });
        return;
      }

      trackParcelTrackSearch({
        tracking_code: code,
        status: (parcelData as any).tracking_status,
      });

      // 2. Get seller name from profiles
      let sellerName: string | null = null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, owner_name')
        .eq('id', (parcelData as any).seller_id)
        .maybeSingle();
      if (profile) {
        sellerName = (profile as any).business_name || (profile as any).owner_name;
      }

      // 3. Try to get receipt photo signed URL
      let signedUrl: string | null = null;
      const { data: receiptRecord } = await supabase
        .from('parcel_receipts')
        .select('receipt_image_url')
        .eq('parcel_id', (parcelData as any).id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (receiptRecord && (receiptRecord as any).receipt_image_url) {
        const { data: signed } = await supabase.storage
          .from('receipts')
          .createSignedUrl((receiptRecord as any).receipt_image_url, 3600);
        if (signed?.signedUrl) signedUrl = signed.signedUrl;
      }

      setParcel({
        ...(parcelData as any),
        seller_name: sellerName,
        receipt_url: signedUrl,
      } as ParcelInfo);
      setReceiptUrl(signedUrl);
    }
    load();
  }, [code]);

  const currentIdx = parcel ? statusIndex(parcel.tracking_status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b-4 border-secondary bg-primary px-4 py-4 text-primary-foreground sticky top-0 z-10 shadow-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Pata Parcel" className="h-10 w-10 rounded-full border-2 border-secondary object-cover" />
            <div className="min-w-0">
              <p className="text-base font-extrabold leading-tight">Pata Parcel</p>
              <p className="text-[11px] opacity-80">Delivering Trust, Every Time.</p>
            </div>
          </div>
          <Link to="/" className="flex items-center gap-1 text-xs text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-extrabold text-foreground">Parcel Tracking</h1>
        </div>

        {/* Loading */}
        {parcel === undefined && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Looking up tracking code…</p>
          </div>
        )}

        {/* Not found */}
        {parcel === null && (
          <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
            <h2 className="text-lg font-bold text-foreground">Parcel not found</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              We couldn't find a parcel with tracking code{' '}
              <span className="font-mono font-semibold text-foreground">{code}</span>.
            </p>
            <ul className="mt-3 text-xs text-muted-foreground space-y-1 text-left max-w-xs mx-auto">
              <li>• Check that you've entered the code exactly as given by your seller</li>
              <li>• Make sure it's your tracking code, not the seller's shop link</li>
              <li>• Contact your seller if the problem persists</li>
            </ul>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        )}

        {/* Found */}
        {parcel && (
          <>
            {/* Reference card */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tracking Code</p>
                  <p className="font-mono text-xl font-extrabold text-primary mt-0.5">{parcel.reference_number}</p>
                </div>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                    parcel.tracking_status === 'delivered'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : parcel.tracking_status === 'on_transit'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : parcel.tracking_status === 'sorting'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {STATUS_STEPS.find((s) => s.key === parcel.tracking_status)?.label ?? parcel.tracking_status}
                </span>
              </div>

              {/* Parcel info grid */}
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Buyer</p>
                  <p className="font-semibold text-foreground">{maskName(parcel.buyer_name)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Destination</p>
                  <p className="font-semibold text-foreground">{parcel.destination}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Delivery Method</p>
                  <p className="font-semibold text-foreground">{sendingMethodLabel(parcel.sending_method)}</p>
                </div>
                {parcel.psv_sacco && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SACCO / Route</p>
                    <p className="font-semibold text-foreground">{parcel.psv_sacco}</p>
                  </div>
                )}
                {parcel.pick_point && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pick Point</p>
                    <p className="font-semibold text-foreground">{parcel.pick_point}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Package Type</p>
                  <p className="font-semibold text-foreground">{parcel.package_type}</p>
                </div>
                {parcel.seller_name && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seller</p>
                    <p className="font-semibold text-foreground">{parcel.seller_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order Date</p>
                  <p className="font-semibold text-foreground">{formatDate(parcel.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Tracking timeline */}
            <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                Tracking Timeline
              </h2>
              <ol className="relative space-y-0">
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx <= currentIdx;
                  const active = idx === currentIdx;
                  const Icon = step.icon;
                  return (
                    <li key={step.key} className="flex gap-3 pb-5 last:pb-0 relative">
                      {/* Connector line */}
                      {idx < STATUS_STEPS.length - 1 && (
                        <div
                          className={`absolute left-[15px] top-8 w-0.5 h-full -translate-x-1/2 ${
                            idx < currentIdx ? 'bg-primary' : 'bg-border'
                          }`}
                        />
                      )}
                      {/* Icon */}
                      <div
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-110'
                            : done
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {/* Text */}
                      <div className="pt-0.5 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {step.label}
                          {active && (
                            <span className="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground align-middle">
                              Current
                            </span>
                          )}
                        </p>
                        {(done || active) && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                        )}
                        {active && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Updated: {formatDate(parcel.updated_at)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Receipt photo (if available) */}
            {receiptUrl && (
              <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                <h2 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Delivery Receipt
                </h2>
                <img
                  src={receiptUrl}
                  alt="Parcel receipt"
                  className="w-full rounded-xl border border-border object-contain max-h-72"
                />
              </div>
            )}

            {/* Payment status notice */}
            {parcel.payment_status === 'unpaid' && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Payment is pending. Please ensure your seller has verified your payment code for dispatch.</p>
              </div>
            )}

            {/* Delivered success banner */}
            {parcel.tracking_status === 'delivered' && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600" />
                <p className="font-bold text-green-800">Your parcel has been delivered! 🎉</p>
                <p className="mt-1 text-xs text-green-700">Thank you for using Pata Parcel Kenya.</p>
              </div>
            )}

            {/* Need help */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Need help with your parcel?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Call or WhatsApp our support team.</p>
              </div>
              <a
                href="https://wa.me/254700000000"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Contact Us
              </a>
            </div>

            {/* Track another */}
            <div className="text-center pt-1">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Track another parcel
              </Link>
            </div>
          </>
        )}

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          Powered by{' '}
          <Link to="/" className="font-semibold text-primary">
            Pata Parcel Kenya
          </Link>
        </p>
      </main>
    </div>
  );
}
