CREATE OR REPLACE FUNCTION public.compute_parcel_fees() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.total_sending_fee := NEW.num_packages * NEW.sending_fee_per_package;
  NEW.platform_fee := NEW.num_packages * 15;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

COMMENT ON COLUMN public.parcels.platform_fee IS 'Platform service fee: 15 KES per package (rate raised from 10 on 2026-11-18).';