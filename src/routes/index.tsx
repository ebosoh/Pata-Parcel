import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Package, Truck, Shield, Zap, ArrowRight, Store, Inbox } from 'lucide-react';
import { InstallPrompt } from '@/components/shared/InstallPrompt';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Pata Parcel — Delivering Trust, Every Time' },
      { name: 'description', content: 'Streamlined parcel dispatch and tracking for online sellers in Kenya.' },
      { property: 'og:title', content: 'Pata Parcel — Delivering Trust, Every Time' },
      { property: 'og:description', content: 'Streamlined parcel dispatch and tracking for online sellers in Kenya.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-md mx-auto">
          {/* Authentic Logo */}
          <div className="mb-4 overflow-hidden rounded-2xl shadow-xl border-2 border-primary/20 bg-card p-1">
            <img
              src="/logo.jpg"
              alt="Pata Parcel Logo"
              className="h-28 w-28 object-contain rounded-xl"
            />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Pata Parcel
          </h1>
          <p className="mt-1 text-sm font-bold text-primary tracking-wide uppercase">
            Delivering Trust, Every Time
          </p>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground px-2">
            The simplest mobile platform for online sellers (TikTok, IG, FB) to dispatch packages across Kenya via PSV, Pick-up Mtaani, and Door-to-Door.
          </p>

          {/* Direct Portal Entry Buttons */}
          <div className="mt-6 flex flex-col gap-2.5 w-full">
            <Link to={'/seller/dispatch' as any}>
              <Button size="lg" className="w-full text-sm font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center justify-between px-5 h-12">
                <span className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-secondary" />
                  Online Seller Portal
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to={'/pap/queue' as any}>
              <Button size="lg" variant="outline" className="w-full text-sm font-bold border-primary text-primary hover:bg-primary/5 flex items-center justify-between px-5 h-12">
                <span className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" />
                  PAP Operations Hub
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to={'/login' as any} className="pt-1">
              <span className="text-xs text-muted-foreground hover:text-primary underline">
                Account Sign In / OTP
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-card px-6 py-10">
        <div className="mx-auto grid max-w-lg gap-6 sm:max-w-3xl sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/30">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Multi-Way Dispatch</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Official/Unofficial PSV SACCOs, Pick-up Mtaani, Door-to-Door, and PAP branches
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/30">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Receipt Proof</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Photographed courier slips shared instantly with online sellers
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/30">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">3G Optimized PWA</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ultra-lightweight design tailored for fast loading on all Kenyan mobile networks
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 text-center">
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Pata Parcel Kenya. Delivering Trust, Every Time.
        </p>
      </footer>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
