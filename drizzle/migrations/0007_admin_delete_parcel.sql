CREATE OR REPLACE FUNCTION public.admin_delete_parcel(_parcel_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'pap_admin') THEN
    RAISE EXCEPTION 'Only admins can delete parcels';
  END IF;
  DELETE FROM public.parcel_tracking WHERE parcel_id = _parcel_id;
  DELETE FROM public.parcel_receipts WHERE parcel_id = _parcel_id;
  UPDATE public.complaints SET parcel_id = NULL WHERE parcel_id = _parcel_id;
  DELETE FROM public.parcels WHERE id = _parcel_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_delete_parcel(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_parcel(uuid) TO authenticated;