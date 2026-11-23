import { Building2, Truck, ShieldCheck, MapPin } from 'lucide-react';
import { SACCO_NAMES } from '@/lib/constants';

export function SaccoNetworkMarquee() {
  const featured = [
    { name: 'Ena Coach', hub: 'Western / Kisumu / Migori', type: 'Coach & Courier' },
    { name: '2NK SACCO', hub: 'Nyeri / Karatina / Central', type: 'Express PSV' },
    { name: 'Super Metro', hub: 'Nairobi Metro / Juja / Kikuyu', type: 'Metropolitan Express' },
    { name: 'Tahmid Coach', hub: 'Mombasa / Malindi / Coast', type: 'Inter-City Coach' },
    { name: 'Tulaga SACCO', hub: 'Nyandarua / Kinangop', type: 'Agricultural & Cargo' },
    { name: 'Dream Line', hub: 'Voi / Mombasa / Coast', type: 'Luxury Cargo' },
    { name: '4NT SACCO', hub: 'Nanyuki / Meru / Isiolo', type: 'Mount Kenya PSV' },
    { name: 'Kukena SACCO', hub: 'Embu / Kirinyaga / Kerugoya', type: 'Express PSV' },
    { name: 'Latema SACCO', hub: 'Nairobi Central Downtown', type: 'Central Stage' },
    { name: 'Lopha Travels', hub: 'Limuru / Kiambu / Central', type: 'Fast Express' },
    { name: 'Unique SACCO', hub: 'Murang’a / Thika / Kenol', type: 'Stage Parcel' },
    { name: 'Luxury SACCO', hub: 'Nakuru / Eldoret / Rift', type: 'Western PSV' },
    { name: 'County Link', hub: 'Countrywide Logistics', type: 'Cross-County' },
    { name: 'Pick-Up Mtaani', hub: 'Nairobi & Environs Lockers', type: 'Neighborhood Hubs' },
  ];

  // Double array for seamless infinite marquee loop
  const marqueeItems = [...featured, ...featured];

  return (
    <div className="w-full space-y-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Official Kenyan Logistics Network
          </p>
        </div>
        <p className="text-xs font-medium text-primary">
          Over 100+ Connected SACCO Offices &amp; Courier Stages Countrywide
        </p>
      </div>

      {/* Marquee Track Container with side gradient fades */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        {/* Left and right gradient fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-card to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-card to-transparent z-10" />

        {/* CSS Scrolling Marquee */}
        <div className="flex w-max gap-3 animate-marquee hover:[animation-play-state:paused]">
          {marqueeItems.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/80 px-4 py-2.5 shadow-sm hover:border-primary/50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.hub}</p>
              </div>
              <span className="ml-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                Verified
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
