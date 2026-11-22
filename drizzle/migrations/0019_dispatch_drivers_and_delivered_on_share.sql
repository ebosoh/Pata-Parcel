-- Migration 0019: Add dispatch_drivers table and update mark_receipt_shared_with_buyer
CREATE TABLE IF NOT EXISTS public.dispatch_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name text NOT NULL,
  driver_phone text NOT NULL,
  vehicle_plate text NOT NULL,
  sacco_name text,
  destination text,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_drivers ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_drivers TO authenticated;
GRANT ALL ON public.dispatch_drivers TO service_role;

DROP POLICY IF EXISTS "Staff and sellers can view drivers" ON public.dispatch_drivers;
CREATE POLICY "Staff and sellers can view drivers"
  ON public.dispatch_drivers FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff and sellers can insert drivers" ON public.dispatch_drivers;
CREATE POLICY "Staff and sellers can insert drivers"
  ON public.dispatch_drivers FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update mark_receipt_shared_with_buyer to automatically mark parcel as delivered
CREATE OR REPLACE FUNCTION public.mark_receipt_shared_with_buyer(p_receipt_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parcel_id uuid;
  v_seller_id uuid;
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT r.parcel_id, p.seller_id
    INTO v_parcel_id, v_seller_id
    FROM public.parcel_receipts r
    JOIN public.parcels p ON p.id = r.parcel_id
   WHERE r.id = p_receipt_id
     AND (p.seller_id = auth.uid() OR public.is_pap_staff(auth.uid()));

  IF v_parcel_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.parcel_receipts
     SET shared_with_buyer_at = now()
   WHERE id = p_receipt_id;

  -- Mark the parcel as delivered once receipt is shared with buyer
  UPDATE public.parcels
     SET tracking_status = 'delivered',
         updated_at = now()
   WHERE id = v_parcel_id;

  -- Record in tracking history
  INSERT INTO public.parcel_tracking (
    parcel_id,
    status,
    updated_by,
    notes
  ) VALUES (
    v_parcel_id,
    'delivered',
    auth.uid(),
    'Receipt shared with buyer on WhatsApp. Marked as delivered.'
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_receipt_shared_with_buyer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_receipt_shared_with_buyer(uuid) TO authenticated;
