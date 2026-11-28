import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Pencil, Save, Upload, Loader2, Store, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { BUSINESS_TYPES, isValidKenyanPhone } from '@/lib/constants';
import type { SellerProfileItem } from '@/lib/sellerDirectory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StorageImage } from '@/components/shared/StorageImage';

interface Props {
  seller: SellerProfileItem;
  userId: string;
  onSaved: (seller: SellerProfileItem) => void;
}

export function AdminSellerProfileEditor({ seller, userId, onSaved }: Props) {
  const [allowed, setAllowed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(seller);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    supabase.rpc('has_role', { _user_id: userId, _role: 'pap_admin' }).then(({ data, error }) => {
      if (active) setAllowed(!error && data === true);
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const phone = draft.phone.replace(/\s/g, '');
    if (!draft.owner_name.trim()) { setError('Please enter the seller name.'); return; }
    if (!isValidKenyanPhone(phone)) { setError('Please enter a valid Kenyan phone number.'); return; }
    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      let picture = draft.profile_picture_url || null;
      if (photo) {
        const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
        uploadedPath = `avatars/${userId}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(uploadedPath, photo);
        if (uploadError) throw uploadError;
        picture = uploadedPath;
      }
      const updates = {
        owner_name: draft.owner_name.trim(),
        business_name: draft.business_name?.trim() || null,
        phone,
        business_type: draft.business_type || null,
        location: draft.location?.trim() || null,
        profile_picture_url: picture,
      };
      const { error: saveError } = await supabase.rpc('admin_update_seller_profile', {
        _seller_id: seller.id,
        _input: updates,
      });
      if (saveError) throw saveError;
      onSaved({ ...seller, ...updates });
      setEditing(false);
      setPhoto(null);
      toast.success(`Profile updated successfully for ${updates.owner_name}.`);
    } catch (err) {
      if (uploadedPath) await supabase.storage.from('receipts').remove([uploadedPath]);
      setError(err instanceof Error ? err.message : (err as { message?: string })?.message || 'Unable to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) return null;
  if (!editing) return (
    <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => {
      setDraft(seller); setPhoto(null); setError(''); setEditing(true);
    }}>
      <Pencil className="h-4 w-4" /> Edit Seller Profile
    </Button>
  );

  return (
    <form onSubmit={save} className="space-y-4 border-y border-border py-4">
      <h3 className="text-sm font-semibold text-foreground">Edit Seller Profile</h3>
      <div className="flex flex-wrap items-center gap-3">
        {preview ? <img src={preview} alt="New seller picture" className="h-16 w-16 rounded-full object-cover" />
          : draft.profile_picture_url ? <StorageImage src={draft.profile_picture_url} alt="Seller picture" className="h-16 w-16 rounded-full object-cover" />
          : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Store className="h-7 w-7 text-primary" /></div>}
        <Button type="button" variant="outline" className="h-11 gap-2" disabled={saving} onClick={() => fileInput.current?.click()}>
          <Upload className="h-4 w-4" /> Change Picture
        </Button>
        {(photo || draft.profile_picture_url) && <Button type="button" variant="ghost" className="h-11" disabled={saving} onClick={() => {
          setPhoto(null); setDraft({ ...draft, profile_picture_url: null });
        }}>Remove Picture</Button>}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Seller profile picture" className="hidden" disabled={saving} onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPG, PNG or WebP image.'); return; }
          if (file.size > 5 * 1024 * 1024) { setError('Choose a picture smaller than 5 MB.'); return; }
          setError(''); setPhoto(file);
        }} />
      </div>
      <fieldset disabled={saving} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="admin-seller-owner">Seller Name *</Label><Input id="admin-seller-owner" className="h-11" required value={draft.owner_name} onChange={(e) => setDraft({ ...draft, owner_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="admin-seller-business">Business Name</Label><Input id="admin-seller-business" className="h-11" value={draft.business_name || ''} onChange={(e) => setDraft({ ...draft, business_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="admin-seller-phone">Phone Number *</Label><Input id="admin-seller-phone" className="h-11" type="tel" required value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="admin-seller-location">Business Location</Label><Input id="admin-seller-location" className="h-11" value={draft.location || ''} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="admin-seller-type">Business Type</Label><select id="admin-seller-type" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.business_type || ''} onChange={(e) => setDraft({ ...draft, business_type: e.target.value })}>
          <option value="">Select business type</option>
          {draft.business_type && !BUSINESS_TYPES.some((type) => type === draft.business_type) && <option value={draft.business_type}>{draft.business_type}</option>}
          {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select></div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1 gap-2" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'Saving…' : 'Save Profile'}</Button>
        <Button type="button" variant="outline" className="h-11 gap-2" disabled={saving} onClick={() => { setEditing(false); setPhoto(null); }}><X className="h-4 w-4" /> Cancel</Button>
      </div>
    </form>
  );
}