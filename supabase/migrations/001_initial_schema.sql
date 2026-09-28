-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up if re-running (safe on fresh databases)
DROP TABLE IF EXISTS parcel_tracking CASCADE;
DROP TABLE IF EXISTS parcel_receipts CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS saccos CASCADE;
DROP TABLE IF EXISTS destinations CASCADE;
DROP SEQUENCE IF EXISTS parcel_ref_seq;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_reference_number() CASCADE;
DROP FUNCTION IF EXISTS calculate_fees() CASCADE;
DROP FUNCTION IF EXISTS is_staff_or_admin(UUID) CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS sending_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS tracking_status CASCADE;
DROP TYPE IF EXISTS complaint_status CASCADE;

-- Define Enums
CREATE TYPE user_role AS ENUM ('seller', 'pap_admin', 'pap_staff');
CREATE TYPE sending_method AS ENUM ('pickup_mtaani', 'pata_parcel', 'door_to_door', 'psv');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid', 'pay_on_delivery');
CREATE TYPE tracking_status AS ENUM ('dispatched_to_pap', 'sorting', 'on_transit', 'delivered');
CREATE TYPE complaint_status AS ENUM ('open', 'investigating', 'resolved');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'seller',
  business_name TEXT,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT,
  profile_picture_url TEXT,
  business_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saccos
CREATE TABLE saccos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  route TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Destinations
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Parcels
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT UNIQUE,
  seller_id UUID NOT NULL REFERENCES profiles(id),
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  destination TEXT NOT NULL,
  sending_method sending_method NOT NULL,
  psv_sacco TEXT,
  package_type TEXT NOT NULL,
  num_packages INTEGER NOT NULL DEFAULT 1,
  sending_fee_per_package NUMERIC NOT NULL,
  total_sending_fee NUMERIC NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  tracking_status tracking_status NOT NULL DEFAULT 'dispatched_to_pap',
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  platform_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parcel Tracking
CREATE TABLE parcel_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  status tracking_status NOT NULL,
  updated_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parcel Receipts
CREATE TABLE parcel_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  receipt_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Complaints
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES profiles(id),
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  destination TEXT NOT NULL,
  package_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  status complaint_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_parcels_updated_at BEFORE UPDATE ON parcels FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Reference number generation
CREATE SEQUENCE IF NOT EXISTS parcel_ref_seq START 1;

CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TRIGGER AS $$
DECLARE
  year_text TEXT;
  seq_val BIGINT;
BEGIN
  year_text := to_char(NOW(), 'YYYY');
  seq_val := nextval('parcel_ref_seq');
  NEW.reference_number := 'PAP-' || year_text || '-' || lpad(seq_val::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reference_number BEFORE INSERT ON parcels FOR EACH ROW
WHEN (NEW.reference_number IS NULL)
EXECUTE FUNCTION generate_reference_number();

-- Computed fees trigger
CREATE OR REPLACE FUNCTION calculate_fees()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_sending_fee := NEW.num_packages * NEW.sending_fee_per_package;
  NEW.platform_fee := NEW.num_packages * 10;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_computed_fees BEFORE INSERT OR UPDATE OF num_packages, sending_fee_per_package ON parcels
FOR EACH ROW EXECUTE FUNCTION calculate_fees();


-- RLS Configuration
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE saccos ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin/staff
CREATE OR REPLACE FUNCTION is_staff_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role IN ('pap_admin', 'pap_staff'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Parcels Policies
CREATE POLICY "Sellers can read own parcels" ON parcels FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert own parcels" ON parcels FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Staff can read all parcels" ON parcels FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update all parcels" ON parcels FOR UPDATE USING (is_staff_or_admin(auth.uid()));

-- Parcel Tracking Policies
CREATE POLICY "Sellers can read tracking for own parcels" ON parcel_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM parcels WHERE id = parcel_tracking.parcel_id AND seller_id = auth.uid())
);
CREATE POLICY "Staff can read all tracking" ON parcel_tracking FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert tracking" ON parcel_tracking FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));

-- Parcel Receipts Policies
CREATE POLICY "Sellers can read receipts for own parcels" ON parcel_receipts FOR SELECT USING (
  EXISTS (SELECT 1 FROM parcels WHERE id = parcel_receipts.parcel_id AND seller_id = auth.uid())
);
CREATE POLICY "Staff can read all receipts" ON parcel_receipts FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can insert receipts" ON parcel_receipts FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));

-- Complaints Policies
CREATE POLICY "Sellers can CRUD own complaints" ON complaints FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Staff can read all complaints" ON complaints FOR SELECT USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update all complaints" ON complaints FOR UPDATE USING (is_staff_or_admin(auth.uid()));

-- Saccos Policies
CREATE POLICY "All authenticated users can read saccos" ON saccos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert saccos" ON saccos FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update saccos" ON saccos FOR UPDATE USING (is_staff_or_admin(auth.uid()));

-- Destinations Policies
CREATE POLICY "All authenticated users can read destinations" ON destinations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert destinations" ON destinations FOR INSERT WITH CHECK (is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can update destinations" ON destinations FOR UPDATE USING (is_staff_or_admin(auth.uid()));


-- Seed Data for Destinations
INSERT INTO destinations (name, region, is_active) VALUES
('Nairobi', 'Nairobi', true),
('Mombasa', 'Coast', true),
('Kisumu', 'Nyanza', true),
('Eldoret', 'Rift Valley', true),
('Nakuru', 'Rift Valley', true),
('Thika', 'Central', true),
('Nyeri', 'Central', true),
('Machakos', 'Eastern', true),
('Kiambu', 'Central', true),
('Nanyuki', 'Rift Valley', true),
('Meru', 'Eastern', true),
('Embu', 'Eastern', true),
('Kitale', 'Rift Valley', true),
('Kakamega', 'Western', true),
('Bungoma', 'Western', true),
('Naivasha', 'Rift Valley', true),
('Malindi', 'Coast', true),
('Kilifi', 'Coast', true),
('Garissa', 'North Eastern', true),
('Isiolo', 'Eastern', true);

-- Seed Data for Saccos
INSERT INTO saccos (name, route, is_active) VALUES
('2NK Sacco', 'Nairobi - Nyeri - Karatina', true),
('Guardian Angel', 'Nairobi - Western - Nyanza', true),
('Super Metro', 'Nairobi - Thika - Kikuyu', true),
('North Rift Shuttle', 'Nairobi - Eldoret - Kitale', true),
('Modern Coast', 'Nairobi - Mombasa - Kampala', true),
('Easy Coach', 'Nairobi - Western - Nyanza', true),
('Mololine', 'Nairobi - Nakuru', true),
('Climax Coaches', 'Nairobi - Rift Valley', true);

-- Storage bucket and policies
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT DO NOTHING;
DROP POLICY IF EXISTS "Receipts are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Receipts are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Users can upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
