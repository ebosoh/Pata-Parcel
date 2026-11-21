CREATE OR REPLACE FUNCTION public.compute_parcel_fees() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Sellers now enter the total sending fee directly. Only fall back to the
  -- old packages x per-package multiplication when no total was supplied
  -- (older app versions) or when an edit changed packages/per-package fee
  -- without touching the total.
  IF TG_OP = 'INSERT' THEN
    IF NEW.total_sending_fee = 0 AND NEW.num_packages * NEW.sending_fee_per_package > 0 THEN
      NEW.total_sending_fee := NEW.num_packages * NEW.sending_fee_per_package;
    END IF;
  ELSIF NEW.total_sending_fee IS NOT DISTINCT FROM OLD.total_sending_fee
    AND (NEW.num_packages IS DISTINCT FROM OLD.num_packages
      OR NEW.sending_fee_per_package IS DISTINCT FROM OLD.sending_fee_per_package) THEN
    NEW.total_sending_fee := NEW.num_packages * NEW.sending_fee_per_package;
  END IF;
  NEW.platform_fee := round(NEW.total_sending_fee * 0.15);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

COMMENT ON COLUMN public.parcels.sending_fee_per_package IS 'DEPRECATED: sellers now enter the total sending fee directly (2026-11-21); column kept for older rows and fallback calculation.';
COMMENT ON COLUMN public.parcels.total_sending_fee IS 'Total sending fee as entered by the seller; platform fee is 15% of this, rounded to whole shillings.';