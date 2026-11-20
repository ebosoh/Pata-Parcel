ALTER TABLE public.parcel_receipts
  ADD COLUMN IF NOT EXISTS shared_with_buyer_at timestamptz;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcel_receipts TO authenticated;
GRANT ALL ON public.parcel_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.mark_receipt_shared_with_buyer(p_receipt_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.parcel_receipts r
    JOIN public.parcels p ON p.id = r.parcel_id
    WHERE r.id = p_receipt_id
      AND (p.seller_id = auth.uid() OR public.is_pap_staff(auth.uid()))
  )
  INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN FALSE;
  END IF;

  UPDATE public.parcel_receipts
     SET shared_with_buyer_at = now()
   WHERE id = p_receipt_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_receipt_shared_with_buyer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_receipt_shared_with_buyer(uuid) TO authenticated;