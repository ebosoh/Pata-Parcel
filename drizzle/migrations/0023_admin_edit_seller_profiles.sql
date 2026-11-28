CREATE OR REPLACE FUNCTION public.admin_update_seller_profile(_seller_id uuid, _input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing public.profiles%ROWTYPE;
  saved public.profiles%ROWTYPE;
  picture text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'pap_admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO existing FROM public.profiles WHERE id = _seller_id FOR UPDATE;
  IF NOT FOUND OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _seller_id) THEN
    RAISE EXCEPTION 'Seller profile not found';
  END IF;
  IF nullif(btrim(_input->>'owner_name'), '') IS NULL THEN
    RAISE EXCEPTION 'Seller name is required';
  END IF;
  IF public.normalize_phone(_input->>'phone') !~ '^254[17][0-9]{8}$' OR nullif(btrim(_input->>'phone'), '') IS NULL THEN
    RAISE EXCEPTION 'A valid Kenyan phone number is required';
  END IF;
  picture := nullif(btrim(_input->>'profile_picture_url'), '');
  IF picture IS NOT NULL AND picture IS DISTINCT FROM existing.profile_picture_url THEN
    IF NOT starts_with(picture, 'avatars/' || auth.uid()::text || '-') OR NOT EXISTS (
      SELECT 1 FROM storage.objects WHERE bucket_id = 'receipts' AND name = picture AND owner_id = auth.uid()::text
    ) THEN
      RAISE EXCEPTION 'Upload a profile picture before saving' USING ERRCODE = '42501';
    END IF;
  END IF;
  UPDATE public.profiles SET
    owner_name = btrim(_input->>'owner_name'),
    business_name = nullif(btrim(_input->>'business_name'), ''),
    phone = btrim(_input->>'phone'),
    business_type = nullif(btrim(_input->>'business_type'), ''),
    location = nullif(btrim(_input->>'location'), ''),
    profile_picture_url = picture,
    updated_at = now()
  WHERE id = _seller_id RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_seller_profile(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_seller_profile(uuid, jsonb) TO authenticated;

CREATE POLICY "Profile owners and admins read avatars" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (
    public.has_role(auth.uid(), 'pap_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.profile_picture_url = storage.objects.name
    )
  )
);