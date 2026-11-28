-- Revert any staff/internal pick-up parcels currently marked as delivered back to sorting
UPDATE public.parcels
SET tracking_status = 'sorting', updated_at = now()
WHERE (order_source IN ('staff', 'pap_staff') OR sending_method = 'pata_parcel')
  AND tracking_status = 'delivered';

-- Insert tracking log for restored parcels
INSERT INTO public.parcel_tracking (parcel_id, status, notes)
SELECT id, 'sorting', 'Pick-up status reversed back to sorting by admin migration'
FROM public.parcels
WHERE (order_source IN ('staff', 'pap_staff') OR sending_method = 'pata_parcel')
  AND tracking_status = 'sorting'
  AND NOT EXISTS (
    SELECT 1 FROM public.parcel_tracking pt
    WHERE pt.parcel_id = parcels.id AND pt.notes LIKE 'Pick-up status reversed back to sorting%'
  );
