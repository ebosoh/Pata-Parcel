-- Allow 'pap_staff' as a valid order_source so staff-created dispatches
-- can be distinguished from seller-created ones in the queue page.

ALTER TABLE public.parcels DROP CONSTRAINT IF EXISTS parcels_order_source_check;

ALTER TABLE public.parcels
  ADD CONSTRAINT parcels_order_source_check
  CHECK (order_source IN ('seller', 'buyer_link', 'pap_staff'));
