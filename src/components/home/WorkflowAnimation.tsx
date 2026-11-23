import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  PackageCheck,
  Building2,
  Camera,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  Truck,
  Sparkles,
  FileText,
  Clock,
  ChevronRight
} from 'lucide-react';

interface WorkflowStep {
  id: number;
  badge: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  renderVisual: () => React.ReactNode;
}

export function WorkflowAnimation() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps: WorkflowStep[] = [
    {
      id: 1,
      badge: 'Step 1 · Order Capture',
      title: 'Buyer Submits Order via /order/shop',
      shortDesc: 'Buyer inputs details on seller bio link',
      fullDesc: 'The buyer taps the seller’s custom bio link, chooses destination town, selects preferred carrier (PSV SACCO, Pick-Up Mtaani, or Door-to-Door), and submits their order with zero DM friction.',
      icon: ShoppingBag,
      accentColor: 'text-amber-500',
      renderVisual: () => (
        <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-border/80 bg-background/95 p-4 shadow-xl">
          {/* Mobile Phone Mockup Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">pataparcel.app/order/nairobi-glam</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>

          {/* Form preview */}
          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-primary/10 p-2 text-primary font-bold text-center">
              Nairobi Glam Official Order Link
            </div>
            <div className="rounded border border-border p-2 bg-card space-y-1">
              <span className="text-[10px] text-muted-foreground block">Customer Name</span>
              <p className="font-semibold text-foreground">Jane Wanjiku Mwangi</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-border p-2 bg-card">
                <span className="text-[10px] text-muted-foreground block">Destination</span>
                <p className="font-semibold text-foreground">Kisumu CBD</p>
              </div>
              <div className="rounded border border-border p-2 bg-card">
                <span className="text-[10px] text-muted-foreground block">Method</span>
                <p className="font-semibold text-primary">PSV (Ena Coach)</p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-600 text-white p-2.5 text-center font-bold text-xs flex items-center justify-center gap-1.5 shadow-md">
              <CheckCircle2 className="h-3.5 w-3.5" /> Order Confirmed &amp; Queued
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      badge: 'Step 2 · Central Hub Intake',
      title: 'Tracking Code & Fraud Protection',
      shortDesc: 'Unique code generated & verified',
      fullDesc: 'Order generates a unique tracking reference (e.g. HudsonEboso-012548). Sellers drop packages at the PAP central hub or schedule pickup. Built-in trigger checks eliminate fake M-PESA codes and duplicate orders.',
      icon: PackageCheck,
      accentColor: 'text-blue-500',
      renderVisual: () => (
        <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-border/80 bg-background/95 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-mono text-xs font-bold text-primary">PAP-HUB-INTAKE</span>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" /> Anti-Fraud Verified
            </span>
          </div>

          {/* Barcode & Ref Card */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Unique Tracking Reference</p>
            <p className="font-mono text-base font-extrabold text-foreground tracking-wider">HudsonEboso-012548</p>
            {/* Stylized Barcode */}
            <div className="h-8 flex justify-center items-center gap-0.5 px-4 opacity-80">
              {[4, 2, 5, 1, 3, 6, 2, 4, 1, 5, 3, 2, 6, 4, 1, 3, 5, 2, 4].map((h, i) => (
                <div key={i} className="bg-foreground w-1 rounded-sm" style={{ height: `${h * 4.5}px` }} />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
            <span>Status: <strong className="text-foreground">Sorting at Nairobi Hub</strong></span>
            <span>Fee: <strong className="text-emerald-600">Paid (KES 350)</strong></span>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      badge: 'Step 3 · Route Sorting',
      title: 'Automated Carrier Assignment',
      shortDesc: 'Routed to best SACCO or driver',
      fullDesc: 'Our operations team aggregates and sorts parcels by destination across Kenya’s 100+ partner SACCOs (Tulaga, 2NK, Super Metro, Ena Coach, Tahmid, etc.) or vetted on-delivery drivers with vehicle plate verification.',
      icon: Building2,
      accentColor: 'text-purple-500',
      renderVisual: () => (
        <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-border/80 bg-background/95 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-primary" />
              Nairobi Central Hub Sorting
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">100+ SACCO Network</span>
          </div>

          {/* SACCO Route Matrix */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground">Western Route: Kisumu</span>
              </div>
              <span className="font-mono font-bold text-primary text-[11px]">Ena Coach</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="font-semibold text-foreground">Mount Kenya: Nyeri</span>
              </div>
              <span className="font-mono font-bold text-primary text-[11px]">2NK SACCO</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-foreground">Coast: Mombasa</span>
              </div>
              <span className="font-mono font-bold text-primary text-[11px]">Tahmid Coach</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      badge: 'Step 4 · Physical Dispatch & Slip',
      title: 'Booking & Courier Receipt Photograph',
      shortDesc: 'Slip scanned with in-app camera',
      fullDesc: 'PAP staff arrives at the carrier office, books parcel dispatch, and takes an instant photograph of the official courier receipt slip with booking number and SACCO stamp.',
      icon: Camera,
      accentColor: 'text-emerald-500',
      renderVisual: () => (
        <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-border/80 bg-background/95 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-emerald-600" />
              In-App Receipt Scanner
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950 font-bold px-2 py-0.5 rounded">
              High-Res Captured
            </span>
          </div>

          {/* Receipt slip mockup */}
          <div className="relative rounded-lg border-2 border-dashed border-primary/40 bg-card p-3 shadow-inner">
            {/* Viewfinder brackets */}
            <div className="absolute top-1 left-1 h-3 w-3 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-1 right-1 h-3 w-3 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-primary" />

            <div className="text-center space-y-1">
              <p className="font-mono text-[11px] font-extrabold text-foreground uppercase tracking-wider">
                ★ ENA COACH OFFICIAL RECEIPT ★
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                WAYBILL #KC-884920 · NAIROBI TO KISUMU
              </p>
              <div className="my-2 inline-block rounded border-2 border-red-500/80 px-2 py-0.5 text-[10px] font-bold text-red-600 uppercase transform -rotate-2">
                DISPATCHED &amp; PAID
              </div>
              <p className="text-[9px] text-muted-foreground">Sender: PAP Hub Nairobi · Recipient: Jane Wanjiku</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      badge: 'Step 5 · WhatsApp Proof',
      title: 'Receipt Sent to Buyer on WhatsApp',
      shortDesc: 'Automated instant proof of dispatch',
      fullDesc: 'One click sends a personalized WhatsApp message with the parcel tracking details and a shortened, secure link to the high-resolution receipt photo directly to the buyer.',
      icon: MessageCircle,
      accentColor: 'text-emerald-600',
      renderVisual: () => (
        <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-border/80 bg-background/95 p-4 shadow-xl space-y-2.5">
          {/* WhatsApp Header Bar */}
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-700 text-white p-2.5 shadow">
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
              P
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight">Pata Parcel Official</p>
              <p className="text-[10px] text-emerald-200">Verified Business Account</p>
            </div>
            <MessageCircle className="h-4 w-4 text-white" />
          </div>

          {/* WhatsApp Chat Bubble */}
          <div className="rounded-xl rounded-tl-none bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-3 text-xs space-y-1.5 shadow-sm">
            <p className="font-medium text-foreground">
              Hello <strong className="text-emerald-700 dark:text-emerald-300">Jane Wanjiku</strong>, here is your Pata Parcel dispatch receipt!
            </p>
            <div className="font-mono text-[11px] text-muted-foreground space-y-0.5 bg-background/60 p-2 rounded border border-border/40">
              <p>Tracking Code: <strong>HudsonEboso-012548</strong></p>
              <p>To: Kisumu CBD</p>
              <p>Courier: Ena Coach</p>
              <p className="text-primary font-bold">Receipt: https://tinyurl.com/r8482</p>
            </div>
            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
              <span>Thank you for choosing Pata Parcel!</span>
              <span className="text-emerald-600 font-bold">14:32 ✓✓</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      badge: 'Step 6 · Doorstep Delivery',
      title: 'Collection & Parcel Handover',
      shortDesc: 'Marked delivered across 30+ counties',
      fullDesc: 'Parcel reaches destination stage or buyer doorstep. Buyer inspects goods, courier marks collection, and parcel status is updated to Delivered across all portals.',
      icon: CheckCircle2,
      accentColor: 'text-emerald-500',
      renderVisual: () => (
        <div className="relative mx-auto max-w-sm rounded-2xl border-2 border-border/80 bg-background/95 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-bold text-foreground">Delivery Status</span>
            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full">
              Delivered
            </span>
          </div>

          {/* Delivery Success Card */}
          <div className="text-center py-2 space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Parcel Collected by Buyer</p>
              <p className="text-xs text-muted-foreground">Ena Coach Kisumu Main Stage</p>
            </div>
            <div className="rounded-lg bg-muted/60 p-2 text-xs flex justify-around">
              <div>
                <p className="text-[10px] text-muted-foreground">Transit Time</p>
                <p className="font-bold text-foreground">Same-Day (6h)</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Seller Trust</p>
                <p className="font-bold text-emerald-600">100% Verified</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Auto-advance through workflow
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4200);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const current = steps[activeStep]!;

  return (
    <div className="w-full space-y-6">
      {/* Workflow Navigation Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Automated Social Commerce Journey
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
            How Pata Parcel Works from Order to Doorstep
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-500" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-500" /> Play Tour
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar (Desktop & Tablet) */}
      <div className="relative">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStep;
            const isCompleted = idx < activeStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setActiveStep(idx);
                  setIsPlaying(false);
                }}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-300 ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary'
                    : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-muted/80'
                    : 'border-border/70 bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    0{step.id}
                  </span>
                </div>

                <p className="text-xs font-bold text-foreground line-clamp-1">{step.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{step.shortDesc}</p>

                {/* Animated active underline */}
                {isActive && (
                  <div className="absolute bottom-0 inset-x-2 h-0.5 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Stage Interactive Showcase Card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Detailed Stage Explanation */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {current.badge}
            </div>

            <h4 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {current.title}
            </h4>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {current.fullDesc}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Live Stage {activeStep + 1} of {steps.length}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep((prev) => (prev > 0 ? prev - 1 : steps.length - 1));
                    setIsPlaying(false);
                  }}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep((prev) => (prev + 1) % steps.length);
                    setIsPlaying(false);
                  }}
                  className="rounded-lg bg-primary text-primary-foreground px-3 py-1 text-xs font-bold hover:bg-primary/90 flex items-center gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Realistic Dynamic UI Preview Mockup */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto flex items-center justify-center p-2 sm:p-4">
              {current.renderVisual()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
