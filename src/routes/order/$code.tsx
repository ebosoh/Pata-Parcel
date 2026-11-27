import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { DispatchForm } from '@/components/seller/DispatchForm';
import { paymentCodeRejection } from '@/lib/paymentCode';
import { trackBuyerOrderSubmit } from '@/lib/analytics';
import type { CreateParcelInput } from '@/hooks/useParcels';
import type { Destination } from '@/types/database';
import { CheckCircle2, Loader2, PackageCheck, ShieldCheck, AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/order/$code')({
  head: () => ({
    meta: [
      { title: 'Send Your Delivery Details — Pata Parcel' },
      { name: 'description', content: 'Fill in your delivery details so your seller can dispatch your parcel with Pata Parcel.' },
      { property: 'og:title', content: 'Send Your Delivery Details — Pata Parcel' },
      { property: 'og:description', content: 'Fill in your delivery details so your seller can dispatch your parcel with Pata Parcel.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: BuyerOrderPage,
});

type Seller = { business_name: string | null; owner_name: string; location: string | null };

function BuyerOrderPage() {
  const { code } = Route.useParams();
  const [seller, setSeller] = useState<Seller | null | undefined>(undefined);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [doneRef, setDoneRef] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('get_order_seller', { _code: code }).then(({ data }) => {
      setSeller((data as Seller[] | null)?.[0] ?? null);
    });
    supabase.from('destinations').select('*').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setDestinations(data as Destination[]);
    });
  }, [code]);

  const sellerName = seller ? seller.business_name || seller.owner_name : '';

  const submit = async (input: CreateParcelInput) => {
    const { data, error } = await supabase.rpc('submit_buyer_order', {
      _code: code,
      _buyer_name: input.buyer_name,
      _buyer_phone: input.buyer_phone,
      _destination: input.destination,
      _sending_method: input.sending_method,
      _psv_sacco: input.psv_sacco ?? '',
      _pick_point: input.pick_point ?? '',
      _package_type: input.package_type,
      _package_description: input.package_description ?? '',
      _sending_fee: input.sending_fee,
      _goods_amount: input.goods_amount ?? 0,
      _payment_code: input.payment_code ?? '',
    });
    const rejection = paymentCodeRejection(data);
    if (rejection) return { data: null, error: new Error(rejection) };
    if (!error && typeof data === 'string') {
      setDoneRef(data);
      trackBuyerOrderSubmit({
        destination: input.destination,
        sending_method: input.sending_method,
        package_type: input.package_type,
        goods_amount: input.goods_amount,
        sending_fee: input.sending_fee,
      });
    }
    return { data, error };
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-muted/20">
      <header className="border-b-4 border-secondary bg-primary px-4 py-4 text-primary-foreground">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <img src="/logo.jpg" alt="Pata Parcel" className="h-11 w-11 rounded-full border-2 border-secondary object-cover" />
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight">Pata Parcel</p>
            <p className="text-xs opacity-90">Delivering Trust, Every Time.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {seller === undefined ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : seller === null ? (
          <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-md">
            <AlertCircle className="mx-auto mb-2 h-10 w-10 text-destructive" />
            <h1 className="text-lg font-bold text-foreground">This order link isn't valid</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ask your seller to send you their Pata Parcel link again.</p>
          </div>
        ) : doneRef ? (
          <div className="rounded-2xl border border-primary/30 bg-card p-6 text-center shadow-md">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-primary" />
            <h1 className="text-xl font-extrabold text-foreground">Order details sent!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{sellerName}</span> will verify your payment and dispatch your parcel through Pata Parcel.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">Your tracking code</p>
            <p className="font-mono text-lg font-bold text-primary">{doneRef}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">You're ordering from</p>
              <h1 className="mt-0.5 text-xl font-extrabold text-foreground">{sellerName}</h1>
              {seller.location && <p className="text-xs text-muted-foreground">{seller.location}</p>}
              <div className="mt-3 flex gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><PackageCheck className="h-3.5 w-3.5 text-primary" /> Tracked delivery</span>
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Payment checked by seller</span>
              </div>
            </div>
            <DispatchForm mode="buyer" destinations={destinations} onSubmit={submit} />
          </>
        )}
        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          Powered by <Link to="/" className="font-semibold text-primary">Pata Parcel Kenya</Link>
        </p>
      </main>
    </div>
  );
}
