import {
  Link as LinkIcon,
  MessageCircle,
  Truck,
  ShieldCheck,
  Printer,
  Sparkles,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Layers
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function ServicesDeepDive() {
  const pillars = [
    {
      icon: LinkIcon,
      badge: 'Social Storefront',
      title: 'Branded Bio Order Link',
      desc: 'Never lose a TikTok or Instagram buyer to slow DM replies. Place your unique /order/shop link in your bio. Buyers choose their exact county, dropoff town, and carrier in seconds.',
      highlight: 'Zero DM friction · Mobile-first for Kenya',
    },
    {
      icon: MessageCircle,
      badge: 'Instant Trust Builder',
      title: 'Photographed Receipts on WhatsApp',
      desc: 'Eliminate the #1 friction in social commerce: "Umetuma kweli?". When our staff books your parcel at the SACCO, we take a high-res photo of the receipt and auto-send it to your buyer on WhatsApp.',
      highlight: 'Stops buyer anxiety · 100% verified proof',
    },
    {
      icon: Layers,
      badge: 'Consolidated Logistics',
      title: 'Central Nairobi Sorting Hub',
      desc: 'Stop spending 3 hours every afternoon fighting downtown Nairobi traffic and queuing at different bus stages. Drop all parcels at our central hub or book a collection; we sort and dispatch everywhere.',
      highlight: 'Saves 15+ hours weekly per seller',
    },
    {
      icon: Truck,
      badge: 'Unmatched Reach',
      title: '100+ SACCOs & On-Delivery Drivers',
      desc: 'Whether your customer is in Lodwar, Mandera, Kisii, or Diani, we connect directly with over 100 verified SACCOs (2NK, Ena Coach, Super Metro, Tulaga, etc.) plus vetted on-delivery drivers.',
      highlight: 'Stage-to-stage, lockers & doorstep options',
    },
    {
      icon: ShieldCheck,
      badge: 'Anti-Fraud Shield',
      title: 'Payment Code Reservation Triggers',
      desc: 'Built-in database triggers enforce payment-code reservations and phone reuse counters. Protects your online shop against fraudulent M-PESA confirmations and repeat fake order spam.',
      highlight: 'Committed rejection logs · Bank-grade security',
    },
    {
      icon: Printer,
      badge: 'Accounting & Compliance',
      title: 'One-Click Bulk PDF Printing',
      desc: 'Need proof for tax filing, audits, or dispute resolution? Select any number of receipts and generate official, high-resolution bulk printable dispatch dossiers in PDF format instantly.',
      highlight: 'Complete digital trail for your business',
    },
  ];

  const comparisons = [
    {
      factor: 'Daily Dispatch Time',
      oldWay: 'Spend 2-4 hours trekking to multiple downtown Nairobi bus stages in traffic',
      papWay: 'Single drop-off at PAP Hub or driver pickup from your door in 2 minutes',
    },
    {
      factor: 'Dispatch Proof',
      oldWay: 'Handwrite customer details on flimsy paper slips; snap blurry photos manually in DMs',
      papWay: 'Photographed stamped courier receipts auto-delivered to buyer WhatsApp',
    },
    {
      factor: 'Buyer Inquiries',
      oldWay: 'Constant repetitive calls: "Umetuma?", "Gari gani?", "Namba ya dereva?"',
      papWay: 'Live parcel tracking link with instant WhatsApp receipt and SACCO name',
    },
    {
      factor: 'Fake Orders & Fraud',
      oldWay: 'Susceptible to fake M-PESA SMS screenshots and duplicate code claims',
      papWay: 'Automated database verification triggers prevent payment code reuse',
    },
    {
      factor: 'Record Keeping',
      oldWay: 'Lost paper receipts, disorganized WhatsApp gallery photos, no audit trail',
      papWay: 'Encrypted cloud storage, search by date & seller, and 1-click Bulk Print to PDF',
    },
  ];

  return (
    <div className="w-full space-y-16 py-8">
      {/* 1. Value Proposition Pillars */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Built Exclusively for Kenya's Social Commerce
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
            Everything an Online Seller Needs to Scale Countrywide
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Whether you sell fashion on TikTok, sneakers on Instagram, or beauty products on WhatsApp, Pata Parcel automates your entire logistics lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="group relative rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all hover:border-primary/50 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {pillar.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                      {pillar.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{pillar.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Before vs After Comparison Matrix */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/30 p-6 sm:p-8 shadow-md">
        <div className="text-center max-w-xl mx-auto mb-8 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            The Transformation
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            The Old Dispatch Hassle vs. The Pata Parcel Way
          </h3>
          <p className="text-xs text-muted-foreground">
            See how online sellers save up to 15 hours every week while growing customer trust.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3 px-3 font-bold uppercase tracking-wider w-1/4">Aspect</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-destructive w-3/8">
                  The Old Way (Manual Queues)
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-primary w-3/8">
                  The Pata Parcel Way
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {comparisons.map((row, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-foreground">{row.factor}</td>
                  <td className="py-3 px-3 text-muted-foreground">
                    <div className="flex items-start gap-1.5">
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span>{row.oldWay}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-foreground font-medium">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{row.papWay}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
