import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BUSINESS_TYPES, isValidKenyanPhone, formatPhoneDisplay } from '@/lib/constants';
import { 
  User, 
  Store, 
  Phone, 
  MapPin, 
  Tag, 
  Save, 
  Loader2, 
  CheckCircle2, 
  LogOut, 
  Upload,
  AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/seller/profile')({
  head: () => ({
    meta: [
      { title: 'Seller Profile — Pata Parcel' },
      { name: 'description', content: 'Manage your online shop details, contact phone and pickup location on Pata Parcel.' },
      { property: 'og:title', content: 'Seller Profile — Pata Parcel' },
      { property: 'og:description', content: 'Manage your online shop details, contact phone and pickup location on Pata Parcel.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://baseline-project.lovable.app/seller/profile' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [{ rel: 'canonical', href: 'https://baseline-project.lovable.app/seller/profile' }],
  }),
  component: SellerProfilePage,
});

function SellerProfilePage() {
  const { user, profile, updateProfile, signOut, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState<string>(BUSINESS_TYPES[0]);
  const [avatarUrl, setAvatarUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync profile data into form state
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || '');
      setOwnerName(profile.owner_name || '');
      setPhone(profile.phone || '');
      setLocation(profile.location || '');
      if (profile.business_type) {
        setBusinessType(profile.business_type);
      }
      setAvatarUrl(profile.profile_picture_url || '');
    }
  }, [profile]);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' as any });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Handle avatar upload to Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setErrorMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
      setSuccessMessage('Photo uploaded! Remember to save profile.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!ownerName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    const cleanPhone = phone.replace(/\s/g, '');
    if (!isValidKenyanPhone(cleanPhone)) {
      setErrorMessage('Please enter a valid Kenyan phone number (e.g. 0712 345 678)');
      return;
    }

    setSaving(true);

    const { error } = await updateProfile({
      business_name: businessName.trim() || null,
      owner_name: ownerName.trim(),
      phone: cleanPhone,
      location: location.trim() || null,
      business_type: businessType || null,
      profile_picture_url: avatarUrl || null,
      role: 'seller',
    });

    setSaving(false);

    if (error) {
      setErrorMessage((error as any).message || 'Failed to save profile');
    } else {
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: '/login' as any });
  };

  return (
    <AppShell role="seller">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Seller Profile</h1>
            <p className="text-xs text-muted-foreground">
              Your business details shown on dispatch receipts and customer SMS
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

        {/* Alerts */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="p-4 space-y-4">
            {/* Avatar / Logo Section */}
            <div className="flex items-center gap-4 pb-3 border-b border-border/60">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Seller Profile"
                    className="h-16 w-16 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-secondary/40 border-2 border-border flex items-center justify-center text-primary">
                    <Store className="h-8 w-8" />
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <Label htmlFor="avatar-file" className="text-xs font-semibold block cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent text-xs font-medium">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    {avatarUrl ? 'Change Profile Picture' : 'Upload Business Logo / Picture'}
                  </span>
                </Label>
                <input
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
                <p className="text-[11px] text-muted-foreground">
                  Optional. Recommended size: 400x400 JPG or PNG.
                </p>
              </div>
            </div>

            {/* 1. Business Name */}
            <div className="space-y-1.5">
              <Label htmlFor="biz_name" className="text-xs font-medium flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-primary" />
                Business Name (as used on TikTok / IG / FB) *
              </Label>
              <Input
                id="biz_name"
                placeholder="e.g. Trendy Closets Kenya"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* 2. Owner Name */}
            <div className="space-y-1.5">
              <Label htmlFor="owner_name" className="text-xs font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Name of Seller / Business Owner *
              </Label>
              <Input
                id="owner_name"
                placeholder="e.g. Grace Njeri"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* 3. Phone Number */}
            <div className="space-y-1.5">
              <Label htmlFor="seller_phone" className="text-xs font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                Phone Number (WhatsApp contact for buyers) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  +254
                </span>
                <Input
                  id="seller_phone"
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 pl-14 text-sm"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Buyers will receive automated SMS containing this number for dispatch inquiries.
              </p>
            </div>

            {/* 4. Location */}
            <div className="space-y-1.5">
              <Label htmlFor="seller_loc" className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Business Location *
              </Label>
              <Input
                id="seller_loc"
                placeholder="e.g. Nairobi CBD, Imenti House"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* 5. Business Type */}
            <div className="space-y-1.5">
              <Label htmlFor="biz_type" className="text-xs font-medium flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Type of Business *
              </Label>
              <select
                id="biz_type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 text-sm font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile Details
              </>
            )}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
