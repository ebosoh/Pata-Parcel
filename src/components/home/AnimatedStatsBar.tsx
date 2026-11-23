import { useEffect, useRef, useState } from 'react';
import { Download, Package, Building2, Smile, MapPin } from 'lucide-react';

interface StatConfig {
  id: string;
  label: string;
  sublabel: string;
  target: number;
  suffix: string;
  formatComma?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const STATS: StatConfig[] = [
  {
    id: 'downloads',
    label: 'App Downloads',
    sublabel: 'Active sellers on mobile',
    target: 700,
    suffix: '+',
    formatComma: false,
    icon: Download,
  },
  {
    id: 'parcels',
    label: 'Parcels Dispatched',
    sublabel: 'Delivered countrywide',
    target: 10000,
    suffix: '+',
    formatComma: true,
    icon: Package,
  },
  {
    id: 'saccos',
    label: 'Partner SACCOs',
    sublabel: 'Verified route offices',
    target: 100,
    suffix: '+',
    formatComma: false,
    icon: Building2,
  },
  {
    id: 'buyers',
    label: 'Happy Buyers',
    sublabel: 'Proof sent on WhatsApp',
    target: 1000,
    suffix: '+',
    formatComma: true,
    icon: Smile,
  },
  {
    id: 'counties',
    label: 'County Reach',
    sublabel: 'Across 47 counties',
    target: 30,
    suffix: '+',
    formatComma: false,
    icon: MapPin,
  },
];

export function AnimatedStatsBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    // Trigger count when element appears in viewport, or fallback after 300ms
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const fallbackTimer = setTimeout(() => {
      setHasStarted(true);
    }, 400);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const duration = 2200; // 2.2 seconds animation
    const startTime = performance.now();

    let animationFrameId: number;

    const updateCounts = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);

      // Smooth cubic-out easing
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);

      const nextCounts = STATS.map((stat) => {
        const val = Math.round(stat.target * easedProgress);
        return Math.min(val, stat.target);
      });

      setCounts(nextCounts);

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(updateCounts);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounts);

    return () => cancelAnimationFrame(animationFrameId);
  }, [hasStarted]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/90 shadow-2xl backdrop-blur-xl p-4 sm:p-6 lg:p-7">
        {/* Ambient Top Glow Line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

        {/* Ambient Radial Spotlight */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        {/* 
          All stats counters strictly on the same line on desktop (lg+),
          while smoothly wrapping into a clean grid on smaller screens.
        */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 lg:divide-x divide-border/60 gap-4 sm:gap-2 lg:gap-0">
          {STATS.map((stat, index) => {
            const Icon = stat.icon;
            const currentVal = counts[index] ?? 0;
            const displayVal = stat.formatComma
              ? currentVal.toLocaleString()
              : currentVal.toString();

            return (
              <div
                key={stat.id}
                className={`flex flex-col items-center text-center px-2 sm:px-4 lg:px-5 py-2.5 sm:py-3 transition-transform hover:scale-[1.02] duration-200 ${
                  index >= 2 ? 'pt-4 md:pt-0' : ''
                }`}
              >
                {/* Icon with glowing badge */}
                <div className="mb-2.5 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>

                {/* Animated Number Counter */}
                <div className="flex items-baseline justify-center font-mono">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
                    {displayVal}
                  </span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-primary ml-0.5">
                    {stat.suffix}
                  </span>
                </div>

                {/* Counter Label */}
                <span className="mt-1 text-xs sm:text-sm font-bold text-foreground">
                  {stat.label}
                </span>

                {/* Micro Sublabel */}
                <span className="mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-full">
                  {stat.sublabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
