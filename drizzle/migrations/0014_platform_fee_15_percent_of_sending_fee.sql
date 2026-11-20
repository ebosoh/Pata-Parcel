CREATE OR REPLACE FUNCTION public.compute_parcel_fees() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.total_sending_fee := NEW.num_packages * NEW.sending_fee_per_package;
  NEW.platform_fee := round(NEW.total_sending_fee * 0.15);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

COMMENT ON COLUMN public.parcels.platform_fee IS 'Platform service fee: 15% of the total sending fee, rounded to whole shillings (changed from flat 15 KES per package on 2026-11-19).';