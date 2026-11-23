DROP POLICY IF EXISTS "Staff and sellers can view drivers" ON public.dispatch_drivers;
DROP POLICY IF EXISTS "Staff and sellers can insert drivers" ON public.dispatch_drivers;

CREATE POLICY "View own or staff drivers" ON public.dispatch_drivers
FOR SELECT TO authenticated
USING (
  public.is_pap_staff(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = dispatch_drivers.parcel_id AND p.seller_id = auth.uid())
);

CREATE POLICY "Insert own drivers" ON public.dispatch_drivers
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.is_pap_staff(auth.uid())
    OR parcel_id IS NULL
    OR EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = dispatch_drivers.parcel_id AND p.seller_id = auth.uid())
  )
);