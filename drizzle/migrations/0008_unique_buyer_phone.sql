-- Normalize phone numbers to their last 9 digits so 0712345678, +254712345678
-- and 254 712 345 678 all compare equal.
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT right(regexp_replace(coalesce(_phone, ''), '\D', '', 'g'), 9)
$$;

-- A buyer phone number can never match any other buyer in the system.
CREATE UNIQUE INDEX parcels_buyer_phone_unique
  ON public.parcels (public.normalize_phone(buyer_phone));