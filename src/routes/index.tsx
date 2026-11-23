import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Shield,
  Zap,
  ArrowRight,
  LogIn,
  Sparkles,
  ShoppingBag,
  Building2,
  Camera,
  MessageCircle,
  MapPin,
  Star,
  Quote,
  Flame,
  Search,
  ExternalLink
} from 'lucide-react';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { HomeNavbar } from '@/components/home/HomeNavbar';
import { AnimatedStatsBar } from '@/components/home/AnimatedStatsBar';
import { WorkflowAnimation } from '@/components/home/WorkflowAnimation';
import { SaccoNetworkMarquee } from '@/components/home/SaccoNetworkMarquee';
import { ServicesDeepDive } from '@/components/home/ServicesDeepDive';
import { HomeFaq } from '@/components/home/HomeFaq';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Pata Parcel — Parcel Dispatch & Tracking for Kenyan Online Sellers' },
      { name: 'description', content: 'Send parcels across Kenya via PSV SACCOs, Pick-up Mtaani or door-to-door, with automated photo receipts sent directly to buyers on WhatsApp.' },
      { property: 'og:title', content: 'Pata Parcel — Parcel Dispatch & Tracking for Kenyan Online Sellers' },
      { property: 'og:description', content: 'Send parcels across Kenya via PSV SACCOs, Pick-up Mtaani or door-to-door, with automated photo receipts sent directly to buyers on WhatsApp.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/' }],
  }),
  component: LandingPage,
});

function LandingPage() {
  const testimonials = [
    {
      name: 'Mercy Achieng',
      shop: 'Glamour Chic Nairobi',
      channel: 'TikTok Live Seller',
      parcels: '240+ Dispatches',
      quote:
        'I used to spend 3 hours every single evening running between downtown bus stages with sweaty cash slips. With Pata Parcel, I drop all packages once at the hub, and my buyers get the stamped receipt photo on WhatsApp automatically. My return customers have doubled!',
    },
    {
      name: 'Dennis Kipkemoi',
      shop: 'Kicks & Sneaker Vault',
      channel: 'Instagram Store',
      parcels: '580+ Dispatches',
      quote:
        'The /order/shop link in my IG bio changed the game. No more writing down customer phone numbers on scraps of paper. Plus, the fraud shield stopped fake M-PESA screenshots dead in their tracks.',
    },
    {
      name: 'Brenda Njeri',
      shop: 'Savannah Scents & Beauty',
      channel: 'WhatsApp & Facebook',
      parcels: '190+ Dispatches',
      quote:
        'My customers in Kisumu, Nyeri, and Eldoret get their packages same-day or next morning. When they see the official SACCO receipt pop up on their WhatsApp with waybill number, all delivery anxiety vanishes.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20 selection:text-primary">
      {/* ── Top Announcement Micro-Banner ──────────────────────────────────── */}
      <div className="relative z-50 bg-primary px-4 py-2 text-center text-xs font-semibold text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-secondary animate-ping" />
          <span>Over 10,000+ parcels dispatched across 30+ counties with instant photo receipts on WhatsApp</span>
        </div>
      </div>

      {/* ── High-End Desktop Navbar ────────────────────────────────────────── */}
      <HomeNavbar />

      <main className="flex-1">
        {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-border/60">
          {/* Subtle Ambient Background Gradients */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl opacity-70" />
          <div className="pointer-events-none absolute top-1/3 -left-48 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 -right-48 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
              {/* Trust Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur-md">
                <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>Kenya's #1 Social Commerce Dispatch Platform</span>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span className="text-foreground/80 font-medium">TikTok · IG · WhatsApp · FB</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.12]">
                Turn Social Media Orders into{' '}
                <span className="bg-gradient-to-r from-primary via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  Same-Day Countrywide Dispatches
                </span>
              </h1>

              {/* Primary Dual Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
                <Link to="/login" search={{} as never} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-13 px-8 text-sm sm:text-base font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-200 gap-2 rounded-xl group"
                  >
                    <LogIn className="h-5 w-5 text-secondary" />
                    Sign In to Seller Portal
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                <a href="#workflow" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-13 px-6 text-sm font-bold border-2 border-border/80 hover:bg-card hover:border-primary/50 transition-all rounded-xl"
                  >
                    Explore How It Works
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── ANIMATED STATS COUNTER BAR (ALL ON SAME LINE) ────────────────── */}
        <section className="relative z-20 -mt-8 sm:-mt-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedStatsBar />
        </section>

        {/* ── SACCO NETWORK MARQUEE ────────────────────────────────────────── */}
        <section id="network" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
          <SaccoNetworkMarquee />
        </section>

        {/* ── WORKFLOW ANIMATION (FROM ORDER TO DOORSTEP) ──────────────────── */}
        <section id="workflow" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 border-b border-border/60">
          <WorkflowAnimation />
        </section>

        {/* ── PLATFORM SERVICES DEEP DIVE & MATRIX ─────────────────────────── */}
        <section id="services" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 border-b border-border/60">
          <ServicesDeepDive />
        </section>

        {/* ── SELLER STORIES & TESTIMONIALS ─────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 border-b border-border/60">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Real Online Sellers · Real Results
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Trusted by 700+ Kenyan Social Media Merchants
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Hear why top boutique and gadget sellers rely on Pata Parcel every single day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-500" />
                      ))}
                    </div>
                    <span className="font-mono text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {t.parcels}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border/50 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                    <p className="text-[11px] text-primary font-medium truncate">{t.shop}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.channel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ SECTION ──────────────────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 border-b border-border/60">
          <HomeFaq />
        </section>

        {/* ── FINAL CALL TO ACTION (CTA BANNER) ────────────────────────────── */}
        <section className="relative overflow-hidden py-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10" />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1 text-xs font-bold shadow">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ready to Scale Your Online Store?</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
              Stop Queuing at Bus Stages. Start Dispatching with Confidence.
            </h2>

            <p className="text-xs sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Join 700+ Kenyan sellers who dispatch smarter, delight buyers with automated WhatsApp receipts, and save over 15 hours every week.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/login" search={{} as never} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-13 px-8 text-base font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl gap-2 rounded-xl"
                >
                  <LogIn className="h-5 w-5 text-secondary" />
                  Sign In to Pata Parcel Portal
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── SUPER PREMIUM FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/80 px-4 py-12 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="overflow-hidden rounded-lg border border-primary/20 bg-background p-1">
                <img src="/logo.jpg" alt="Pata Parcel" className="h-8 w-8 object-contain rounded" />
              </div>
              <span className="font-extrabold text-base text-foreground">Pata Parcel</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kenya's dedicated social commerce dispatch and tracking platform. Delivering trust between online sellers and buyers across all 47 counties.
            </p>
            <p className="text-[11px] font-semibold text-primary">
              Delivering Trust, Every Time.
            </p>
          </div>

          {/* Col 2: Services & SACCOs */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Dispatch Services
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>PSV (SACCO) Express</li>
              <li>PSV Driver On-Delivery</li>
              <li>Pick-up Mtaani Lockers</li>
              <li>Nairobi Door-to-Door</li>
              <li>Central Hub Sorting</li>
              <li>Automated WhatsApp Receipts</li>
            </ul>
          </div>

          {/* Col 3: Partner Networks */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Key Carrier Routes
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Ena Coach (Western &amp; Nyanza)</li>
              <li>2NK &amp; 4NT (Mount Kenya)</li>
              <li>Super Metro (Nairobi Environs)</li>
              <li>Tahmid &amp; Dreamline (Coast)</li>
              <li>Tulaga &amp; Latema (Central Stage)</li>
              <li>Vetted PSV Vehicle Drivers</li>
            </ul>
          </div>

          {/* Col 4: Portals & TechBrain */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Portal Access
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link to="/login" search={{} as never} className="hover:text-primary transition-colors">
                  Seller Dispatch Portal
                </Link>
              </li>
              <li>
                <Link to="/login" search={{} as never} className="hover:text-primary transition-colors">
                  PAP Operations Hub
                </Link>
              </li>
              <li>
                <Link to="/login" search={{} as never} className="hover:text-primary transition-colors">
                  Admin Control Center
                </Link>
              </li>
              <li className="pt-2 text-[11px]">
                Powered by{' '}
                <a
                  href="https://www.techbrain.africa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-destructive hover:underline"
                >
                  TechBrain Africa
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mx-auto max-w-7xl border-t border-border/50 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p>© {new Date().getFullYear()} Pata Parcel Kenya. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="h-3 w-3 text-primary" />
            Protected by M-PESA Trigger Code Reservations &amp; Committed Rejection Logs
          </p>
        </div>
      </footer>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
