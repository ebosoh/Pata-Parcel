import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Package, Truck, Shield, Zap } from 'lucide-react';
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
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg">
            <Package className="h-11 w-11 text-secondary" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Pata Parcel
          </h1>
          <p className="mt-2 text-base font-medium text-primary">
            Delivering Trust, Every Time
          </p>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            The simplest way for online sellers to dispatch, track, and manage parcels across Kenya.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            <Link to="/login">
              <Button size="lg" className="w-full text-base font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-card px-6 py-12">
        <div className="mx-auto grid max-w-lg gap-8 sm:max-w-3xl sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/30">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Track Parcels</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time tracking from dispatch to delivery
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/30">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Trusted Delivery</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Receipt-backed proof for every parcel sent
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/30">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Lightning Fast</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Optimized for any device, even on slow networks
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Pata Parcel. All rights reserved.
        </p>
      </footer>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
