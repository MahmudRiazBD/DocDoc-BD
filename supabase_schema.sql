-- Supabase Schema for DocDoc BD
-- This script is idempotent and can be run multiple times safely.

-- To run this script:
-- 1. Go to your Supabase project's SQL Editor.
-- 2. Paste the entire content of this file.
-- 3. Click "Run".

-- Enable HTTP extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function to safely drop objects if they exist
CREATE OR REPLACE FUNCTION public.drop_if_exists(object_type TEXT, object_name TEXT, schema_name TEXT DEFAULT 'public')
RETURNS VOID AS $$
DECLARE
  full_object_name TEXT;
BEGIN
  full_object_name := schema_name || '.' || object_name;
  IF object_type = 'table' THEN
    EXECUTE 'DROP TABLE IF EXISTS ' || full_object_name || ' CASCADE';
  ELSIF object_type = 'sequence' THEN
    EXECUTE 'DROP SEQUENCE IF EXISTS ' || full_object_name;
  ELSIF object_type = 'function' THEN
    -- For functions, we need to find the full signature
    DECLARE
      func_signature TEXT;
    BEGIN
      SELECT oid::regprocedure::text INTO func_signature
      FROM pg_proc
      WHERE proname = object_name AND pg_my_temp_schema() <> pg_proc.pronamespace;
      
      IF func_signature IS NOT NULL THEN
        EXECUTE 'DROP FUNCTION ' || func_signature;
      END IF;
    END;
  END IF;
  RAISE NOTICE 'Dropped %: %', object_type, full_object_name;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE '% % does not exist, skipping.', object_type, full_object_name;
END;
$$ LANGUAGE plpgsql;


-- === Drop existing objects in reverse order of dependency ===
SELECT public.drop_if_exists('function', 'increment_serial_no');

-- Drop tables
SELECT public.drop_if_exists('table', 'files');
SELECT public.drop_if_exists('table', 'bill_addresses');
SELECT public.drop_if_exists('table', 'bill_templates');
SELECT public.drop_if_exists('table', 'institutions');
SELECT public.drop_if_exists('table', 'clients');
SELECT public.drop_if_exists('table', 'users');

-- Drop sequences
SELECT public.drop_if_exists('sequence', 'users_serial_no_seq');
SELECT public.drop_if_exists('sequence', 'clients_serial_no_seq');
SELECT public.drop_if_exists('sequence', 'institutions_serial_no_seq');
SELECT public.drop_if_exists('sequence', 'bill_addresses_serial_no_seq');
SELECT public.drop_if_exists('sequence', 'files_serial_no_seq');

-- Drop the helper function itself
DROP FUNCTION IF EXISTS public.drop_if_exists(TEXT, TEXT, TEXT);

-- === Recreate objects ===

-- 1. SEQUENCES for serial numbers
CREATE SEQUENCE public.users_serial_no_seq START 1;
CREATE SEQUENCE public
.clients_serial_no_seq START 1;
CREATE SEQUENCE public.institutions_serial_no_seq START 1;
CREATE SEQUENCE public.bill_addresses_serial_no_seq START 1;
CREATE SEQUENCE public.files_serial_no_seq START 1;

-- 2. TABLES
-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    serial_no INTEGER UNIQUE DEFAULT nextval('public.users_serial_no_seq'),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super-admin', 'admin', 'staff')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients Table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no INTEGER UNIQUE DEFAULT nextval('public.clients_serial_no_seq'),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Institutions Table
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no INTEGER UNIQUE DEFAULT nextval('public.institutions_serial_no_seq'),
    name TEXT NOT NULL,
    eiin TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    signature_url_1 TEXT,
    signature_url_2 TEXT,
    college_code TEXT,
    school_code TEXT,
    certificate_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill Templates Table
CREATE TABLE public.bill_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill Addresses Table
CREATE TABLE public.bill_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no INTEGER UNIQUE DEFAULT nextval('public.bill_addresses_serial_no_seq'),
    template_id TEXT REFERENCES public.bill_templates(id) ON DELETE CASCADE,
    dag_no TEXT,
    area TEXT,
    division TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files Table
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no INTEGER UNIQUE DEFAULT nextval('public.files_serial_no_seq'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Client and Applicant Info
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name TEXT NOT NULL,
    applicant_name_bn TEXT,
    applicant_name_en TEXT,
    dob TEXT NOT NULL,

    -- Control Flags
    has_certificate BOOLEAN DEFAULT FALSE,
    has_electricity_bill BOOLEAN DEFAULT FALSE,

    -- Certificate Fields
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    father_name_bn TEXT,
    mother_name_bn TEXT,
    "class" TEXT,
    roll INTEGER,
    certificate_date DATE,
    session_year TEXT,
    certificate_status TEXT,

    -- Electricity Bill Fields
    bill_template_id TEXT REFERENCES public.bill_templates(id) ON DELETE SET NULL,
    bill_holder_name TEXT,
    father_name_en TEXT,
    bill_customer_no TEXT,
    bill_sanc_load TEXT,
    bill_book_no TEXT,
    bill_type TEXT,
    bill_tariff TEXT,
    bill_account_no TEXT,
    bill_meter_no TEXT,
    bill_s_and_d TEXT,
    bill_address JSONB,
    bill_recharge_history JSONB,
    bill_status TEXT
);


-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Policies for 'users'
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;
CREATE POLICY "Allow authenticated users to read users" ON public.users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow admin/super-admin to manage users" ON public.users;
CREATE POLICY "Allow admin/super-admin to manage users" ON public.users FOR ALL TO authenticated USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'super-admin')
) WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'super-admin')
);

-- Policies for 'clients'
DROP POLICY IF EXISTS "Allow authenticated read access to clients" ON public.clients;
CREATE POLICY "Allow authenticated read access to clients" ON public.clients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all authenticated to manage clients" ON public.clients;
CREATE POLICY "Allow all authenticated to manage clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for 'institutions'
DROP POLICY IF EXISTS "Allow authenticated read access to institutions" ON public.institutions;
CREATE POLICY "Allow authenticated read access to institutions" ON public.institutions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all authenticated to manage institutions" ON public.institutions;
CREATE POLICY "Allow all authenticated to manage institutions" ON public.institutions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for 'bill_templates'
DROP POLICY IF EXISTS "Allow authenticated read access to bill_templates" ON public.bill_templates;
CREATE POLICY "Allow authenticated read access to bill_templates" ON public.bill_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all authenticated to manage bill_templates" ON public.bill_templates;
CREATE POLICY "Allow all authenticated to manage bill_templates" ON public.bill_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for 'bill_addresses'
DROP POLICY IF EXISTS "Allow authenticated read access to bill_addresses" ON public.bill_addresses;
CREATE POLICY "Allow authenticated read access to bill_addresses" ON public.bill_addresses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all authenticated to manage bill_addresses" ON public.bill_addresses;
CREATE POLICY "Allow all authenticated to manage bill_addresses" ON public.bill_addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for 'files'
DROP POLICY IF EXISTS "Allow authenticated read access to files" ON public.files;
CREATE POLICY "Allow authenticated read access to files" ON public.files FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all authenticated to manage files" ON public.files;
CREATE POLICY "Allow all authenticated to manage files" ON public.files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. STORAGE POLICIES
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
DROP POLICY IF EXISTS "Allow authenticated reads on uploads" ON storage.objects;
CREATE POLICY "Allow authenticated reads on uploads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'uploads');

-- 5. SEED DATA
-- Insert default bill templates if they don't exist
INSERT INTO public.bill_templates (id, name, logo_url, is_active, created_at)
VALUES 
    ('desco', 'DESCO', 'https://i.ibb.co/Gf894Tz/desco.png', true, NOW()),
    ('dpdc', 'DPDC', 'https://i.ibb.co/yQd1b25/dpdc.png', true, NOW())
ON CONFLICT (id) DO NOTHING;


-- Finalization message
SELECT 'Supabase schema setup complete.';
