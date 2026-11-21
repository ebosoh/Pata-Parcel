import { useEffect, useState, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, User, Phone, MapPin, LogOut, Camera, Upload, Trash2, Loader2 } from 'lucide-react';
import { formatPhoneDisplay } from '@/lib/constants';
import { StorageImage } from '@/components/shared/StorageImage';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
  const { user, profile, updateProfile, signOut, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await updateProfile({
        profile_picture_url: filePath,
      });

      if (updateError) throw updateError;
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    setRemoving(true);
    try {
      const { error } = await updateProfile({
        profile_picture_url: null as any,
      });
      if (error) throw error;
      toast.success('Profile picture removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove picture');
    } finally {
      setRemoving(false);
    }
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
            className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Sign Out
          </Button>
        </div>

        <Card className="p-5 space-y-4 border border-border/80 bg-card">
          <div className="flex items-center gap-4 pb-3 border-b border-border/60">
            {/* Avatar section */}
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-primary text-secondary font-bold text-xl shadow-md cursor-pointer hover:border-primary transition-all relative"
                title="Click to change profile picture"
              >
                {profile?.profile_picture_url ? (
                  <StorageImage
                    src={profile.profile_picture_url}
                    alt={profile.owner_name || 'Staff Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShieldCheck className="h-8 w-8" />
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Camera icon button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 rounded-full bg-primary text-secondary p-1.5 shadow hover:scale-110 active:scale-95 transition-all cursor-pointer border border-background"
                title="Change photo"
                aria-label="Change photo"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-base text-foreground truncate">
                {profile?.owner_name || 'PAP Operations Officer'}
              </h2>
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase mt-1">
                PAP Staff Account
              </Badge>

              {/* Photo Action Buttons */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-7 text-[11px] px-2.5 cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1 text-primary" />
                  )}
                  {profile?.profile_picture_url ? 'Change Photo' : 'Add Photo'}
                </Button>

                {profile?.profile_picture_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={uploading || removing}
                    className="h-7 text-[11px] px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                )}
              </div>
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
