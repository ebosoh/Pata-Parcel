import { useState, useRef } from 'react';
import { Package, User, Camera, Upload, Trash2, Loader2, LogOut, ArrowRight, ShieldCheck, Store, Shield } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { StorageImage } from '@/components/shared/StorageImage';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types/database';

function getRoleLabel(role?: UserRole | string | null): string {
  switch (role) {
    case 'pap_admin':
      return 'Admin';
    case 'pap_staff':
      return 'PAP Staff';
    case 'seller':
      return 'Seller';
    default:
      return 'User';
  }
}

function getRoleBadge(role?: UserRole | string | null) {
  switch (role) {
    case 'pap_admin':
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px] font-semibold gap-1">
          <Shield className="h-3 w-3" /> Admin
        </Badge>
      );
    case 'pap_staff':
      return (
        <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[11px] font-semibold gap-1">
          <ShieldCheck className="h-3 w-3" /> PAP Staff
        </Badge>
      );
    case 'seller':
      return (
        <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[11px] font-semibold gap-1">
          <Store className="h-3 w-3" /> Seller
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[11px]">
          Account
        </Badge>
      );
  }
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0];
    const second = parts[1];
    if (first && second && first[0] && second[0]) {
      return (first[0] + second[0]).toUpperCase();
    }
    if (first) {
      return first.slice(0, 2).toUpperCase();
    }
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export function Header() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleLabel = getRoleLabel(profile?.role);
  const initials = getInitials(profile?.owner_name, user?.email);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await updateProfile({
        profile_picture_url: filePath,
      });

      if (updateErr) throw updateErr;

      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile picture');
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
      toast.error(err?.message || 'Failed to remove picture');
    } finally {
      setRemoving(false);
    }
  };

  const handleSignOut = async () => {
    setDialogOpen(false);
    await signOut();
    navigate({ to: '/login' as any });
  };

  const getProfileLink = () => {
    if (profile?.role === 'pap_admin') {
      return { to: '/admin/dashboard', label: 'Go to Staff Management' };
    }
    if (profile?.role === 'pap_staff') {
      return { to: '/pap/profile', label: 'Go to Staff Profile' };
    }
    return { to: '/seller/profile', label: 'Go to Seller Profile' };
  };

  const profileLink = getProfileLink();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-primary">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <Package className="h-7 w-7 text-secondary" />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight text-primary-foreground">
                Pata Parcel
              </span>
              <span className="text-[10px] leading-tight text-secondary font-medium">
                Delivering Trust, Every Time
              </span>
            </div>
          </div>

          {/* User Profile & Account Type */}
          {user && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="group flex flex-col items-center justify-center rounded-lg px-2 py-0.5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-secondary/60 cursor-pointer"
                title="Account & Profile Picture"
                aria-label="Account & Profile Picture"
              >
                <div className="relative">
                  {profile?.profile_picture_url ? (
                    <StorageImage
                      src={profile.profile_picture_url}
                      alt={profile.owner_name || 'Profile'}
                      className="h-8 w-8 rounded-full object-cover border-2 border-secondary shadow-sm"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-secondary text-primary font-bold text-xs flex items-center justify-center border-2 border-secondary shadow-sm">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-secondary text-primary p-0.5 shadow-sm transition-transform group-hover:scale-110">
                    <Camera className="h-2.5 w-2.5" />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-secondary leading-tight mt-0.5 tracking-tight text-center max-w-[80px] truncate">
                  {roleLabel}
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Account & Profile Picture Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Account & Profile Picture
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              View your account details and update your profile picture.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-3">
            {/* Avatar Preview with Camera overlay */}
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-md cursor-pointer group-hover:border-primary transition-all flex items-center justify-center bg-muted"
                title="Click to change profile picture"
              >
                {profile?.profile_picture_url ? (
                  <StorageImage
                    src={profile.profile_picture_url}
                    alt={profile.owner_name || 'Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary text-secondary font-bold text-2xl flex items-center justify-center">
                    {initials}
                  </div>
                )}

                {/* Uploading Spinner Overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                )}

                {/* Hover overlay hint */}
                {!uploading && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <Camera className="h-6 w-6" />
                    <span className="text-[10px] font-medium mt-1">Change</span>
                  </div>
                )}
              </div>

              {/* Camera badge trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 rounded-full bg-primary text-secondary p-2 shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-background"
                title="Upload new photo"
                aria-label="Upload new photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Hidden native file input for native capture / file picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* User Info Details */}
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-foreground">
                {profile?.owner_name || 'Pata Parcel User'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {user?.email || profile?.phone || 'No contact email'}
              </p>
              <div className="pt-1 flex items-center justify-center gap-2">
                {getRoleBadge(profile?.role)}
                {profile?.business_name && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {profile.business_name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-semibold cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    {profile?.profile_picture_url ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
              </Button>

              {profile?.profile_picture_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemovePhoto}
                  disabled={uploading || removing}
                  className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  {removing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Remove Photo
                </Button>
              )}
            </div>
          </div>

          {/* Quick links & Sign Out */}
          <div className="border-t border-border/80 pt-3 flex items-center justify-between gap-2">
            <Link
              to={profileLink.to as any}
              onClick={() => setDialogOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>{profileLink.label}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
