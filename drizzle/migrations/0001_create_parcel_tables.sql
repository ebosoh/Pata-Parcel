CREATE TYPE public.app_role AS ENUM ('pap_admin','pap_staff');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_pap_staff(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
$$;

-- Prevent users from changing their own profile role
CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND current_user = 'authenticated' THEN NEW.role := OLD.role; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_profile_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_pap_staff(auth.uid()));

CREATE TABLE public.destinations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, region text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.saccos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, route text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true);
GRANT SELECT ON public.destinations, public.saccos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destinations, public.saccos TO authenticated;
GRANT ALL ON public.destinations, public.saccos TO service_role;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saccos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads destinations" ON public.destinations FOR SELECT USING (true);
CREATE POLICY "Staff manage destinations" ON public.destinations FOR ALL TO authenticated USING (public.is_pap_staff(auth.uid())) WITH CHECK (public.is_pap_staff(auth.uid()));
CREATE POLICY "Anyone reads saccos" ON public.saccos FOR SELECT USING (true);
CREATE POLICY "Staff manage saccos" ON public.saccos FOR ALL TO authenticated USING (public.is_pap_staff(auth.uid())) WITH CHECK (public.is_pap_staff(auth.uid()));

CREATE SEQUENCE public.parcel_ref_seq;
CREATE TABLE public.parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE DEFAULT ('PAP-' || lpad(nextval('public.parcel_ref_seq')::text, 6, '0')),
  seller_id uuid NOT NULL,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  destination text NOT NULL,
  sending_method text NOT NULL CHECK (sending_method IN ('pickup_mtaani','pata_parcel','door_to_door','psv')),
  psv_sacco text,
  package_type text NOT NULL,
  num_packages integer NOT NULL DEFAULT 1 CHECK (num_packages > 0),
  sending_fee_per_package numeric NOT NULL DEFAULT 0,
  total_sending_fee numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid','unpaid','pay_on_delivery')),
  tracking_status text NOT NULL DEFAULT 'dispatched_to_pap' CHECK (tracking_status IN ('dispatched_to_pap','sorting','on_transit','delivered')),
  platform_fee numeric NOT NULL DEFAULT 0,
  platform_fee_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcels TO authenticated;
GRANT ALL ON public.parcels TO service_role;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers view own parcels" ON public.parcels FOR SELECT TO authenticated USING (auth.uid() = seller_id OR public.is_pap_staff(auth.uid()));
CREATE POLICY "Sellers create own parcels" ON public.parcels FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Staff update parcels" ON public.parcels FOR UPDATE TO authenticated USING (public.is_pap_staff(auth.uid())) WITH CHECK (public.is_pap_staff(auth.uid()));
CREATE POLICY "Staff delete parcels" ON public.parcels FOR DELETE TO authenticated USING (public.is_pap_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.compute_parcel_fees() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.total_sending_fee := NEW.num_packages * NEW.sending_fee_per_package;
  NEW.platform_fee := NEW.num_packages * 10;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER compute_parcel_fees BEFORE INSERT OR UPDATE ON public.parcels FOR EACH ROW EXECUTE FUNCTION public.compute_parcel_fees();

CREATE TABLE public.parcel_tracking (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE, status text NOT NULL, updated_by uuid NOT NULL, notes text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.parcel_tracking TO authenticated;
GRANT ALL ON public.parcel_tracking TO service_role;
ALTER TABLE public.parcel_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View tracking of visible parcels" ON public.parcel_tracking FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = parcel_id AND (p.seller_id = auth.uid() OR public.is_pap_staff(auth.uid()))));
CREATE POLICY "Add tracking" ON public.parcel_tracking FOR INSERT TO authenticated WITH CHECK (updated_by = auth.uid() AND (public.is_pap_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = parcel_id AND p.seller_id = auth.uid())));

CREATE TABLE public.parcel_receipts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE, uploaded_by uuid NOT NULL, receipt_image_url text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.parcel_receipts TO authenticated;
GRANT ALL ON public.parcel_receipts TO service_role;
ALTER TABLE public.parcel_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View receipts of visible parcels" ON public.parcel_receipts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = parcel_id AND (p.seller_id = auth.uid() OR public.is_pap_staff(auth.uid()))));
CREATE POLICY "Staff add receipts" ON public.parcel_receipts FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND public.is_pap_staff(auth.uid()));
CREATE POLICY "Staff delete receipts" ON public.parcel_receipts FOR DELETE TO authenticated USING (public.is_pap_staff(auth.uid()));

CREATE TABLE public.complaints (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL, seller_id uuid NOT NULL, buyer_name text NOT NULL, buyer_phone text NOT NULL, destination text NOT NULL, package_type text NOT NULL, issue_description text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved')), created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz);
GRANT SELECT, INSERT, UPDATE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own complaints" ON public.complaints FOR SELECT TO authenticated USING (auth.uid() = seller_id OR public.is_pap_staff(auth.uid()));
CREATE POLICY "Create own complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Staff update complaints" ON public.complaints FOR UPDATE TO authenticated USING (public.is_pap_staff(auth.uid())) WITH CHECK (public.is_pap_staff(auth.uid()));

-- Storage policies for receipts bucket
CREATE POLICY "Public read receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Signed-in upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Signed-in update receipts" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'receipts' AND owner = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.parcels;