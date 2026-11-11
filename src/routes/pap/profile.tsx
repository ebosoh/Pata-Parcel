import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, User, Phone, MapPin, LogOut } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';

export const Route = createFileRoute('/pap/profile')({
  head: () => ({
    meta: [
      { title: 'Staff Profile — Pata Parcel Operations Hub' },
      { name: 'description', content: 'Pata Parcel operations staff account, station and standard operating procedures.' },
      { property: 'og:title', content: 'Staff Profile — Pata Parcel Operations Hub' },
      { property: 'og:description', content: 'Pata Parcel operations staff account, station and standard operating procedures.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/pap/profile' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/pap/profile' }],
  }),
  component: PapProfilePage,
});

function PapProfilePage() {
  const { user, profile, signOut, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: '/login' as any });
  };

  return (
    <AppShell role="pap_staff">
      <div className="space-y-4 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Staff Profile</h1>
            <p className="text-xs text-muted-foreground">
              Operations & sorting hub access
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Sign Out
          </Button>
        </div>

        <Card className="p-5 space-y-4 border border-border/80 bg-card">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="h-14 w-14 rounded-2xl bg-primary text-secondary flex items-center justify-center font-bold text-xl shadow-md">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">
                {profile?.owner_name || 'PAP Operations Officer'}
              </h2>
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase mt-1">
                PAP Staff Account
              </Badge>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Full Name:
              </span>
              <span className="font-semibold text-foreground">
                {profile?.owner_name || 'Staff Member'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Contact Phone:
              </span>
              <span className="font-semibold text-foreground">
                {profile?.phone ? formatPhoneDisplay(profile.phone) : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Station / Hub:
              </span>
              <span className="font-semibold text-foreground">
                {profile?.location || 'Nairobi Central Sorting Hub'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">App Access:</span>
              <span className="text-emerald-600 font-semibold">Active · Operations</span>
            </div>
          </div>
        </Card>

        {/* Quick Shift Rules / Notice */}
        <div className="rounded-xl bg-secondary/20 border border-secondary/40 p-3.5 text-xs text-foreground space-y-1">
          <p className="font-bold text-primary">Standard Operating Procedure:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px]">
            <li>Scan/check incoming packages against seller label before receiving.</li>
            <li>Take clear, glare-free receipt photos for all official PSV & Pick-up Mtaani drops.</li>
            <li>Double-check buyer phone numbers when handing parcels to unofficial drivers.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
